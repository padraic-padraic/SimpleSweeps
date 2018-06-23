function validateSinglePrediction() {
  document.getElementById("form-err").innerHTML = "";
  var valid = true;
  var homeGoals = document.forms['prediction-form']['homeGoals'];
  if (homeGoals == "--"){
    valid = false;
  }
  var awayGoals = document.forms['prediction-form']['awayGoals'];
  if (awayGoals == "--"){
    valid = false;
  }
  if (document.forms['prediction-form']['penaltyWinner']){
    if (document.forms['prediction-form']['penaltyWinner']=='--'){
      valid = false;
    }
  }
  if(valid == false) {
    document.getElementById("form-err").innerHTML = "Error on submission! Please select a value for each option.";
  }
  return valid;
}