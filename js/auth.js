function handleCredentialResponse(response) {
  const idToken = response.credential;

  fetch("https://script.google.com/macros/s/AKfycbzlVEuazq6Sfcr8X_g5qdy75AQ5-vONvZBTPzfZxLtMtx9Zgpppd-9T_NmbJudyEt-E3g/exec", {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      id_token: idToken
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "ok") {
      sessionStorage.setItem("user", JSON.stringify(data.user));
      showSuccessMessage(
            "Login berhasil! Membuka SICAPAI..."
      );

      setTimeout(() => {
        window.location.href = "home.html";
      }, 1500);
    } else {
      showErrorMessage(data.message || "Login failed.");
    }
  })
  .catch(err => {
    console.error(err);
    alert("Authentication error.");
  });
}

function showSuccessMessage(message) {
  const box = document.getElementById("login-message");
  box.textContent = message;
  box.className = "success";
}

function showErrorMessage(message) {
  const box = document.getElementById("login-message");
  box.textContent = message;
  box.className = "error";
}

