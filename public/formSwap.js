//formSwap, a little script to dynamically change the login page.

var isLogin = 1;

var loginText =    "Click here to log in.";
var registerText = "Click here to register.";

function formSwap() {
  var form = document.getElementById("login-form");
  var button = document.getElementById("the-button");
  var text = document.getElementById("flavour-text");
  var desc_box = document.getElementById("form-description");
  var name_field = document.getElementById("name-field");
  var name_input = document.getElementById("name-input");
  var name_label = document.getElementById("name-label");
  button.classList.add("hidden");
  desc_box.classList.add("hidden");
  setTimeout(function() {
    if (isLogin == 1)
    {
      button.innerHTML = "Register";
      form.action = "/register";
      text.innerHTML = loginText;
      name_input.disabled = false;
      name_field.classList.remove("disabled");
      name_input.classList.remove("disabled");
      name_label.classList.remove("disabled");
      isLogin = 0;
    } else {
      button.innerHTML = "Login";
      form.action = "/login";
      text.innerHTML = registerText;
      name_input.disabled = true;
      name_field.classList.add("disabled");
      name_input.classList.add("disabled");
      name_label.classList.add("disabled");
      isLogin = 1;
    }
    setTimeout(function(){
      button.classList.remove("hidden")
      desc_box.classList.remove("hidden")
    }, 500);
  }, 1000);
  
}