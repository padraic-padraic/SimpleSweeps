var dayStrings = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  0: "Sunday"
}

var monthStrings = {
  0: "January",
  1: "February",
  2: "March",
  3: "April",
  4: "May",
  5: "June",
  6: "July",
  7: "August",
  8: "September",
  9: "October",
  10: "November",
  11: "December"
}

function formatDay(day) {
  if (day==1){
    return day+"st";
  } else if (day ==2 ){
    return day+"nd";
  } else if (day == 3){
    return day+"rd";
  } else {
    return day+"th";
  }
}

function formatMatches() {
  for (var i=1; i<65; i++){
    var head = document.getElementById("day-"+i);
    if (head) {
      var str = head.innerHTML;
      str = str.trim();
      let d = new Date(str);
      let day = dayStrings[d.getDay()];
      let month = monthStrings[d.getMonth()];
      head.innerHTML = day + " " + month + " " + formatDay(d.getDate()) + " " + d.getUTCFullYear();
    }
  }
}

function formatTimes() {
  var times = document.getElementsByClassName("game-time");
  for (var i=0; i<times.length; i++){
    var str = times[i].innerHTML.trim().slice(0,-1);
    console.log(str)
    let hours = parseInt(str.split('T')[1].split(':')[0]);
    let minutes = parseInt(str.split('T')[1].split(':')[1]);
    let d = new Date();
    let offset = (-1 * d.getTimezoneOffset())/60;
    let minutesOffset = (offset - Math.floor(offset))*60;
    hours = (hours + offset)%24;
    if (hours < 0) {
      hours = hours + 24;
    }
    let newMinutes = (minutes + minutesOffset);
    if (newMinutes > 60) {
      hours = hours +1;
      minutes = (newMinutes)%60;
    } else if (newMinutes < 0) {
      minutes = newMinutes + 60;
      hours = hours -1;
    }
    var timeStr = hours.toString() + ':';
    if (minutes <10){
      timeStr = timeStr + '0'+minutes;
    } else {
      timeStr = timeStr + minutes.toString();
    }
    times[i].innerHTML = timeStr;
  }
}

formatMatches();
formatTimes();

