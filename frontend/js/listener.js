/* =========================================================
   KOLO MUSIC - LISTENER DASHBOARD
   =========================================================

   Responsibilities:

   - Listener session
   - Listener library
   - Discover approved music
   - KOLO SCREAM payment
   - Payment proof upload
   - One-time protected playback
   - Logout
   - Payment modal management

   ========================================================= */

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let selectedScreamSong = null;
let currentPaymentId = null;

/* =========================================================
   KOLO SCREAM SETTINGS
   ========================================================= */

const SCREAM_PRICE = 50;

/* =========================================================
   GET CURRENT USER
   ========================================================= */

function getListenerUser() {
  const savedUser = localStorage.getItem("koloUser");

  if (!savedUser) {
    return null;
  }

  try {
    const user = JSON.parse(savedUser);

    if (!user || !user.id) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Invalid KOLO user session:", error);

    localStorage.removeItem("koloUser");

    return null;
  }
}

/* =========================================================
   CHECK LISTENER LOGIN
   ========================================================= */

function checkListenerLogin() {
  const user = getListenerUser();

  if (!user) {
    return null;
  }

  return user;
}

/* =========================================================
   UPDATE WELCOME MESSAGE
   ========================================================= */

function updateWelcomeMessage(user) {
  const welcomeMessage = document.getElementById("welcomeMessage");

  if (!welcomeMessage || !user) {
    return;
  }

  welcomeMessage.textContent = `Welcome, ${user.full_name || "Listener"}`;
}

/* =========================================================
   API BASE URL
   ========================================================= */

function getAPIBaseURL() {
  if (typeof KOLO_API !== "undefined" && KOLO_API.baseURL) {
    return KOLO_API.baseURL;
  }

  return "http://127.0.0.1:8000";
}

/* =========================================================
   GO TO DISCOVER MUSIC
   ========================================================= */

function goToDiscoverMusic() {
  const discoverContainer = document.getElementById("discoverMusicContainer");

  if (discoverContainer) {
    discoverContainer.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    return;
  }

  window.location.href = "listener.html#discover";
}

/* =========================================================
   GO TO MARKETPLACE
   ========================================================= */

function goToMarketplace() {
  goToDiscoverMusic();
}

/* =========================================================
   LOAD LISTENER LIBRARY
   =========================================================

   Library contains purchased songs only.

   ========================================================= */

async function loadListenerLibrary() {
  const user = checkListenerLogin();

  if (!user) {
    return;
  }

  const libraryMessage = document.getElementById("libraryMessage");

  const container = document.getElementById("libraryContainer");

  const purchasedCount = document.getElementById("purchasedCount");

  const availableCount = document.getElementById("availableCount");

  updateWelcomeMessage(user);

  if (libraryMessage) {
    libraryMessage.textContent = "Loading your music...";
  }

  try {
    if (typeof KOLO_API === "undefined" || typeof KOLO_API.get !== "function") {
      throw new Error("KOLO API is not available.");
    }

    const response = await KOLO_API.get(`/stream/library/${user.id}`);

    const songs = Array.isArray(response?.songs) ? response.songs : [];

    console.log("LISTENER LIBRARY:", songs);

    if (purchasedCount) {
      purchasedCount.textContent = songs.length;
    }

    const availableSongs = songs.filter((song) => song.used !== true);

    if (availableCount) {
      availableCount.textContent = availableSongs.length;
    }

    /* =================================================
       EMPTY LIBRARY
       ================================================= */

    if (songs.length === 0) {
      if (libraryMessage) {
        libraryMessage.textContent = "Your music library is empty.";
      }

      if (container) {
        container.innerHTML = `
          <div class="music-card">
            <div class="music-info">

              <h3>Your library is empty</h3>

              <p>
                Purchase a KOLO SCREAM
                to unlock a song.
              </p>

              <button
                type="button"
                class="primary-btn"
                id="discoverMusicButton"
              >
                Discover Music
              </button>

            </div>
          </div>
        `;

        const discoverButton = document.getElementById("discoverMusicButton");

        if (discoverButton) {
          discoverButton.addEventListener("click", goToDiscoverMusic);
        }
      }

      return;
    }

    if (libraryMessage) {
      libraryMessage.textContent = `${songs.length} song(s) in your library.`;
    }

    if (container) {
      container.innerHTML = "";
    }

    /* =================================================
       CREATE LIBRARY SONG CARDS
       ================================================= */

    songs.forEach((song) => {
      if (!container) {
        return;
      }

      const card = document.createElement("div");

      card.className = "music-card";

      /* COVER */

      const cover = document.createElement("img");

      cover.src = song.cover_image || "";

      cover.alt = song.title || "KOLO MUSIC";

      cover.loading = "lazy";

      /* INFO */

      const info = document.createElement("div");

      info.className = "music-info";

      /* TITLE */

      const title = document.createElement("h3");

      title.textContent = song.title || "Untitled";

      /* ARTIST */

      const artist = document.createElement("p");

      artist.textContent = song.artist_name || "Unknown Artist";

      /* STATUS */

      const status = document.createElement("p");

      status.className = "song-status";

      /* PLAY BUTTON */

      const playButton = document.createElement("button");

      playButton.type = "button";

      playButton.className = "play-song-btn";

      /* =================================================
         USED ACCESS
         ================================================= */

      if (song.used === true) {
        status.textContent = "Already played";

        playButton.textContent = "Already Played";

        playButton.disabled = true;

        playButton.classList.add("disabled");
      } else {
        /* =================================================
           AVAILABLE PURCHASED ACCESS
           ================================================= */

        status.textContent = "Scream available";

        playButton.textContent = "Listen Now";

        playButton.addEventListener("click", () => {
          playPurchasedSong(song);
        });
      }

      /* BUILD CARD */

      info.appendChild(title);
      info.appendChild(artist);
      info.appendChild(status);
      info.appendChild(playButton);

      card.appendChild(cover);
      card.appendChild(info);

      container.appendChild(card);
    });
  } catch (error) {
    console.error("Listener library error:", error);

    if (libraryMessage) {
      libraryMessage.textContent = "Unable to load your music.";
    }

    if (container) {
      container.innerHTML = `
        <div class="music-card">
          <div class="music-info">

            <h3>
              Music could not be loaded
            </h3>

            <p>
              Please refresh the page
              and try again.
            </p>

          </div>
        </div>
      `;
    }
  }
}

/* =========================================================
   PLAY PURCHASED SONG
   ========================================================= */

async function playPurchasedSong(song) {
  const user = checkListenerLogin();

  if (!user) {
    alert("Please login first.");
    return;
  }

  if (!song || !song.song_id) {
    alert("Song information is missing.");
    return;
  }

  const audioPlayer = document.getElementById("audioPlayer");

  if (!audioPlayer) {
    alert("Audio player not found.");
    return;
  }

  const playerTitle = document.getElementById("playerTitle");

  const playerArtist = document.getElementById("playerArtist");

  try {
    const baseURL = getAPIBaseURL();

    const streamURL = `${baseURL}/api/stream/${user.id}/${song.song_id}`;

    console.log("PROTECTED STREAM:", streamURL);

    audioPlayer.src = streamURL;

    if (playerTitle) {
      playerTitle.textContent = song.title || "KOLO MUSIC";
    }

    if (playerArtist) {
      playerArtist.textContent = song.artist_name || "Unknown Artist";
    }

    await audioPlayer.play();

    if (playerArtist) {
      playerArtist.textContent = `${song.artist_name || "Artist"} | KOLO SCREAM`;
    }

    setTimeout(() => {
      loadListenerLibrary();
    }, 500);
  } catch (error) {
    console.error("Protected stream error:", error);

    if (error && error.name === "NotAllowedError") {
      alert("Click the play button again to start the song.");

      return;
    }

    alert(
      "Unable to play this song. " +
        "Your listening access may already be used " +
        "or the payment may not have been approved yet.",
    );
  }
}

/* =========================================================
   LOAD DISCOVER MUSIC
   =========================================================

   Discover contains all approved songs.

   Clicking Scream & Listen opens
   the payment modal.

   ========================================================= */

async function loadDiscoverMusic() {
  const container = document.getElementById("discoverMusicContainer");

  const message = document.getElementById("discoverMusicMessage");

  if (!container) {
    console.error("Discover music container not found.");

    return;
  }

  if (message) {
    message.textContent = "Loading KOLO MUSIC...";
  }

  try {
    if (typeof KOLO_API === "undefined" || typeof KOLO_API.get !== "function") {
      throw new Error("KOLO API is not available.");
    }

    const response = await KOLO_API.get("/songs/discover");

    const songs = Array.isArray(response?.songs) ? response.songs : [];

    console.log("DISCOVER MUSIC:", songs);

    /* =================================================
       EMPTY DISCOVER
       ================================================= */

    if (songs.length === 0) {
      container.innerHTML = `
        <div class="music-card">
          <div class="music-info">

            <h3>
              No music available yet
            </h3>

            <p>
              Approved KOLO MUSIC songs
              will appear here.
            </p>

          </div>
        </div>
      `;

      if (message) {
        message.textContent = "No approved music available.";
      }

      return;
    }

    container.innerHTML = "";

    /* =================================================
       DISPLAY SONGS
       ================================================= */

    songs.forEach((song) => {
      const card = document.createElement("div");

      card.className = "music-card discover-song-card";

      /* COVER */

      const cover = document.createElement("img");

      cover.className = "discover-song-cover";

      cover.src = song.cover_image || "";

      cover.alt = song.title || "KOLO MUSIC Song";

      cover.loading = "lazy";

      /* INFO */

      const info = document.createElement("div");

      info.className = "music-info";

      /* TITLE */

      const title = document.createElement("h3");

      title.textContent = song.title || "Untitled";

      /* ARTIST */

      const artist = document.createElement("p");

      artist.textContent = song.artist_name || "Unknown Artist";

      /* DESCRIPTION */

      const description = document.createElement("p");

      description.className = "song-description";

      description.textContent = song.description || "KOLO MUSIC";

      /* PRICE */

      const status = document.createElement("p");

      status.className = "song-status";

      status.textContent = `${SCREAM_PRICE} LD | KOLO SCREAM`;

      /* LISTEN BUTTON */

      const listenButton = document.createElement("button");

      listenButton.type = "button";

      listenButton.className = "play-song-btn";

      listenButton.textContent = "Scream & Listen";

      listenButton.addEventListener("click", () => {
        prepareSong({
          song_id: song.song_id,
          title: song.title,
          artist_name: song.artist_name,
          cover_image: song.cover_image,
          description: song.description,
        });
      });

      /* BUILD CARD */

      info.appendChild(title);
      info.appendChild(artist);
      info.appendChild(description);
      info.appendChild(status);
      info.appendChild(listenButton);

      card.appendChild(cover);
      card.appendChild(info);

      container.appendChild(card);
    });

    if (message) {
      message.textContent = `${songs.length} approved song(s) available.`;
    }
  } catch (error) {
    console.error("Discover music error:", error);

    if (message) {
      message.textContent = "Unable to load KOLO MUSIC.";
    }

    container.innerHTML = `
      <div class="music-card">
        <div class="music-info">

          <h3>
            Music could not be loaded
          </h3>

          <p>
            Please refresh the page
            and try again.
          </p>

        </div>
      </div>
    `;
  }
}

/* =========================================================
   PREPARE SCREAM SONG
   ========================================================= */

function prepareSong(song) {
  if (!song || !song.song_id) {
    alert("Song information is missing.");
    return;
  }

  selectedScreamSong = song;

  currentPaymentId = null;

  const modal = document.getElementById("screamModal");

  const title = document.getElementById("paymentSongTitle");

  const artist = document.getElementById("paymentArtistName");

  const senderName = document.getElementById("senderName");

  const senderNumber = document.getElementById("senderNumber");

  const paymentMethod = document.getElementById("paymentMethod");

  const paymentProof = document.getElementById("paymentProof");

  const message = document.getElementById("paymentMessage");

  if (title) {
    title.textContent = song.title || "Selected Song";
  }

  if (artist) {
    artist.textContent = song.artist_name || "Unknown Artist";
  }

  if (senderName) {
    senderName.value = "";
  }

  if (senderNumber) {
    senderNumber.value = "";
  }

  if (paymentMethod) {
    paymentMethod.value = "";
  }

  if (paymentProof) {
    paymentProof.value = "";
  }

  if (message) {
    message.textContent = `KOLO SCREAM: ${SCREAM_PRICE} LD`;

    message.style.color = "";
  }

  if (modal) {
    modal.style.display = "flex";
  }
}

/* =========================================================
   CLOSE SCREAM MODAL
   ========================================================= */

function closeScreamModal() {
  const modal = document.getElementById("screamModal");

  if (modal) {
    modal.style.display = "none";
  }

  selectedScreamSong = null;

  currentPaymentId = null;
}

/* =========================================================
   CREATE SCREAM PAYMENT
   ========================================================= */

async function createScreamPayment() {
  const user = checkListenerLogin();

  if (!user) {
    alert("Please login before creating a Scream.");

    window.location.href = "login.html";

    return;
  }

  if (!selectedScreamSong) {
    alert("Please select a song first.");

    return;
  }

  const senderName = document.getElementById("senderName");

  const senderNumber = document.getElementById("senderNumber");

  const paymentMethod = document.getElementById("paymentMethod");

  const paymentProof = document.getElementById("paymentProof");

  const message = document.getElementById("paymentMessage");

  const submitButton = document.getElementById("submitScreamPayment");

  if (
    !senderName ||
    !senderNumber ||
    !paymentMethod ||
    !paymentProof ||
    !message ||
    !submitButton
  ) {
    console.error("Scream payment form is incomplete.");

    return;
  }

  /* =================================================
     SENDER NAME
     ================================================= */

  const senderNameValue = senderName.value.trim();

  if (!senderNameValue) {
    message.textContent = "Please enter the name used for the payment.";

    return;
  }

  if (senderNameValue.length < 2) {
    message.textContent = "Please enter a valid sender name.";

    return;
  }

  /* =================================================
     MOBILE MONEY NUMBER
     ================================================= */

  const senderNumberValue = senderNumber.value.trim();

  if (!senderNumberValue) {
    message.textContent = "Please enter your Mobile Money number.";

    return;
  }

  if (senderNumberValue.length < 7) {
    message.textContent = "Please enter a valid Mobile Money number.";

    return;
  }

  /* =================================================
     PAYMENT METHOD
     ================================================= */

  if (!paymentMethod.value) {
    message.textContent = "Please select a payment method.";

    return;
  }

  /* =================================================
     PAYMENT PROOF
     ================================================= */

  if (!paymentProof.files || paymentProof.files.length === 0) {
    message.textContent = "Please upload your payment proof.";

    return;
  }

  const proofFile = paymentProof.files[0];

  /* =================================================
     FILE TYPE
     ================================================= */

  if (!proofFile.type.startsWith("image/")) {
    message.textContent = "Payment proof must be an image.";

    return;
  }

  /* =================================================
     FILE SIZE
     ================================================= */

  const maxFileSize = 5 * 1024 * 1024;

  if (proofFile.size > maxFileSize) {
    message.textContent = "Payment proof must be smaller than 5 MB.";

    return;
  }

  /* =================================================
     DISABLE BUTTON
     ================================================= */

  submitButton.disabled = true;

  submitButton.textContent = "Submitting...";

  try {
    /* =================================================
       CHECK API
       ================================================= */

    if (
      typeof KOLO_API === "undefined" ||
      typeof KOLO_API.post !== "function"
    ) {
      throw new Error("KOLO API is not available.");
    }

    /* =================================================
       STEP 1 - CREATE PAYMENT
       ================================================= */

    message.textContent = "Creating payment request...";

    const paymentResponse = await KOLO_API.post("/payments/create", {
      user_id: user.id,

      song_id: selectedScreamSong.song_id,

      amount: SCREAM_PRICE,

      payment_method: paymentMethod.value,

      sender_name: senderNameValue,

      sender_number: senderNumberValue,
    });

    if (!paymentResponse || !paymentResponse.payment) {
      throw new Error("Payment request was not created.");
    }

    const payment = Array.isArray(paymentResponse.payment)
      ? paymentResponse.payment[0]
      : paymentResponse.payment;

    if (!payment || !payment.id) {
      throw new Error("Payment ID was not returned.");
    }

    currentPaymentId = payment.id;

    console.log("PAYMENT CREATED:", payment);

    /* =================================================
       STEP 2 - UPLOAD PAYMENT PROOF
       ================================================= */

    message.textContent = "Uploading payment proof...";

    const formData = new FormData();

    formData.append("payment_id", currentPaymentId);

    formData.append("proof", proofFile);

    const baseURL = getAPIBaseURL();

    const uploadResponse = await fetch(`${baseURL}/api/payments/upload-proof`, {
      method: "POST",
      body: formData,
    });

    let uploadData = null;

    try {
      uploadData = await uploadResponse.json();
    } catch (error) {
      uploadData = null;
    }

    if (!uploadResponse.ok) {
      throw new Error(uploadData?.detail || "Payment proof upload failed.");
    }

    console.log("PAYMENT PROOF UPLOADED:", uploadData);

    /* =================================================
       SUCCESS
       ================================================= */

    message.textContent =
      "Payment submitted successfully. Please wait for admin approval.";

    message.style.color = "green";

    submitButton.textContent = "Submitted";

    /* =================================================
       CLOSE MODAL AFTER DELAY
       ================================================= */

    setTimeout(() => {
      closeScreamModal();

      submitButton.disabled = false;

      submitButton.textContent = "Submit Payment";
    }, 2000);
  } catch (error) {
    console.error("Scream payment error:", error);

    message.textContent = error?.message || "Unable to submit payment.";

    message.style.color = "red";

    submitButton.disabled = false;

    submitButton.textContent = "Submit Payment";
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

function listenerLogout() {
  localStorage.removeItem("koloUser");

  localStorage.removeItem("koloRole");

  localStorage.removeItem("koloToken");

  window.location.href = "index.html";
}

/* =========================================================
   SETUP SCREAM MODAL
   ========================================================= */

function setupScreamModal() {
  const modal = document.getElementById("screamModal");

  const closeButton = document.getElementById("closeScreamModal");

  const submitButton = document.getElementById("submitScreamPayment");

  /* CLOSE BUTTON */

  if (closeButton) {
    closeButton.addEventListener("click", closeScreamModal);
  }

  /* SUBMIT PAYMENT */

  if (submitButton) {
    submitButton.addEventListener("click", createScreamPayment);
  }

  /* CLICK OUTSIDE */

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeScreamModal();
      }
    });
  }

  /* ESCAPE KEY */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeScreamModal();
    }
  });
}

/* =========================================================
   LISTENER DASHBOARD STARTUP
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  console.log("KOLO listener dashboard starting...");

  const user = checkListenerLogin();

  /* WELCOME */

  if (user) {
    updateWelcomeMessage(user);
  }

  /* LOGOUT */

  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", listenerLogout);
  }

  /* PAYMENT MODAL */

  setupScreamModal();

  /* LOAD LISTENER DATA */

  if (user) {
    loadListenerLibrary();

    loadDiscoverMusic();
  }
});
