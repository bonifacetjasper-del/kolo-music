/* ==========================================
   KOLO MUSIC ADMIN DASHBOARD
========================================== */

/*
   Handles:

   - Admin authentication
   - Dashboard statistics
   - Pending payments
   - Payment approval/rejection
   - Song management
   - Artist management
   - Withdrawal management
   - Logout
*/

/* ==========================================
   GLOBAL STATE
========================================== */

let adminUser = null;

/* ==========================================
   GET CURRENT USER
========================================== */

function getAdminUser() {
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
   CHECK ADMIN ACCESS
========================================== */

function checkAdminAccess() {
  const user = getAdminUser();

  if (!user) {
    window.location.href = "login.html";
    return false;
  }

  if (user.role !== "admin") {
    alert("Admin access required.");

    window.location.href = "index.html";

    return false;
  }

  adminUser = user;

  return true;
}

/* ==========================================
   LOGOUT
========================================== */

function adminLogout() {
  localStorage.removeItem("koloUser");
  localStorage.removeItem("koloRole");
  localStorage.removeItem("koloToken");

  window.location.href = "index.html";
}

/* ==========================================
   API GET HELPER
========================================== */

async function adminGet(endpoint) {
  try {
    return await KOLO_API.get(endpoint);
  } catch (error) {
    console.error("Admin GET error:", error);

    return null;
  }
}

/* ==========================================
   API POST HELPER
========================================== */

async function adminPost(endpoint, data = {}) {
  try {
    return await KOLO_API.post(endpoint, data);
  } catch (error) {
    console.error("Admin POST error:", error);

    throw error;
  }
}

/* ==========================================
   ADMIN WELCOME
========================================== */

function updateAdminWelcome() {
  const element = document.getElementById("adminWelcome");

  if (!element) {
    return;
  }

  const name = adminUser?.full_name || adminUser?.email || "Administrator";

  element.textContent = `Welcome, ${name}`;
}

/* ==========================================
   LOAD COMPLETE DASHBOARD
========================================== */

async function loadAdminDashboard() {
  if (!checkAdminAccess()) {
    return;
  }

  updateAdminWelcome();

  /*
       Load all dashboard sections.
    */

  await Promise.all([
    loadAdminPayments(),
    loadAdminSongs(),
    loadAdminArtists(),
    loadAdminWithdrawals(),
  ]);

  /*
       Load financial/statistical
       information directly from backend.
    */

  await updateDashboardStats();
}

/* ==========================================
   LOAD PENDING PAYMENTS
========================================== */

async function loadAdminPayments() {
  const container = document.getElementById("paymentsContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "<p>Loading payments...</p>";

  try {
    /*
           Backend endpoint:

           GET /admin/payments/pending
        */

    const response = await adminGet("/admin/payments/pending");

    let payments = [];

    if (response && Array.isArray(response.payments)) {
      payments = response.payments;
    } else if (Array.isArray(response)) {
      payments = response;
    }

    container.innerHTML = "";

    if (!payments.length) {
      container.innerHTML = `
                <div class="admin-card">
                    <h3>No Pending Payments</h3>

                    <p>
                        There are currently no
                        KOLO SCREAM payments
                        waiting for approval.
                    </p>
                </div>
            `;

      return;
    }

    payments.forEach((payment) => {
      const card = document.createElement("div");

      card.className = "admin-card";

      const amount = Number(payment.amount || 50);

      const status = payment.status || "pending";

      const paymentId = payment.id || "N/A";

      const paymentMethod = payment.payment_method || "Unknown";

      const proofHTML = payment.proof_image
        ? `
                        <a
                            href="${escapeHTML(payment.proof_image)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View Payment Proof
                        </a>
                    `
        : `
                        <p>
                            No payment proof uploaded.
                        </p>
                    `;

      card.innerHTML = `
                <div class="admin-card-content">

                    <h3>
                        KOLO SCREAM
                    </h3>

                    <p>
                        Amount:
                        <strong>
                            ${amount} LD
                        </strong>
                    </p>

                    <p>
                        Payment method:
                        <strong>
                            ${escapeHTML(paymentMethod)}
                        </strong>
                    </p>

                    <p>
                        Status:
                        <strong>
                            ${escapeHTML(status)}
                        </strong>
                    </p>

                    <p>
                        Payment ID:
                        ${escapeHTML(paymentId)}
                    </p>

                    ${proofHTML}

                    <div
                        class="admin-action-buttons"
                    >

                        <button
                            type="button"
                            class="approve-payment-btn"
                            data-payment-id="${escapeHTML(paymentId)}"
                        >
                            Approve Payment
                        </button>

                        <button
                            type="button"
                            class="reject-payment-btn"
                            data-payment-id="${escapeHTML(paymentId)}"
                        >
                            Reject Payment
                        </button>

                    </div>

                </div>
            `;

      container.appendChild(card);
    });

    connectPaymentButtons();
  } catch (error) {
    console.error("Payment loading error:", error);

    container.innerHTML = `
            <div class="admin-card">
                <p>
                    Unable to load payments.
                </p>
            </div>
        `;
  }
}

/* ==========================================
   CONNECT PAYMENT BUTTONS
========================================== */

function connectPaymentButtons() {
  const approveButtons = document.querySelectorAll(".approve-payment-btn");

  approveButtons.forEach((button) => {
    button.addEventListener("click", function () {
      approvePayment(this.dataset.paymentId, this);
    });
  });

  const rejectButtons = document.querySelectorAll(".reject-payment-btn");

  rejectButtons.forEach((button) => {
    button.addEventListener("click", function () {
      rejectPayment(this.dataset.paymentId, this);
    });
  });
}

/* ==========================================
   APPROVE PAYMENT
========================================== */

async function approvePayment(paymentId, button) {
  if (!paymentId) {
    alert("Payment ID is missing.");

    return;
  }

  if (!confirm("Approve this KOLO SCREAM payment?")) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Approving...";
  }

  try {
    /*
           Backend:

           POST
           /admin/payments/{payment_id}/approve

           KOLO_API automatically
           sends the admin user-id header.
        */

    const response = await adminPost(
      `/admin/payments/${paymentId}/approve`,
      {},
    );

    console.log("Payment approval response:", response);

    alert(response?.message || "Payment approved successfully.");

    await loadAdminPayments();

    await updateDashboardStats();
  } catch (error) {
    console.error("Payment approval error:", error);

    alert(error.message || "Unable to approve payment.");

    if (button) {
      button.disabled = false;
      button.textContent = "Approve Payment";
    }
  }
}

/* ==========================================
   REJECT PAYMENT
========================================== */

async function rejectPayment(paymentId, button) {
  if (!paymentId) {
    alert("Payment ID is missing.");

    return;
  }

  if (!confirm("Reject this payment?")) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Rejecting...";
  }

  try {
    /*
           Backend:

           POST
           /admin/payments/{payment_id}/reject
        */

    const response = await adminPost(`/admin/payments/${paymentId}/reject`, {});

    alert(response?.message || "Payment rejected.");

    await loadAdminPayments();

    await updateDashboardStats();
  } catch (error) {
    console.error("Payment rejection error:", error);

    alert(error.message || "Unable to reject payment.");

    if (button) {
      button.disabled = false;
      button.textContent = "Reject Payment";
    }
  }
}

/* ==========================================
   LOAD PENDING SONGS
========================================== */

async function loadAdminSongs() {
  const container = document.getElementById("songsContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "<p>Loading songs...</p>";

  try {
    /*
           Backend:

           GET /admin/songs/pending
        */

    const response = await adminGet("/admin/songs/pending");

    let songs = [];

    if (response && Array.isArray(response.songs)) {
      songs = response.songs;
    } else if (Array.isArray(response)) {
      songs = response;
    }

    container.innerHTML = "";

    if (!songs.length) {
      container.innerHTML = `
                <div class="admin-card">
                    <h3>No Pending Songs</h3>

                    <p>
                        There are currently no
                        songs waiting for approval.
                    </p>
                </div>
            `;

      return;
    }

    songs.forEach((song) => {
      const card = document.createElement("div");

      card.className = "admin-card";

      const songId = song.id || song.song_id || "";

      card.innerHTML = `
                <h3>
                    ${escapeHTML(song.title || "Untitled")}
                </h3>

                <p>
                    Artist:
                    <strong>
                        ${escapeHTML(
                          song.artist_name || song.artist_id || "Unknown",
                        )}
                    </strong>
                </p>

                <p>
                    Status:
                    <strong>
                        ${escapeHTML(song.status || "pending")}
                    </strong>
                </p>

                <p>
                    Song ID:
                    ${escapeHTML(songId || "N/A")}
                </p>

                ${
                  song.description
                    ? `
                            <p>
                                Description:
                                ${escapeHTML(song.description)}
                            </p>
                        `
                    : ""
                }

                ${
                  song.cover_image
                    ? `
                            <p>
                                <a
                                    href="${escapeHTML(song.cover_image)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View Cover
                                </a>
                            </p>
                        `
                    : ""
                }

                ${
                  song.audio_file
                    ? `
                            <p>
                                <a
                                    href="${escapeHTML(song.audio_file)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open Audio
                                </a>
                            </p>
                        `
                    : ""
                }

                <div
                    class="admin-action-buttons"
                >

                    <button
                        type="button"
                        class="approve-song-btn"
                        data-song-id="${escapeHTML(songId)}"
                    >
                        Approve Song
                    </button>

                    <button
                        type="button"
                        class="reject-song-btn"
                        data-song-id="${escapeHTML(songId)}"
                    >
                        Reject Song
                    </button>

                </div>
            `;

      container.appendChild(card);
    });

    connectSongButtons();
  } catch (error) {
    console.error("Song loading error:", error);

    container.innerHTML = `
            <div class="admin-card">
                <p>
                    Unable to load songs.
                </p>
            </div>
        `;
  }
}

/* ==========================================
   CONNECT SONG BUTTONS
========================================== */

function connectSongButtons() {
  const approveButtons = document.querySelectorAll(".approve-song-btn");

  approveButtons.forEach((button) => {
    button.addEventListener("click", function () {
      approveSong(this.dataset.songId, this);
    });
  });

  const rejectButtons = document.querySelectorAll(".reject-song-btn");

  rejectButtons.forEach((button) => {
    button.addEventListener("click", function () {
      rejectSong(this.dataset.songId, this);
    });
  });
}

/* ==========================================
   APPROVE SONG
========================================== */

async function approveSong(songId, button) {
  if (!songId) {
    alert("Song ID is missing.");

    return;
  }

  if (!confirm("Approve this song?")) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Approving...";
  }

  try {
    const response = await adminPost(`/admin/songs/${songId}/approve`, {});

    alert(response?.message || "Song approved successfully.");

    await loadAdminSongs();

    await updateDashboardStats();
  } catch (error) {
    console.error("Song approval error:", error);

    alert(error.message || "Unable to approve song.");

    if (button) {
      button.disabled = false;
      button.textContent = "Approve Song";
    }
  }
}

/* ==========================================
   REJECT SONG
========================================== */

async function rejectSong(songId, button) {
  if (!songId) {
    alert("Song ID is missing.");

    return;
  }

  if (!confirm("Reject this song?")) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Rejecting...";
  }

  try {
    const response = await adminPost(`/admin/songs/${songId}/reject`, {});

    alert(response?.message || "Song rejected.");

    await loadAdminSongs();

    await updateDashboardStats();
  } catch (error) {
    console.error("Song rejection error:", error);

    alert(error.message || "Unable to reject song.");

    if (button) {
      button.disabled = false;
      button.textContent = "Reject Song";
    }
  }
}

/* ==========================================
   LOAD PENDING ARTISTS
========================================== */

async function loadAdminArtists() {
  const container = document.getElementById("artistsContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "<p>Loading artists...</p>";

  try {
    /*
           Backend:

           GET /admin/artists/pending
        */

    const response = await adminGet("/admin/artists/pending");

    let artists = [];

    if (response && Array.isArray(response.artists)) {
      artists = response.artists;
    } else if (Array.isArray(response)) {
      artists = response;
    }

    container.innerHTML = "";

    setAdminStat("pendingArtistCount", artists.length);

    if (!artists.length) {
      container.innerHTML = `
                <div class="admin-card">
                    <h3>
                        No Pending Artists
                    </h3>

                    <p>
                        There are currently no
                        artist applications waiting
                        for approval.
                    </p>
                </div>
            `;

      return;
    }

    artists.forEach((artist) => {
      const card = document.createElement("div");

      card.className = "admin-card";

      const artistId = artist.id || "";

      card.innerHTML = `
                <h3>
                    ${escapeHTML(
                      artist.artist_name ||
                        artist.full_name ||
                        "Unknown Artist",
                    )}
                </h3>

                <p>
                    Name:
                    <strong>
                        ${escapeHTML(artist.full_name || "Not provided")}
                    </strong>
                </p>

                <p>
                    Email:
                    ${escapeHTML(artist.email || "Not provided")}
                </p>

                <p>
                    Status:
                    <span
                        class="artist-status pending"
                    >
                        ${escapeHTML(artist.status || "pending")}
                    </span>
                </p>

                <p>
                    Artist ID:
                    ${escapeHTML(artistId || "N/A")}
                </p>

                ${
                  artist.bio
                    ? `
                            <p>
                                Bio:
                                ${escapeHTML(artist.bio)}
                            </p>
                        `
                    : ""
                }

                <div
                    class="artist-action-buttons"
                >

                    <button
                        type="button"
                        class="approve-artist-btn"
                        data-artist-id="${escapeHTML(artistId)}"
                    >
                        Approve Artist
                    </button>

                    <button
                        type="button"
                        class="reject-artist-btn"
                        data-artist-id="${escapeHTML(artistId)}"
                    >
                        Reject Artist
                    </button>

                </div>
            `;

      container.appendChild(card);
    });

    connectArtistButtons();
  } catch (error) {
    console.error("Artist loading error:", error);

    container.innerHTML = `
            <div class="admin-card">
                <p>
                    Unable to load artists.
                </p>
            </div>
        `;
  }
}

/* ==========================================
   CONNECT ARTIST BUTTONS
========================================== */

function connectArtistButtons() {
  const approveButtons = document.querySelectorAll(".approve-artist-btn");

  approveButtons.forEach((button) => {
    button.addEventListener("click", function () {
      approveArtist(this.dataset.artistId, this);
    });
  });

  const rejectButtons = document.querySelectorAll(".reject-artist-btn");

  rejectButtons.forEach((button) => {
    button.addEventListener("click", function () {
      rejectArtist(this.dataset.artistId, this);
    });
  });
}

/* ==========================================
   APPROVE ARTIST
========================================== */

async function approveArtist(artistId, button) {
  if (!artistId) {
    alert("Artist ID is missing.");

    return;
  }

  if (!confirm("Approve this artist?")) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Approving...";
  }

  try {
    const response = await adminPost(`/admin/artists/${artistId}/approve`, {});

    alert(response?.message || "Artist approved successfully.");

    await loadAdminArtists();

    await updateDashboardStats();
  } catch (error) {
    console.error("Artist approval error:", error);

    alert(error.message || "Unable to approve artist.");

    if (button) {
      button.disabled = false;
      button.textContent = "Approve Artist";
    }
  }
}

/* ==========================================
   REJECT ARTIST
========================================== */

async function rejectArtist(artistId, button) {
  if (!artistId) {
    alert("Artist ID is missing.");

    return;
  }

  if (!confirm("Reject this artist?")) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Rejecting...";
  }

  try {
    const response = await adminPost(`/admin/artists/${artistId}/reject`, {});

    alert(response?.message || "Artist rejected.");

    await loadAdminArtists();

    await updateDashboardStats();
  } catch (error) {
    console.error("Artist rejection error:", error);

    alert(error.message || "Unable to reject artist.");

    if (button) {
      button.disabled = false;
      button.textContent = "Reject Artist";
    }
  }
}

/* ==========================================
   LOAD PENDING WITHDRAWALS
========================================== */

async function loadAdminWithdrawals() {
  const container = document.getElementById("withdrawalsContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "<p>Loading withdrawals...</p>";

  try {
    /*
           Backend:

           GET /admin/withdrawals/pending
        */

    const response = await adminGet("/admin/withdrawals/pending");

    let withdrawals = [];

    if (response && Array.isArray(response.withdrawals)) {
      withdrawals = response.withdrawals;
    } else if (Array.isArray(response)) {
      withdrawals = response;
    }

    container.innerHTML = "";

    if (!withdrawals.length) {
      container.innerHTML = `
                <div class="admin-card">

                    <h3>
                        No Pending Withdrawals
                    </h3>

                    <p>
                        There are currently no
                        withdrawal requests waiting
                        for approval.
                    </p>

                </div>
            `;

      return;
    }

    withdrawals.forEach((withdrawal) => {
      const card = document.createElement("div");

      card.className = "admin-card";

      const withdrawalId = withdrawal.id || "";

      const amount = Number(withdrawal.amount || 0);

      card.innerHTML = `
                    <h3>
                        Withdrawal Request
                    </h3>

                    <p>
                        Amount:
                        <strong>
                            ${amount} LD
                        </strong>
                    </p>

                    <p>
                        Status:
                        <strong>
                            ${escapeHTML(withdrawal.status || "pending")}
                        </strong>
                    </p>

                    <p>
                        User:
                        ${escapeHTML(withdrawal.user_id || "Unknown")}
                    </p>

                    <p>
                        Request ID:
                        ${escapeHTML(withdrawalId || "N/A")}
                    </p>

                    ${
                      withdrawal.payment_method
                        ? `
                                <p>
                                    Payment method:
                                    ${escapeHTML(withdrawal.payment_method)}
                                </p>
                            `
                        : ""
                    }

                    <div
                        class="admin-action-buttons"
                    >

                        <button
                            type="button"
                            class="approve-withdrawal-btn"
                            data-withdrawal-id="${escapeHTML(withdrawalId)}"
                        >
                            Approve Withdrawal
                        </button>

                        <button
                            type="button"
                            class="reject-withdrawal-btn"
                            data-withdrawal-id="${escapeHTML(withdrawalId)}"
                        >
                            Reject Withdrawal
                        </button>

                    </div>
                `;

      container.appendChild(card);
    });

    connectWithdrawalButtons();
  } catch (error) {
    console.error("Withdrawal loading error:", error);

    container.innerHTML = `
            <div class="admin-card">
                <p>
                    Unable to load withdrawals.
                </p>
            </div>
        `;
  }
}

/* ==========================================
   CONNECT WITHDRAWAL BUTTONS
========================================== */

function connectWithdrawalButtons() {
  const approveButtons = document.querySelectorAll(".approve-withdrawal-btn");

  approveButtons.forEach((button) => {
    button.addEventListener("click", function () {
      approveWithdrawal(this.dataset.withdrawalId, this);
    });
  });

  const rejectButtons = document.querySelectorAll(".reject-withdrawal-btn");

  rejectButtons.forEach((button) => {
    button.addEventListener("click", function () {
      rejectWithdrawal(this.dataset.withdrawalId, this);
    });
  });
}

/* ==========================================
   APPROVE WITHDRAWAL
========================================== */

async function approveWithdrawal(withdrawalId, button) {
  if (!withdrawalId) {
    alert("Withdrawal ID is missing.");

    return;
  }

  if (!confirm("Approve this withdrawal?")) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Approving...";
  }

  try {
    const response = await adminPost(
      `/admin/withdrawals/${withdrawalId}/approve`,
      {},
    );

    alert(response?.message || "Withdrawal approved.");

    await loadAdminWithdrawals();

    await updateDashboardStats();
  } catch (error) {
    console.error("Withdrawal approval error:", error);

    alert(error.message || "Unable to approve withdrawal.");

    if (button) {
      button.disabled = false;
      button.textContent = "Approve Withdrawal";
    }
  }
}

/* ==========================================
   REJECT WITHDRAWAL
========================================== */

async function rejectWithdrawal(withdrawalId, button) {
  if (!withdrawalId) {
    alert("Withdrawal ID is missing.");

    return;
  }

  if (!confirm("Reject this withdrawal?")) {
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Rejecting...";
  }

  try {
    const response = await adminPost(
      `/admin/withdrawals/${withdrawalId}/reject`,
      {},
    );

    alert(response?.message || "Withdrawal rejected.");

    await loadAdminWithdrawals();

    await updateDashboardStats();
  } catch (error) {
    console.error("Withdrawal rejection error:", error);

    alert(error.message || "Unable to reject withdrawal.");

    if (button) {
      button.disabled = false;
      button.textContent = "Reject Withdrawal";
    }
  }
}

/* ==========================================
   DASHBOARD STATISTICS
========================================== */

async function updateDashboardStats() {
  try {
    console.log("Loading KOLO MUSIC admin analytics...");

    const analytics = await adminGet("/admin/analytics");

    console.log("Admin analytics response:", analytics);

    if (!analytics) {
      console.error("No analytics response received.");
      return;
    }

    /* ==========================================
           TOTAL USERS
        ========================================== */

    setAdminStat("totalUsers", analytics.total_users ?? 0);

    /* ==========================================
           APPROVED PAYMENTS
        ========================================== */

    setAdminStat("totalPayments", analytics.sales ?? 0);

    /* ==========================================
           PENDING PAYMENTS
        ========================================== */

    setAdminStat("pendingPayments", analytics.pending_payments ?? 0);

    /* ==========================================
           TOTAL REVENUE
        ========================================== */

    setAdminStat("totalRevenue", `${analytics.revenue ?? 0} LD`);

    /* ==========================================
           KOLO PLATFORM REVENUE
        ========================================== */

    setAdminStat("platformRevenue", `${analytics.platform_revenue ?? 0} LD`);

    /* ==========================================
           ARTIST STATISTICS
        ========================================== */

    setAdminStat("pendingArtistCount", analytics.pending_artists ?? 0);

    setAdminStat("approvedArtistCount", analytics.approved_artists ?? 0);

    setAdminStat("rejectedArtistCount", analytics.rejected_artists ?? 0);

    /* ==========================================
           SONG STATISTICS
        ========================================== */

    setAdminStat("totalSongs", analytics.songs ?? 0);

    setAdminStat("approvedSongCount", analytics.approved_songs ?? 0);

    setAdminStat("pendingSongCount", analytics.pending_songs ?? 0);

    /* ==========================================
           WITHDRAWAL STATISTICS
        ========================================== */

    setAdminStat("pendingWithdrawalCount", analytics.pending_withdrawals ?? 0);

    /* ==========================================
           REJECTED PAYMENTS
        ========================================== */

    setAdminStat("rejectedPaymentCount", analytics.rejected_payments ?? 0);

    console.log("Admin dashboard statistics updated.");
  } catch (error) {
    console.error("Statistics error:", error);
  }
}

/* ==========================================
   SET ADMIN STAT
========================================== */

function setAdminStat(elementId, value) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = value;
}

/* ==========================================
   REFRESH DASHBOARD
========================================== */

async function refreshAdminDashboard() {
  const button = document.getElementById("refreshDashboardButton");

  if (button) {
    button.disabled = true;

    button.textContent = "Refreshing...";
  }

  try {
    await loadAdminDashboard();
  } finally {
    if (button) {
      button.disabled = false;

      button.textContent = "Refresh";
    }
  }
}

/* ==========================================
   CONNECT ADMIN BUTTONS
========================================== */

function connectAdminButtons() {
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", adminLogout);
  }

  const refreshButton = document.getElementById("refreshDashboardButton");

  if (refreshButton) {
    refreshButton.addEventListener("click", refreshAdminDashboard);
  }
}

/* ==========================================
   ESCAPE HTML
========================================== */

/*
    Protects database text from being
    interpreted as HTML.
*/

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");
}

/* ==========================================
   ADMIN DASHBOARD START
========================================== */

document.addEventListener("DOMContentLoaded", function () {
  console.log("KOLO MUSIC Admin Dashboard starting...");

  if (!checkAdminAccess()) {
    return;
  }

  connectAdminButtons();

  loadAdminDashboard();
});
