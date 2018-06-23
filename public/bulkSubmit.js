function bulkSubmit() { //64, here we hardcode the number of matches...
  var xhttp = new XMLHttpRequest;
  for (var i=1; i<65; i++) {
    let formName="prediction-form-"+i;
    console.log('Index:'+i);
    var form = document.forms.namedItem(formName);
    var button = document.getElementById("button-"+i);
    if (form){
      if (form.penaltyWinner) { //Knockout game {
        if(form.homeGoals.value && form.awayGoals.value && form.penaltyWinner.value) {
          button.innerHTML = "Submitting...";
          xhttp.open("POST","/predictions",false);
          xhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
          let formData = {matchId: form.matchId.value,
                          homeGoals:form.homeGoals.value,
                          awayGoals:form.awayGoals.value,
                          penaltyWinner:form.penaltyWinner.value}
          xhttp.send(JSON.stringify(formData));
          if (xhttp.status != 200){
            button.innerHTML="Error!";
          } else {
            button.innerHTML="Sent!";
          }
        }
      } else {
        if(form.homeGoals.value && form.awayGoals.value) {
          button.innerHTML = "Submitting...";
          xhttp.open("POST","/predictions",false);
          xhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
          let formData = {matchId:form.matchId.value,
                          homeGoals:form.homeGoals.value,
                          awayGoals:form.awayGoals.value}
          xhttp.send(JSON.stringify(formData));
          if (xhttp.status != 200){
            button.innerHTML="Error!";
          } else {
            button.innerHTML="Sent!";
          }
        }
      }
    }
  }
  window.setTimeout(500, function() {
    location.reload()
  });
}