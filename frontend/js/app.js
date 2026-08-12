/* ==========================================
   KOLO MUSIC APPLICATION CONTROLLER
========================================== */

/*
   This file controls:

   - Homepage navigation
   - Login / Register buttons
   - Logged-in user navigation
   - Logout
   - Music search
   - Smooth scrolling
   - Homepage buttons

   IMPORTANT:
   This file does NOT automatically log users out.
*/

/* ==========================================
   GO TO LOGIN
========================================== */

function goToLogin() {
  window.location.href = "login.html";
}

/* ==========================================
   GO TO REGISTER
========================================== */

function goToRegister() {
  window.location.href = "register.html";
}

/* ==========================================
   GO TO HOME
========================================== */

function goToHome() {
  window.location.href = "index.html";
}

/* ==========================================
   GO TO LISTENER DASHBOARD
========================================== */

function goToListenerDashboard() {
  window.location.href = "listener.html";
}

/* ==========================================
   GO TO ARTIST DASHBOARD
========================================== */

function goToArtistDashboard() {
  window.location.href = "artist.html";
}

/* ==========================================
   GO TO ADMIN DASHBOARD
========================================== */

function goToAdminDashboard() {
  window.location.href = "admin.html";
}

/* ==========================================
   BECOME AN ARTIST
========================================== */

function becomeArtist() {
  window.location.href = "register.html";
}

/* ==========================================
   EXPLORE MUSIC
========================================== */

function exploreMusic() {
  const songsSection = document.getElementById("songs");

  if (songsSection) {
    songsSection.scrollIntoView({
      behavior: "smooth",
    });
  } else {
    window.location.href = "index.html#songs";
  }
}

/* ==========================================
   LOGOUT USER
========================================== */

function logoutUser() {
  /*
       IMPORTANT:

       Only this function removes the
       saved KOLO MUSIC session.
    */

  localStorage.removeItem("koloUser");
  localStorage.removeItem("koloRole");
  localStorage.removeItem("koloToken");

  window.location.href = "index.html";
}

/* ==========================================
   GET SAVED USER
========================================== */

function getSavedUser() {
  const savedUser = localStorage.getItem("koloUser");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.error("Invalid saved KOLO user:", error);

    localStorage.removeItem("koloUser");

    return null;
  }
}

/* ==========================================
   UPDATE HOMEPAGE NAVIGATION
========================================== */

function updateNavigationForUser() {
  const user = getSavedUser();

  const navButtons = document.querySelector(".nav-buttons");

  if (!navButtons) {
    return;
  }

  /* --------------------------------------
       NO USER LOGGED IN
    -------------------------------------- */

  if (!user) {
    navButtons.innerHTML = `

            <button
                type="button"
                class="login-btn"
                id="homepageLoginButton"
            >
                Login
            </button>

            <button
                type="button"
                class="register-btn"
                id="homepageRegisterButton"
            >
                Join KOLO
            </button>

        `;

    const loginButton = document.getElementById("homepageLoginButton");

    const registerButton = document.getElementById("homepageRegisterButton");

    if (loginButton) {
      loginButton.addEventListener("click", goToLogin);
    }

    if (registerButton) {
      registerButton.addEventListener("click", goToRegister);
    }

    return;
  }

  /* --------------------------------------
       USER IS LOGGED IN
    -------------------------------------- */

  let dashboardFunction = goToListenerDashboard;

  let dashboardText = "🎧 My Dashboard";

  /* --------------------------------------
       ARTIST
    -------------------------------------- */

  if (user.role === "artist") {
    dashboardFunction = goToArtistDashboard;

    dashboardText = "🎤 Artist Dashboard";
  } else if (user.role === "admin") {
    /* --------------------------------------
       ADMIN
    -------------------------------------- */
    dashboardFunction = goToAdminDashboard;

    dashboardText = "🛠 Admin Dashboard";
  }

  /* --------------------------------------
       LOGGED-IN NAVIGATION
    -------------------------------------- */

  navButtons.innerHTML = `

        <button
            type="button"
            class="login-btn"
            id="dashboardButton"
        >
            ${dashboardText}
        </button>

        <button
            type="button"
            class="register-btn"
            id="homepageLogoutButton"
        >
            Logout
        </button>

    `;

  const dashboardButton = document.getElementById("dashboardButton");

  const logoutButton = document.getElementById("homepageLogoutButton");

  if (dashboardButton) {
    dashboardButton.addEventListener("click", dashboardFunction);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logoutUser);
  }

  console.log("KOLO MUSIC logged-in user:", user);
}

/* ==========================================
   CONNECT HOME BUTTONS
========================================== */

function connectHomeButtons() {
  /* --------------------------------------
       LOGIN BUTTON
    -------------------------------------- */

  const loginButton = document.querySelector(".nav-buttons .login-btn");

  if (loginButton && !loginButton.id) {
    loginButton.addEventListener("click", goToLogin);
  }

  /* --------------------------------------
       JOIN KOLO BUTTON
    -------------------------------------- */

  const registerButton = document.querySelector(".nav-buttons .register-btn");

  if (registerButton && !registerButton.id) {
    registerButton.addEventListener("click", goToRegister);
  }

  /* --------------------------------------
       EXPLORE MUSIC
    -------------------------------------- */

  const primaryHeroButton = document.querySelector(".hero .primary-btn");

  if (primaryHeroButton) {
    primaryHeroButton.addEventListener("click", exploreMusic);
  }

  /* --------------------------------------
       BECOME ARTIST
    -------------------------------------- */

  const heroSecondaryButton = document.querySelector(".hero .secondary-btn");

  if (heroSecondaryButton) {
    heroSecondaryButton.addEventListener("click", becomeArtist);
  }

  /* --------------------------------------
       ARTIST BANNER
    -------------------------------------- */

  const artistBannerButton = document.querySelector(
    ".artist-banner .primary-btn",
  );

  if (artistBannerButton) {
    artistBannerButton.addEventListener("click", becomeArtist);
  }
}

/* ==========================================
   CONNECT NAVIGATION LINKS
========================================== */

function connectNavigation() {
  const navLinks = document.querySelectorAll(".nav-links a");

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      const target = this.getAttribute("href");

      if (!target || !target.startsWith("#")) {
        return;
      }

      const section = document.querySelector(target);

      if (section) {
        event.preventDefault();

        section.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });
}

/* ==========================================
   SEARCH MUSIC
========================================== */

function connectSearch() {
  const searchInput = document.getElementById("musicSearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", function () {
    const searchText = this.value.trim().toLowerCase();

    const cards = document.querySelectorAll(".music-card");

    cards.forEach(function (card) {
      const text = card.textContent.toLowerCase();

      if (searchText === "" || text.includes(searchText)) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  });
}

/* ==========================================
   APPLICATION START
========================================== */

document.addEventListener("DOMContentLoaded", function () {
  console.log("KOLO MUSIC application started");

  /* ----------------------------------
           Connect homepage buttons
        ---------------------------------- */

  connectHomeButtons();

  /* ----------------------------------
           Connect navigation links
        ---------------------------------- */

  connectNavigation();

  /* ----------------------------------
           Connect music search
        ---------------------------------- */

  connectSearch();

  /* ----------------------------------
           Check saved session

           This does NOT remove the user.

           It only changes the homepage
           navigation depending on whether
           a user is already logged in.
        ---------------------------------- */

  updateNavigationForUser();
});
