// server.js
const express = require('express')
const app = express()
const sfgApi = require('./sfg-api.js')
// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'))
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//Setup database
var datastore=require('./datastore.js');
var dbError = false;
var client = datastore.connect();
if (client == null) {dbError = true;}
var connected = false;
client.once("connected",function() {
  console.log("DB Connected");
  connected = true;
});

//Sessions
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  name: 'ss.sid',
  saveUninitialized: false,
  cookie: {secure:true, httpOnly: false, sameSite: true},
  store: new MongoStore({mongooseConnection: client,
                         autoRemove: 'disabled',
                         collection: 'Session',
                         autoRemove: 'disabled'})
}));
app.set('trust proxy', 1);

//Templating
var nunjucks = require('nunjucks');
nunjucks.configure('views', { autoescape: true, express: app });

// Little methods used for templates

function teamToEmoji(teamObj) {
  return sfgApi.emojiMapping[teamObj["code"]];
}

function isGroupStages(match) {
  let group_stages_end = new Date('2018-06-29');
  let date = new Date(match['datetime']);
  return date < group_stages_end;
}

function matchesByDay(matchData) {
  let sorted = {};
  for (var i in matchData) {
    let date = new Date(matchData[i]["datetime"]);
    if (sorted[date.toDateString()]) {
      sorted[date.toDateString()].push(matchData[i]);
    } else {
      sorted[date.toDateString()] = [matchData[i]];
    }
  }
  return sorted;
}

function upcomingMatchDate(matchesByDay)
{
  var today = new Date();
  today = new Date(today.toDateString());
  var dates = Object.keys(matchesByDay);
  for (var i=0; i<dates.length; i++){
    var gameDate = new Date(dates[i]);
    if (today<gameDate) {
      return (i);
    }
  }
  return 1;//No future days, so we'll just go to the top.
}

function resultToTeam(result, match){
  if (result == 'H'){
    return match['home_team']['country'];
  } else if (result =='A') {
    return match['away_team']['country'];
  } else {
    return 'Draw';
  }
}

//Trigger score updates

//Load "status info" on start.
var jsonfile = require('jsonfile')
var file = 'updateStatus.json';
var updateStatus = jsonfile.readFileSync(file, {throws:false});
if (!updateStatus){
  updateStatus = {
    isGameOn: 0,
    needToUpdate:1,
    updatingScores: 0
  }
}

function doScoreUpdates() {
  console.log(updateStatus);
  if(!connected){
    client.once("connected", function() {
      doScoreUpdates();
    });
    return;
  }
  if (updateStatus.isGameOn == 1) {//Shouldn't happen, but just in case
    return;
  }
  if (updateStatus.needToUpdate == 0) {
    return;
  }
  if (updateStatus.updatingScores == 1) { //Only want this to fire once per current game
    return;
  }
  console.log(updateStatus);
  updateStatus.updatingScores = 1;
  saveUpdate();
  var matchesPromise = sfgApi.getAllMatches();
  datastore.users.find({},function(err, allUsers) {
    console.log(allUsers);
    if (err) {
      updateStatus.updatingScores = 0; //We want to let the worker trigger again if an error occured.
      updateStatus.needToUpdate = 1;
      saveUpdate();
      return;
    } else {
      matchesPromise.then(matches => {
        let finishedMatches = matches.filter(match => match.status == "completed");
        var updatePromises = []
        allUsers.forEach(function(d) {
          updatePromises.push(d.computeScore(finishedMatches));
        });
        Promise.all(updatePromises).then(res => {       
          updateStatus.needToUpdate = 0;
          updateStatus.updatingScores = 0;
          return;
        }).catch(err => {
          console.log(err);
          updateStatus.updatingScores = 0;
          updateStatus.needToUpdate = 1;
          saveUpdate();
        });
      }, oldMatches => { //We need the latest data.
        updateStatus.updatingScores = 0;
        updateStatus.needToUpdate = 1;
        saveUpdate();
        return;
      }).catch(exp => {
        updateStatus.updatingScores = 0;
        updateStatus.needToUpdate = 1;
        saveUpdate();
        return;
      });
    }
  });
}

app.use(function(request, response, next) {
  console.log("Middleware, checking for updates");
  if (updateStatus.needToUpdate== 1) {
   doScoreUpdates();
  }
  next();
});

function saveUpdate() {
    jsonfile.writeFile("updateStatus.json", updateStatus);
}

//Routes
app.get("/", (request, response, next) => {
  console.log(updateStatus);
  var currentPromise = sfgApi.getCurrentMatch();
  var matchesPromise = sfgApi.getAllMatches();
  request.data = {
    todayDate: new Date(),
    path: request.path,
    teamToEmoji: teamToEmoji
  };
  datastore.users.find({},'name username score',function(err, allUsers){
    if (err) {
      request.data.allUsers = undefined;
    } else {
      request.data.allUsers = allUsers;
    }
    if (request.session.UID)
    {
      request.data.uname = request.session.UID;
    }
    currentPromise.then(current => {
      if (Object.keys(current).length == 0) {
        console.log("No game on.");
        if (updateStatus.isGameOn == 1) {
          updateStatus.isGameOn = 0;
          updateStatus.needToUpdate = 1;
          doScoreUpdates();
        }
      } else {
        updateStatus.isGameOn = 1;
        request.data.current = current[0];
      }
      matchesPromise.then(matches => {
        let unfinished = matches.filter(match => match.status =="future");
        if (unfinished.length == 0){
          request.data.next = 'None';
        }
        request.data.next = unfinished[0];
        next();
      }, oldMatches => {
        console.log("error on match promise, fall back");
        request.data.alert = "API Error, couldn't get latest upcoming match request.data.";
        if (oldMatches){
          let unfinished = oldMatches.filter(match => match.status =="future");
          if (unfinished.length == 0)
          {
            request.data.next = 'None';
          } else {
              request.data.next = unfinished[0]
            }
        }
        next();
      }).catch(exp => {
        console.log("Error on /matches/API request");
        next();
      });
    }, error=> {
      request.data.alert = "Error fetching current match request.data. Some data isn't available.";
      matchesPromise.then(matches => {
        let unfinished = matches.filter(match => match.status != "completed");
        if (unfinished.length == 0)
        {
          request.data.next = 'None';
        } else {
           if (unfinished[0]['status']=="in progress"){
            request.data.current = unfinished[0];
            try {
              request.data.next = unfinished[1]
            } catch(err) {
              request.data.next = 'None';
            }
          } else {
            request.data.next = unfinished[0]
          }
        }
        next();
      }, error => {
        request.data.alert = "Problems with the API. Couldn't get current request.data.";
        next();
      }).catch(exp => {
        request.data.alert = "Problems with the API. Couldn't get current data.";
        next();
      });
    });
  });
}, (request, response, ne) => {
  console.log("I happen after!");
  saveUpdate();
  response.render("index.html",request.data);
});

//List of matches
app.get("/matches", (request,response) => {
  var matchPromise = sfgApi.getAllMatches();
  var data = {
    path: request.path,
    teamToEmoji: teamToEmoji
  };
  if (request.session.UID) {
    data.uname = request.session.UID;
  }
  matchPromise.then(matches => {
    data.matches = matchesByDay(matches);
    data.upcoming = upcomingMatchDate(data.matches); 
    response.render("matches.html",data);
  }, oldMatches => { 
    data.alert("Couldn't update match data.");
    data.matches = matchesByDay(oldMatches);
    data.upcoming = upcomingMatchDate(data.matches); 
    response.render("matches.html",data);
  }).catch(exp => {
    data.alert = "Error fetching match data";
    response.render("matches.html",data);
  });
});

app.get("/matches/:fifa_id", (request, response, next) => {
  var fifa_id = request.params["fifa_id"];
  var matchPromise = sfgApi.getMatch(fifa_id);
  request.data = {path: "/matches",
             teamToEmoji: teamToEmoji,
             resultToTeam: resultToTeam};
  if (request.session.UID) {
    request.data.uname = request.session.UID;
    var predictionsPromise = datastore.getAllPredictions(fifa_id);
    var user = datastore.users.findOne({username: request.data.uname}, 'predictions', function(err, u) {
      if (u.predictions.length != 0){
        request.data.prediction = u.predictions.find(pred => pred.matchId == fifa_id);
      }
      predictionsPromise.then(result => {
        request.data.predictions = result;
        matchPromise.then(match => {
          request.data.match = match[0];
          if (match['status']=="in progress"){
            updateStatus.isGameOn=1;
          }
          request.data.groupStage = isGroupStages(request.data.match);
          next();
        }, error => {
          request.data.alert = "Couldn't refresh match data.";
          next
        }).catch(err => {
          request.data.alert = "Couldn't refresh match data.";
          next();
        });
      }).catch(exp => {
        matchPromise.then(match => {
          request.data.match = match[0];
          request.data.groupStage = isGroupStages(request.data.match);
          next();
        }, error => {
          request.data.alert = "Couldn't refresh match data.";
          next()
        }).catch(err => {
          request.data.alert = "Couldn't refresh match data.";
          next();
        })
      });
    });
  } else {
  matchPromise.then(match => {
    request.data.match = match[0];
    request.data.groupStage = isGroupStages(request.data.match);
    next();
  }, error => {
    request.data.alert = "Couldn't refresh match data.";
    next();
  }).catch(err => {
    request.data.alert = "Couldn't refresh match data.";
    next();
  });
  }
}, (request, response) => {
  saveUpdate();//Is this blocking?
  response.render("match.html", request.data);
});

app.get("/predictions", (request, response) => {
  if (!request.session.UID) {
    response.redirect("/login");
  } else {
    var predictions;
    var matchesPromise = sfgApi.getAllMatches();
    var data = {path: request.path,teamToEmoji: teamToEmoji,
               uname: request.session.UID,
               resultToTeam: resultToTeam,
               isGroupStages: isGroupStages,
               predictions: {}} ;
    var user = datastore.users.findOne({username: data.uname},'predictions', function (err, u) {
      if (err) {
        response.redirect("/");
      }
      if (u.predictions.length != 0) {
        var predictions = u.predictions;
        for (var i =0; i<predictions.length; i++){
          data.predictions[predictions[i].matchId] = predictions[i];
        }
      }
      matchesPromise.then( matches => {
        data.finishedMatches = matches.filter(match => match.status=="completed");
        data.unfinishedMatches = matchesByDay(matches.filter(match => match.status=="future"));
        response.render("predictions.html",data);
      }, oldMatches => { //We redirect on error because someone could potentially update their predictions *during a match*
        response.redirect("/predictions");
      }).catch(err => {
        response.redirect("/predictions");
      });
    });
    
  }
});

app.post("/predictions", (request,response) => {
  var redir = "/";
  if (request.body.matchId) {
    var redir = "/matches/"+request.body.matchId;
  }
  var isXML = false;
  if (request.xhr || request.headers.accept.indexOf('json') > -1) {
    console.log("is an xml request");
    var isXML = true;
  }
  console.log('XML?: ' + isXML);
  console.log('Session is: '+ request.session.UID);
  if (!request.session.UID){
    if (isXML) {
      response.status = 401;
      response.send();
    } else {
      response.redirect(redir);
    }
  }
  console.log('requestId:')
  console.log(request.body.matchId);
  var user = datastore.users.findOne({username: request.session.UID}, function (err, u) {
    if(err) {
      if (isXML) {
      response.status = 401;
      response.send();
      } else {
        response.redirect(redir);
      }
    }
    var prediction = undefined;
    var isNew = false;
    console.log(u.predictions.length);
    if (u.predictions.length > 0) {
      prediction = u.predictions.find(pred => pred.matchId == request.body.matchId);
    }
    if (!prediction) {
      isNew = true;
      prediction = {matchId: request.body.matchId,
                    points: 0}
    }
    prediction['homeGoals'] = request.body.homeGoals;
    prediction['awayGoals'] = request.body.awayGoals;
    if (request.body.penaltyWinner){
      prediction['result'] = request.body.penaltyWinner;
    } else {
      let gap = request.body.homeGoals - request.body.awayGoals;
      if (gap > 0){
        prediction['result'] = 'H';
      } else if (gap < 0) {
        prediction['result'] = 'A';
      } else {
        prediction['result'] = 'D';
      }
    }
    if (isNew){
      u.predictions.push(prediction);
    }
    if(isXML){
      console.log("Got XML request");
      console.log("Is new?" + isNew);
      console.log(u.predictions.length);
    }
    u.save(function(err) {
      if (err){
        if (isXML) {
        response.status = 500;
        response.send();
        } else {
          response.redirect(redir);
        }
      } else {
        if (isXML) {
        response.status = 200;
        response.send("");
        } else {
          response.redirect(redir);
        }
      }
    });
  });
});

// Login and Registry
app.get("/login", (request, response) => {
  var data = {path:request.path};
  if(request.session.UID)
  {
    response.redirect("/");
  } else {
    response.render('login.html', data);
  }
});

app.post("/login", (request, response) => {
  var user = datastore.users.findOne({username: request.body.uname}, function(err, result){
    if (result == null){
      response.redirect("/login");
    } else {
      result.comparePassword(request.body.password, function (err, isMatch) {
        if (isMatch) {
          request.session.UID = request.body.uname;
          response.redirect("/");
        } else {
          response.redirect("/login");
        }
      });
    }
  });
});

app.get("/logout", (request, response) => {
  if (request.session.UID)
  {
    request.session.destroy();
  }
  response.redirect("/login");
});

app.post("/register", (request,response) => {
  var user = new datastore.users({name:request.body.name,username:request.body.uname,password:request.body.password});
  user.save(function(err, user) {
    if (err) {
      console.log(err);
      response.redirect("/login");
    } else {
    request.session.UID = request.body.uname;
    response.redirect("/");
    }
  });
});
        
// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`)
})

function onExit() {
  jsonfile.writeFileSync("updateStatus.json", updateStatus);
  console.log('Shutting down');
}

// onExit(); Running onExit manually works just fine
process.on('exit', onExit.bind(null));