/* ==========================================
   KOLO MUSIC AUTHENTICATION SYSTEM
========================================== */

/*
Handles:

- Login
- Registration
- Artist registration
- Session storage
- Logout
- Role redirects
*/

/* ==========================================
   LOGIN USER
========================================== */

async function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail")?.value.trim();

  const password = document.getElementById("loginPassword")?.value;

  const message = document.getElementById("loginMessage");

  if (!email || !password) {
    if (message) {
      message.textContent = "Please enter your email and password.";
    }

    return;
  }

  if (message) {
    message.textContent = "Logging in...";
  }

  try {
    const response = await KOLO_API.post("/auth/login", {
      email: email,
      password: password,
    });

    console.log("Login response:", response);

    if (!response || !response.user) {
      if (message) {
        message.textContent = "Login failed. Check your details.";
      }

      return;
    }

    /* Save session */

    localStorage.setItem("koloUser", JSON.stringify(response.user));

    if (message) {
      message.textContent = "Login successful...";
    }

    /* Redirect by role */

    if (response.user.role === "admin") {
      window.location.href = "admin.html";

      return;
    }

    if (response.user.role === "artist") {
      window.location.href = "artist.html";

      return;
    }

    window.location.href = "listener.html";
  } catch (error) {
    console.error("Login error:", error);

    if (message) {
      message.textContent = error.message || "Something went wrong.";
    }
  }
}

/* ==========================================
   CREATE ACCOUNT
========================================== */

async function registerUser(event) {
  event.preventDefault();

  /* ======================================
       GET FORM ELEMENTS
    ====================================== */

  const fullName = document.getElementById("fullName")?.value.trim();

  const email = document.getElementById("email")?.value.trim();

  const password = document.getElementById("password")?.value;

  const phone = document.getElementById("phone")?.value.trim();

  const role = document.getElementById("role")?.value;

  const artistName = document.getElementById("artistName")?.value.trim();

  const bio = document.getElementById("bio")?.value.trim();

  const message = document.getElementById("registerMessage");

  /* ======================================
       VALIDATION
    ====================================== */

  if (!fullName) {
    message.textContent = "Please enter your full name.";

    return;
  }

  if (!email) {
    message.textContent = "Please enter your email.";

    return;
  }

  if (!password) {
    message.textContent = "Please enter a password.";

    return;
  }

  if (password.length < 6) {
    message.textContent = "Password must be at least 6 characters.";

    return;
  }

  if (!role) {
    message.textContent = "Please select an account type.";

    return;
  }

  /* ======================================
       ARTIST VALIDATION
    ====================================== */

  if (role === "artist" && !artistName) {
    message.textContent = "Please enter your artist name.";

    return;
  }

  message.textContent = "Creating your account...";

  try {
    /* ==================================
           REGISTRATION REQUEST
        ================================== */

    const response = await KOLO_API.post("/auth/register", {
      full_name: fullName,
      email: email,
      password: password,
      phone: phone,
      role: role,
      artist_name: artistName,
      bio: bio,
    });

    console.log("Registration response:", response);

    /* ==================================
           CHECK RESPONSE
        ================================== */

    if (!response) {
      throw new Error("Registration failed.");
    }

    /* ==================================
           SAVE SESSION IF PROVIDED
        ================================== */

    if (response.user) {
      localStorage.setItem("koloUser", JSON.stringify(response.user));

      message.textContent = "Account created successfully!";

      /* Redirect by role */

      if (response.user.role === "admin") {
        window.location.href = "admin.html";

        return;
      }

      if (response.user.role === "artist") {
        window.location.href = "artist.html";

        return;
      }

      window.location.href = "listener.html";

      return;
    }

    /* ==================================
           REGISTRATION SUCCESS
           BUT NO LOGIN SESSION
        ================================== */

    message.textContent = "Account created successfully! Please login.";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  } catch (error) {
    console.error("Registration error:", error);

    message.textContent = error.message || "Unable to create account.";
  }
}

/* ==========================================
   LOGOUT USER
========================================== */

function logout() {
  localStorage.removeItem("koloUser");

  localStorage.removeItem("koloRole");

  localStorage.removeItem("koloToken");

  window.location.href = "index.html";
}

/* ==========================================
   GET CURRENT USER
========================================== */

function getCurrentUser() {
  const savedUser = localStorage.getItem("koloUser");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.error("Invalid KOLO user session:", error);

    localStorage.removeItem("koloUser");

    return null;
  }
}

/* ==========================================
   CONNECT AUTH FORMS
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ==================================
           LOGIN FORM
        ================================== */

  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", loginUser);
  }

  /* ==================================
           REGISTER FORM
        ================================== */

  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener("submit", registerUser);
  }

  console.log("KOLO MUSIC authentication ready.");
});
