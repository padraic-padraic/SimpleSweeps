"use strict"
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var MONGODB_URI = 'mongodb://'+process.env.USER+':'+process.env.PASS+'@'+process.env.HOST+':'+process.env.DB_PORT+'/'+process.env.DB;

var db_client;

var predictionSchema = mongoose.Schema(
  {
    matchId: {type: Number, required: true},
    homeGoals: {type: Number, required: true},
    awayGoals: {type: Number, required: true},
    result: {type: String, required: true},
    points: {type: Number}
  }, 
  {_id: false}
  );

var octopiSchema = mongoose.Schema(
  {
    name: {type: String},
    username: {type: String, unique: true, lowercase: true, required: true},
    password: {type: String, required: true},
    predictions: [predictionSchema],
    score: {type: Number, default: 0}
  },
    {collection:'Octopi'});

octopiSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(10, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

octopiSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

octopiSchema.methods.computeScore = function(finishedMatches) {
  console.log("Inside the instance method");
  let theUser = this;
  return new Promise(function(resolve, reject) {
    console.log("constructing the promise");
    var score = 0;
    var group_stages_end = new Date('2018-06-29');
    if (theUser.predictions.length == 0){
      console.log("No predictions found");
      resolve(true);
    } else {
      console.log("Going over predictions");
      for (var m in finishedMatches)
      {
        let match_date = new Date(finishedMatches[m]['datetime']);
        let group_stage = (match_date < group_stages_end);
        let home_score = finishedMatches[m]['home_team']['goals'] > 4 ? 4 : finishedMatches[m]['home_team']['goals'];
        let away_score = finishedMatches[m]['away_team']['goals'] > 4 ? 4 : finishedMatches[m]['away_team']['goals'];
        var gap = home_score - away_score;
        var result;
        if(finishedMatches[m]['winner_code']=='Draw'){
          result = 'D';
        } else if (finishedMatches[m]['winner_code']==finishedMatches[m]['home_team']['code']) {
          result = 'H';
        } else {
          result = 'A';
        }
        console.log(result);
        let prediction = theUser.predictions.find(predicted => predicted.matchId == finishedMatches[m]['fifa_id']);
        if (prediction)
        {
          console.log("Found prediction, doing update");
          if (prediction.result != result)
          {
            prediction.points = 0;
          } else {
            if (prediction.result == 'D') {
               prediction.points = 5;
            } else {
              if (prediction.homeGoals == home_score && prediction.awayGoals == away_score) {
                prediction.points = 8;
              } else if (prediction.homeGoals - prediction.awayGoals == gap) {
                prediction.points = 5;
              } else if (prediction.homeGoals == home_score || prediction.awayGoals == away_score) {
                prediction.points = 4;
              } else {
                prediction.points = 3;
              }
            }
          }
          score += prediction.points;
          console.log(prediction.points);
        }
      }
      theUser.score = score;
      theUser.save(function(err) {
        if (err) {
          console.log("Error on save");
          reject(err);
        } else {
          console.log("We did it");
          resolve(true);
        }
      });
    }
  });
}

var users = mongoose.model('User', octopiSchema);

function connect() {
  try {
     console.log("Connecting");
     mongoose.connect(MONGODB_URI);
     db_client = mongoose.connection;
     console.log(db_client.readyState);
   } catch (exp) {
      console.log(exp);
      db_client = null;
   }
  return db_client;
}

function disconnect()
{
  return new Promise(function(resolve, reject) {
    try {
      db_client.close(function () {
        resolve ();
      });
    } catch (exp) {
      reject(exp)
    }
  });
}

function getAllPredictions(matchId) {
  return new Promise(function(resolve) {
    var octopi = users.find({}, 'username name predictions', function (err, data) {
      if(err) {
        resolve(undefined);
      } else {
        var predictions = [];
        data.forEach(function (d) {
          let predObj = {uname: d.username,
                         name: d.name
                        };
          if (d.predictions.length >0){
            predObj.prediction= d.predictions.find(pred => pred.matchId == matchId)
          }
          predictions.push(predObj);
        });
        resolve(predictions);
      }
    });
  });
}

module.exports = {
  connect: connect,
  disconnect: disconnect,
  users: users,
  predictions: predictionSchema,
  getAllPredictions: getAllPredictions
}