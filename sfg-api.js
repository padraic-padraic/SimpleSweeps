const request = require('request');

const baseUrl = 'http://world-cup-json.herokuapp.com';

var exports = module.exports = {};

const matches = [];

exports.getCurrentMatch = function()
{
  return new Promise(function(resolve, reject) {
    request(baseUrl+'/matches/current', function (error, response, body) {
      if (!error && response.statusCode==200) {
        resolve(JSON.parse(body));
      }
      else {
        console.log(error);
        reject(error);
      }
    });
  });
}

exports.getAllMatches = function()
{
  return new Promise(function(resolve, reject) { 
    request(baseUrl+'/matches/?by_date=asc',function (error, response, body) {
      if(!error && response.statusCode == 200) {
        let data = JSON.parse(body);
        for (var i=0; i<data.length; i++) {
          matches[i] = data[i];
        }
        resolve(matches)
      } else {
        reject(matches)
      }
    });
  });
}

exports.getMatchesToday = function()
{
  return new Promise(function(resolve, reject) {   
    request(baseUrl+'/matches/today',function (error, response, body) {
      if(!error && response.statusCode == 200) {
        resolve(JSON.parse(body));
      } else {
        reject(error);
      }
    });
  });
}

exports.getMatch = function (fifa_id) {
  console.log('getting single');
  console.log(fifa_id);
  return new Promise(function(resolve, reject) {   
    request(baseUrl+'/matches/'+fifa_id,function (error, response, body) {
      if(!error && response.statusCode == 200) {
        resolve(JSON.parse(body));
      } else {
        reject(error);
      }
    });
  });
}

exports.emojiMapping = {
  "ARG": "🇦🇷",
  "ISL": "🇮🇸",
  "PER": "🇵🇪",
  "DEN": "🇩🇰",
  "CRO": "🇭🇷",
  "NGA": "🇳🇬",
  "SRB": "🇷🇸",
  "GER": "🇩🇪",
  "MEX": "🇲🇽",
  "BRA": "🇧🇷",
  "SUI": "🇨🇭",
  "KSA": "🇸🇦",
  "URU": "🇺🇾",
  "POR": "🇵🇹",
  "ESP": "🇪🇸",
  "MAR": "🇲🇦",
  "IRN": "🇮🇷",
  "FRA": "🇫🇷",
  "AUS": "🇦🇺",
  "SWE": "🇸🇪",
  "BEL": "🇧🇪",
  "PAN": "🇵🇦",
  "TUN": "🇹🇳",
  "ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "COL": "🇨🇴",
  "JPN": "🇯🇵",
  "POL": "🇵🇱",
  "SEN": "🇸🇳",
  "RUS": "🇷🇺",
  "EGY": "🇪🇬",
  "KOR": "🇰🇷",
  "CRC": "🇨🇷"
}
