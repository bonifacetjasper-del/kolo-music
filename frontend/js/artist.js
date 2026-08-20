/* =========================================================
   KOLO MUSIC â€” ARTIST DASHBOARD
   artist.js
========================================================= */

"use strict";

/* =========================================================
   GET LOGGED-IN USER
========================================================= */

function getArtistUser() {
  const savedUser = localStorage.getItem("koloUser");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.error("Invalid koloUser:", error);

    localStorage.removeItem("koloUser");

    return null;
  }
}

/* =========================================================
   BASIC HELPERS
========================================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function formatLD(amount) {
  const value = Number(amount) || 0;

  return value.toLocaleString() + " LD";
}

/* =========================================================
   ARTIST STATUS
========================================================= */

function setArtistStatus(status) {
  const element = document.getElementById("artistStatus");

  const cleanStatus = String(status || "unknown")
    .toLowerCase()
    .trim();

  if (element) {
    element.textContent = cleanStatus.toUpperCase();

    element.className = "artist-status status-" + cleanStatus;
  }

  const formattedStatus =
    cleanStatus.charAt(0).toUpperCase() + cleanStatus.slice(1);

  setText("profileArtistStatus", formattedStatus);
}

/* =========================================================
   LOADING / DASHBOARD VISIBILITY
========================================================= */

function showLoading(message = "Loading artist dashboard...") {
  const loading = document.getElementById("loading");

  const dashboardContent = document.getElementById("dashboardContent");

  if (loading) {
    loading.classList.remove("hidden");

    loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
  }

  if (dashboardContent) {
    dashboardContent.classList.add("hidden");
  }
}

function hideLoading() {
  const loading = document.getElementById("loading");

  const dashboardContent = document.getElementById("dashboardContent");

  if (loading) {
    loading.classList.add("hidden");
  }

  if (dashboardContent) {
    dashboardContent.classList.remove("hidden");
  }
}

/* =========================================================
   SHOW DASHBOARD ERROR
========================================================= */

function showDashboardError(message) {
  const loading = document.getElementById("loading");

  const dashboardContent = document.getElementById("dashboardContent");

  if (dashboardContent) {
    dashboardContent.classList.add("hidden");
  }

  if (loading) {
    loading.classList.remove("hidden");

    loading.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">!</div>
                <h4>Unable to load dashboard</h4>
                <p>${message}</p>
            </div>
        `;
  }
}

/* =========================================================
   LOAD ARTIST DASHBOARD
========================================================= */

async function loadArtistDashboard() {
  const user = getArtistUser();

  if (!user || !user.id) {
    window.location.href = "login.html";
    return;
  }

  showLoading();

  if (!window.KOLO_API || typeof window.KOLO_API.get !== "function") {
    console.error("KOLO_API is not available.");

    showDashboardError("API connection is unavailable. Please try again.");

    return;
  }

  try {
    console.log("Loading KOLO MUSIC artist dashboard...");

    const response = await window.KOLO_API.get("/artist/dashboard");

    console.log("Artist dashboard response:", response);

    /* =========================================
           ARTIST INFORMATION
        ========================================= */

    const artist = response && response.artist ? response.artist : {};

    const artistName =
      artist.artist_name ||
      artist.name ||
      user.artist_name ||
      user.name ||
      "Artist";

    const artistStatus = artist.status || user.status || "unknown";

    setText("headerArtistName", artistName);

    setText("profileArtistName", artistName);

    setArtistStatus(artistStatus);

    /* =========================================
           WALLET
        ========================================= */

    const wallet = response && response.wallet ? response.wallet : {};

    const balance = Number(wallet.balance ?? wallet.available_balance ?? 0);

    const totalEarned = Number(wallet.total_earned ?? wallet.totalEarned ?? 0);

    setText("walletBalance", formatLD(balance));

    setText("walletBalanceLarge", formatLD(balance));

    setText("totalEarned", formatLD(totalEarned));

    setText("withdrawAvailableBalance", formatLD(balance));

    /* =========================================
           STATISTICS
        ========================================= */

    const statistics =
      response && response.statistics ? response.statistics : {};

    const songsUploaded = Number(
      statistics.songs_uploaded ?? statistics.songsUploaded ?? 0,
    );

    const totalSales = Number(
      statistics.total_sales ?? statistics.totalSales ?? 0,
    );

    const totalRevenue = Number(
      statistics.total_revenue ?? statistics.totalRevenue ?? 0,
    );

    const artistRevenue = Number(
      statistics.artist_revenue ?? statistics.artistRevenue ?? 0,
    );

    setText("songsUploaded", songsUploaded);

    setText("totalSales", totalSales);

    setText("totalRevenue", formatLD(totalRevenue));

    setText("artistRevenue", formatLD(artistRevenue));

    /* =========================================
           SONGS
        ========================================= */

    const songs =
      response && Array.isArray(response.songs) ? response.songs : [];

    loadArtistSongs(songs);

    /* =========================================
           SALES
        ========================================= */

    const sales =
      response && Array.isArray(response.sales) ? response.sales : [];

    loadArtistSales(sales);

    /* =========================================
           DASHBOARD READY
        ========================================= */

    hideLoading();

    console.log("Artist dashboard loaded successfully.");
  } catch (error) {
    console.error("Artist dashboard error:", error);

    showDashboardError(
      error.message || "Please check your connection and try again.",
    );
  }
}

/* =========================================================
   LOAD ARTIST SONGS
========================================================= */

function loadArtistSongs(songs) {
  const container = document.getElementById("songsContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(songs) || songs.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">â™«</div>

                <h4>No songs uploaded yet</h4>

                <p>
                    Your uploaded songs will appear here.
                </p>
            </div>
        `;

    return;
  }

  songs.forEach(function (song) {
    const item = document.createElement("article");

    item.className = "artist-song-item";

    const title = document.createElement("h4");

    title.className = "artist-song-title";

    title.textContent = song.title || "Untitled";

    const status = document.createElement("span");

    const cleanStatus = String(song.status || "pending").toLowerCase();

    status.className = "artist-song-status status-" + cleanStatus;

    status.textContent = cleanStatus.toUpperCase();

    item.appendChild(title);

    item.appendChild(status);

    container.appendChild(item);
  });
}

/* =========================================================
   LOAD ARTIST SALES
========================================================= */

function loadArtistSales(sales) {
  const container = document.getElementById("salesContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(sales) || sales.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">LD</div>

                <h4>No sales yet</h4>

                <p>
                    Approved song payments will appear here.
                </p>
            </div>
        `;

    return;
  }

  sales.forEach(function (sale) {
    const item = document.createElement("article");

    item.className = "artist-sale-item";

    const title = document.createElement("div");

    title.className = "artist-sale-title";

    title.textContent = sale.song_title || sale.song_name || "Unknown song";

    const amount = document.createElement("strong");

    amount.className = "artist-sale-amount";

    amount.textContent = formatLD(sale.amount || sale.total || 0);

    item.appendChild(title);

    item.appendChild(amount);

    container.appendChild(item);
  });
}

/* =========================================================
   LOAD ARTIST WITHDRAWALS
========================================================= */

async function loadArtistWithdrawals() {
  const user = getArtistUser();

  if (!user || !user.id) {
    return;
  }

  if (!window.KOLO_API || typeof window.KOLO_API.get !== "function") {
    console.error("KOLO_API.get is not available.");

    return;
  }

  const container = document.getElementById("withdrawalsContainer");

  if (!container) {
    return;
  }

  try {
    const response = await window.KOLO_API.get("/artist/withdrawals");

    console.log("Artist withdrawals:", response);

    const withdrawals =
      response && Array.isArray(response.withdrawals)
        ? response.withdrawals
        : [];

    container.innerHTML = "";

    if (withdrawals.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">â†—</div>

                    <h4>No withdrawals yet</h4>

                    <p>
                        Your withdrawal requests
                        will appear here.
                    </p>
                </div>
            `;

      return;
    }

    withdrawals.forEach(function (withdrawal) {
      const item = document.createElement("article");

      item.className = "artist-withdrawal-item";

      const amount = document.createElement("strong");

      amount.textContent = formatLD(withdrawal.amount || 0);

      const status = document.createElement("span");

      const cleanStatus = String(withdrawal.status || "pending").toLowerCase();

      status.className = "artist-withdrawal-status status-" + cleanStatus;

      status.textContent = cleanStatus.toUpperCase();

      item.appendChild(amount);

      item.appendChild(status);

      container.appendChild(item);
    });
  } catch (error) {
    console.error("Withdrawals error:", error);

    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">!</div>

                <h4>Unable to load withdrawals</h4>

                <p>
                    Please try again later.
                </p>
            </div>
        `;
  }
}

/* =========================================================
   OPEN WITHDRAWAL MODAL
========================================================= */

function openWithdrawModal() {
  const modal = document.getElementById("withdrawModal");

  if (!modal) {
    console.error("Withdrawal modal not found.");

    return;
  }

  modal.classList.remove("hidden");

  modal.setAttribute("aria-hidden", "false");

  const input = document.getElementById("withdrawAmount");

  if (input) {
    setTimeout(function () {
      input.focus();
    }, 50);
  }
}

/* =========================================================
   CLOSE WITHDRAWAL MODAL
========================================================= */

function closeWithdrawModal() {
  const modal = document.getElementById("withdrawModal");

  if (!modal) {
    return;
  }

  modal.classList.add("hidden");

  modal.setAttribute("aria-hidden", "true");

  const form = document.getElementById("withdrawForm");

  if (form) {
    form.reset();
  }

  const message = document.getElementById("withdrawMessage");

  if (message) {
    message.textContent = "";
  }
}

/* =========================================================
   REQUEST WITHDRAWAL
========================================================= */

async function requestWithdrawal(event) {
  if (event) {
    event.preventDefault();
  }

  const user = getArtistUser();

  if (!user || !user.id) {
    alert("Please login again.");
    return;
  }

  /* =========================================
     WITHDRAWAL AMOUNT
  ========================================= */

  const input = document.getElementById("withdrawAmount");

  if (!input) {
    alert("Withdrawal amount field not found.");
    return;
  }

  const amount = Number(input.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Enter a valid withdrawal amount.");
    return;
  }

  /* =========================================
     PAYMENT INFORMATION
  ========================================= */

  const paymentMethodInput =
    document.getElementById("withdrawPaymentMethod");

  const mobileMoneyNameInput =
    document.getElementById("withdrawMobileMoneyName");

  const mobileMoneyNumberInput =
    document.getElementById("withdrawMobileMoneyNumber");

  if (
    !paymentMethodInput ||
    !mobileMoneyNameInput ||
    !mobileMoneyNumberInput
  ) {
    alert("Withdrawal payment fields are missing.");
    return;
  }

  const paymentMethod =
    paymentMethodInput.value.trim();

  const mobileMoneyName =
    mobileMoneyNameInput.value.trim();

  const mobileMoneyNumber =
    mobileMoneyNumberInput.value.trim();

  if (!paymentMethod) {
    alert("Please select a Mobile Money provider.");
    paymentMethodInput.focus();
    return;
  }

  if (!mobileMoneyName) {
    alert("Please enter the Mobile Money account name.");
    mobileMoneyNameInput.focus();
    return;
  }

  if (!mobileMoneyNumber) {
    alert("Please enter the Mobile Money number.");
    mobileMoneyNumberInput.focus();
    return;
  }

  /* =========================================
     SUBMIT BUTTON
  ========================================= */

  const submitButton =
    document.getElementById("submitWithdrawalButton");

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
  }

  try {

    /* =========================================
       SEND WITHDRAWAL REQUEST
    ========================================= */

    const response = await window.KOLO_API.post(
      "/artist/withdraw",
      {
        amount: amount,
        payment_method: paymentMethod,
        mobile_money_name: mobileMoneyName,
        mobile_money_number: mobileMoneyNumber
      }
    );

    console.log(
      "Withdrawal response:",
      response
    );

    if (!response || response.success === false) {
      throw new Error(
        response && response.message
          ? response.message
          : "Withdrawal request failed."
      );
    }

    alert(
      response.message ||
      "Withdrawal request submitted successfully."
    );

    closeWithdrawModal();

    /* =========================================
       REFRESH DASHBOARD
    ========================================= */

    await loadArtistDashboard();

    await loadArtistWithdrawals();

  } catch (error) {

    console.error(
      "Withdrawal error:",
      error
    );

    alert(
      error.message ||
      "Unable to request withdrawal."
    );

  } finally {

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent =
        "Submit Withdrawal";
    }
  }
}
/* =========================================================
   NAVIGATION
========================================================= */

function switchArtistSection(sectionName) {
  if (!sectionName) {
    return;
  }

  const sections = document.querySelectorAll(".dashboard-section");

  const buttons = document.querySelectorAll(".nav-item");

  sections.forEach(function (section) {
    section.classList.remove("active-section");
  });

  buttons.forEach(function (button) {
    button.classList.remove("active");
  });

  const target = document.getElementById(sectionName + "Section");

  if (target) {
    target.classList.add("active-section");
  }

  const activeButton = document.querySelector(
    '.nav-item[data-section="' + sectionName + '"]',
  );

  if (activeButton) {
    activeButton.classList.add("active");
  }
}

/* =========================================================
   MOBILE MENU
========================================================= */

function openMobileMenu() {
  const sidebar = document.getElementById("artistSidebar");

  const overlay = document.getElementById("sidebarOverlay");

  const button = document.getElementById("mobileMenuButton");

  if (sidebar) {
    sidebar.classList.add("sidebar-open");
  }

  if (overlay) {
    overlay.classList.add("active");

    overlay.setAttribute("aria-hidden", "false");
  }

  if (button) {
    button.setAttribute("aria-expanded", "true");
  }
}

function closeMobileMenu() {
  const sidebar = document.getElementById("artistSidebar");

  const overlay = document.getElementById("sidebarOverlay");

  const button = document.getElementById("mobileMenuButton");

  if (sidebar) {
    sidebar.classList.remove("sidebar-open");
  }

  if (overlay) {
    overlay.classList.remove("active");

    overlay.setAttribute("aria-hidden", "true");
  }

  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
}

/* =========================================================
   LISTEN TO MUSIC AS ARTIST
========================================================= */

function listenToMusic() {
  const user = getArtistUser();

  if (!user || !user.id) {
    alert("Please login again.");

    window.location.href = "login.html";

    return;
  }

  /*
   * The account remains an artist.
   *
   * We do NOT change koloRole.
   *
   * The artist can enter the listener
   * experience using the same session.
   */

  window.location.href = "listener.html";
}

/* =========================================================
   GO TO LISTENER DASHBOARD
========================================================= */

function goToListenerDashboard() {
  listenToMusic();
}

/* =========================================================
   GO TO MARKETPLACE / MUSIC
========================================================= */

function goToMarketplace() {
  window.location.href = "index.html#songs";
}

/* =========================================================
   LOGOUT
========================================================= */

function artistLogout() {
  localStorage.removeItem("koloUser");

  localStorage.removeItem("koloRole");

  localStorage.removeItem("koloToken");

  window.location.href = "index.html";
}

/* =========================================================
   UPLOAD SONG
========================================================= */

function openUploadSong() {
  window.location.href = "./artist_uploads.html";
}

/* =========================================================
   INITIALIZE ARTIST DASHBOARD
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("KOLO MUSIC artist dashboard ready.");

  /* =========================================
           NAVIGATION
        ========================================= */

  const navButtons = document.querySelectorAll(".nav-item");

  navButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const section = button.dataset.section;

      if (section) {
        switchArtistSection(section);
      }

      closeMobileMenu();
    });
  });

  /* =========================================
           LOGOUT
        ========================================= */

  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", artistLogout);
  }

  /* =========================================
           MOBILE MENU
        ========================================= */

  const mobileMenuButton = document.getElementById("mobileMenuButton");

  if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", openMobileMenu);
  }

  /* =========================================
           MOBILE OVERLAY
        ========================================= */

  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeMobileMenu);
  }

  /* =========================================
           WITHDRAW BUTTON
        ========================================= */

  const withdrawButton = document.getElementById("withdrawButton");

  if (withdrawButton) {
    withdrawButton.addEventListener("click", openWithdrawModal);
  }

  /* =========================================
           CLOSE WITHDRAWAL
        ========================================= */

  const closeWithdrawButton = document.getElementById("closeWithdrawModal");

  if (closeWithdrawButton) {
    closeWithdrawButton.addEventListener("click", closeWithdrawModal);
  }

  /* =========================================
           WITHDRAW FORM
        ========================================= */

  const withdrawForm = document.getElementById("withdrawForm");

  if (withdrawForm) {
    withdrawForm.addEventListener("submit", requestWithdrawal);
  }

  /* =========================================
           WITHDRAW MODAL BACKDROP
        ========================================= */

  const withdrawModal = document.getElementById("withdrawModal");

  if (withdrawModal) {
    withdrawModal.addEventListener("click", function (event) {
      if (event.target === withdrawModal) {
        closeWithdrawModal();
      }
    });
  }

  /* =========================================
           UPLOAD SONG
        ========================================= */

  const uploadSongButton = document.getElementById("uploadSongButton");

  if (uploadSongButton) {
    uploadSongButton.addEventListener("click", openUploadSong);
  }

  /* =========================================
           LISTEN TO MUSIC
        ========================================= */

  const listenMusicButton = document.getElementById("listenMusicButton");

  if (listenMusicButton) {
    listenMusicButton.addEventListener("click", listenToMusic);
  }

  /* =========================================
           REFRESH DASHBOARD
        ========================================= */

  const refreshButton = document.getElementById("refreshDashboardButton");

  if (refreshButton) {
    refreshButton.addEventListener("click", async function () {
      refreshButton.disabled = true;

      try {
        await loadArtistDashboard();

        await loadArtistWithdrawals();
      } finally {
        refreshButton.disabled = false;
      }
    });
  }

  /* =========================================
           ESCAPE KEY
        ========================================= */

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeWithdrawModal();

      closeMobileMenu();
    }
  });

  /* =========================================
           INITIAL SECTION
        ========================================= */

  switchArtistSection("overview");

  /* =========================================
           LOAD DASHBOARD
        ========================================= */

  loadArtistDashboard();

  loadArtistWithdrawals();
});

/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.getArtistUser = getArtistUser;

window.loadArtistDashboard = loadArtistDashboard;

window.loadArtistWithdrawals = loadArtistWithdrawals;

window.requestWithdrawal = requestWithdrawal;

window.artistLogout = artistLogout;

window.openWithdrawModal = openWithdrawModal;

window.closeWithdrawModal = closeWithdrawModal;

window.switchArtistSection = switchArtistSection;

window.openUploadSong = openUploadSong;

window.listenToMusic = listenToMusic;

window.goToListenerDashboard = goToListenerDashboard;

window.goToMarketplace = goToMarketplace;

