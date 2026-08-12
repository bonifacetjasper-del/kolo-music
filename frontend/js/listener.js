/* =========================================================
   KOLO MUSIC — LISTENER DASHBOARD
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

   IMPORTANT:

   LIBRARY:
   Purchased songs only.

   DISCOVER:
   All approved songs.

   PURCHASED SONG:
   Uses:
       GET /stream/{user_id}/{song_id}

   PAYMENT:
       POST /payments/create
       POST /payments/upload-proof

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
   =========================================================

   IMPORTANT:

   We DO NOT send listeners to:

       index.html#songs

   because your index page may contain artist registration
   or artist onboarding.

   Instead, we keep the listener inside listener.html.

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
   =========================================================

   Kept for compatibility with older HTML.

   ========================================================= */

function goToMarketplace() {
  goToDiscoverMusic();
}

/* =========================================================
   LOAD LISTENER LIBRARY
   =========================================================

   Library contains PURCHASED songs only.

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
    /* =================================================
           CHECK API
           ================================================= */

    if (typeof KOLO_API === "undefined" || typeof KOLO_API.get !== "function") {
      throw new Error("KOLO API is not available.");
    }

    /* =================================================
           REQUEST LIBRARY
           ================================================= */

    const response = await KOLO_API.get(`/stream/library/${user.id}`);

    const songs = Array.isArray(response?.songs) ? response.songs : [];

    console.log("LISTENER LIBRARY:", songs);

    /* =================================================
           PURCHASED COUNT
           ================================================= */

    if (purchasedCount) {
      purchasedCount.textContent = songs.length;
    }

    /* =================================================
           AVAILABLE SCREAMS
           ================================================= */

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

                            <h3>
                                Your library is empty
                            </h3>

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

    /* =================================================
           LIBRARY MESSAGE
           ================================================= */

    if (libraryMessage) {
      libraryMessage.textContent = `${songs.length} song(s) in your library.`;
    }

    /* =================================================
           CLEAR OLD CONTENT
           ================================================= */

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

      /* =================================================
               COVER
               ================================================= */

      const cover = document.createElement("img");

      cover.src = song.cover_image || "";

      cover.alt = song.title || "KOLO MUSIC";

      cover.loading = "lazy";

      /* =================================================
               INFO
               ================================================= */

      const info = document.createElement("div");

      info.className = "music-info";

      /* =================================================
               TITLE
               ================================================= */

      const title = document.createElement("h3");

      title.textContent = song.title || "Untitled";

      /* =================================================
               ARTIST
               ================================================= */

      const artist = document.createElement("p");

      artist.textContent = song.artist_name || "Unknown Artist";

      /* =================================================
               STATUS
               ================================================= */

      const status = document.createElement("p");

      status.className = "song-status";

      /* =================================================
               PLAY BUTTON
               ================================================= */

      const playButton = document.createElement("button");

      playButton.type = "button";

      playButton.className = "play-song-btn";

      /* =================================================
               USED ACCESS
               ================================================= */

      if (song.used === true) {
        status.textContent = "✓ Already played";

        playButton.textContent = "Already Played";

        playButton.disabled = true;

        playButton.classList.add("disabled");
      } else {

      /* =================================================
               AVAILABLE PURCHASED ACCESS
               ================================================= */
        status.textContent = "🔥 Scream available";

        playButton.textContent = "🎵 Listen Now";

        /*
                    IMPORTANT:

                    This song is ALREADY PURCHASED.

                    DO NOT call prepareSong().

                    DO NOT open payment modal.

                    Go directly to protected playback.
                */

        playButton.addEventListener("click", () => {
          playPurchasedSong(song);
        });
      }

      /* =================================================
               BUILD CARD
               ================================================= */

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
  }
}

/* =========================================================
   PREPARE SCREAM PAYMENT
   =========================================================

   THIS FUNCTION IS ONLY FOR DISCOVER MUSIC.

   It opens the payment modal.

   ========================================================= */

function prepareSong(song) {
  if (!song) {
    alert("Song information is missing.");

    return;
  }

  const user = checkListenerLogin();

  if (!user) {
    window.location.href = "login.html";

    return;
  }

  selectedScreamSong = song;

  currentPaymentId = null;

  const modal = document.getElementById("screamModal");

  const title = document.getElementById("paymentSongTitle");

  const artist = document.getElementById("paymentArtistName");

  const paymentMethod = document.getElementById("paymentMethod");

  const paymentProof = document.getElementById("paymentProof");

  const message = document.getElementById("paymentMessage");

  if (title) {
    title.textContent = song.title || "Selected Song";
  }

  if (artist) {
    artist.textContent = song.artist_name || "Unknown Artist";
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

  const paymentMethod = document.getElementById("paymentMethod");

  const paymentProof = document.getElementById("paymentProof");

  const message = document.getElementById("paymentMessage");

  const submitButton = document.getElementById("submitScreamPayment");

  if (!paymentMethod || !paymentProof || !message || !submitButton) {
    console.error("Scream payment form is incomplete.");

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
           STEP 1 — CREATE PAYMENT
           ================================================= */

    message.textContent = "Creating payment request...";

    const paymentResponse = await KOLO_API.post("/payments/create", {
      user_id: user.id,

      song_id: selectedScreamSong.song_id,

      amount: SCREAM_PRICE,

      payment_method: paymentMethod.value,
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
           STEP 2 — UPLOAD PROOF
           ================================================= */

    message.textContent = "Uploading payment proof...";

    const formData = new FormData();

    formData.append("payment_id", currentPaymentId);

    formData.append("proof", proofFile);

    const baseURL = getAPIBaseURL();

    const uploadResponse = await fetch(`${baseURL}/payments/upload-proof`, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      let errorMessage = "Payment proof upload failed.";

      try {
        const errorData = await uploadResponse.json();

        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (jsonError) {
        console.error("Payment error response:", jsonError);
      }

      throw new Error(errorMessage);
    }

    /* =================================================
           SUCCESS
           ================================================= */

    message.textContent =
      "Payment submitted successfully. " +
      "Your Scream is waiting for admin approval.";

    message.style.color = "#FFD166";

    submitButton.textContent = "Payment Submitted";

    /*
            DO NOT immediately add the song
            to the library.

            The admin must approve it first.

            The backend approval function creates
            listening_access.
        */

    setTimeout(() => {
      closeScreamModal();

      loadListenerLibrary();
    }, 2500);
  } catch (error) {
    console.error("Scream payment error:", error);

    message.textContent = error.message || "Payment failed. Please try again.";

    message.style.color = "#ff6b6b";

    submitButton.disabled = false;

    submitButton.textContent = "Submit Scream Payment";
  }
}

/* =========================================================
   PLAY PURCHASED SONG
   =========================================================

   IMPORTANT:

   This function is ONLY for songs already purchased.

   It does NOT:

   - create payment
   - open payment modal
   - upload proof

   It requests:

       /stream/{user_id}/{song_id}

   Backend checks:

       listening_access
       used = false
       approved song

   ========================================================= */

async function playPurchasedSong(song) {
  if (!song) {
    alert("Song information is missing.");

    return;
  }

  const user = checkListenerLogin();

  if (!user) {
    window.location.href = "login.html";

    return;
  }

  /* =================================================
       PREVENT USED ACCESS
       ================================================= */

  if (song.used === true) {
    alert("This Scream has already been used.");

    return;
  }

  const playerTitle = document.getElementById("playerTitle");

  const playerArtist = document.getElementById("playerArtist");

  const playerCover = document.getElementById("playerCover");

  const audioPlayer = document.getElementById("audioPlayer");

  if (!audioPlayer) {
    alert("Audio player was not found.");

    return;
  }

  /* =================================================
       UPDATE PLAYER UI
       ================================================= */

  if (playerTitle) {
    playerTitle.textContent = song.title || "Song";
  }

  if (playerArtist) {
    playerArtist.textContent = song.artist_name || "Artist";
  }

  if (playerCover) {
    playerCover.src = song.cover_image || "";
  }

  try {
    /* =================================================
           PROTECTED STREAM URL
           ================================================= */

    const baseURL = getAPIBaseURL();

    const streamURL = `${baseURL}/stream/${user.id}/${song.song_id}`;

    console.log("STARTING PROTECTED STREAM:", streamURL);

    /* =================================================
           RESET PLAYER
           ================================================= */

    audioPlayer.pause();

    audioPlayer.removeAttribute("src");

    audioPlayer.load();

    /* =================================================
           SET PROTECTED STREAM
           ================================================= */

    audioPlayer.src = streamURL;

    audioPlayer.load();

    /* =================================================
           START PLAYBACK
           ================================================= */

    await audioPlayer.play();

    if (playerArtist) {
      playerArtist.textContent = `${song.artist_name || "Artist"} • KOLO SCREAM`;
    }

    /*
            IMPORTANT:

            The backend should mark the listening
            access as USED only when the stream
            request is successfully authorized.

            Refresh the library after playback starts.
        */

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

   Discover contains ALL approved songs.

   Clicking:

       Scream & Listen

   opens the payment modal.

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
    /* =================================================
           CHECK API
           ================================================= */

    if (typeof KOLO_API === "undefined" || typeof KOLO_API.get !== "function") {
      throw new Error("KOLO API is not available.");
    }

    /* =================================================
           GET APPROVED SONGS
           ================================================= */

    const response = await KOLO_API.get("/songs/discover");

    const songs = Array.isArray(response?.songs) ? response.songs : [];

    console.log("DISCOVER MUSIC:", songs);

    /* =================================================
           EMPTY
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

    /* =================================================
           CLEAR
           ================================================= */

    container.innerHTML = "";

    /* =================================================
           DISPLAY SONGS
           ================================================= */

    songs.forEach((song) => {
      const card = document.createElement("div");

      card.className = "music-card discover-song-card";

      /* =================================================
               COVER
               ================================================= */

      const cover = document.createElement("img");

      cover.className = "discover-song-cover";

      cover.src = song.cover_image || "";

      cover.alt = song.title || "KOLO MUSIC Song";

      cover.loading = "lazy";

      /* =================================================
               INFO
               ================================================= */

      const info = document.createElement("div");

      info.className = "music-info";

      /* =================================================
               TITLE
               ================================================= */

      const title = document.createElement("h3");

      title.textContent = song.title || "Untitled";

      /* =================================================
               ARTIST
               ================================================= */

      const artist = document.createElement("p");

      artist.textContent = song.artist_name || "Unknown Artist";

      /* =================================================
               DESCRIPTION
               ================================================= */

      const description = document.createElement("p");

      description.className = "song-description";

      description.textContent = song.description || "KOLO MUSIC";

      /* =================================================
               PRICE
               ================================================= */

      const status = document.createElement("p");

      status.className = "song-status";

      status.textContent = `🔥 ${SCREAM_PRICE} LD • KOLO SCREAM`;

      /* =================================================
               LISTEN BUTTON
               ================================================= */

      const listenButton = document.createElement("button");

      listenButton.type = "button";

      listenButton.className = "play-song-btn";

      listenButton.textContent = "🔥 Scream & Listen";

      /*
                IMPORTANT:

                This is DISCOVER music.

                The listener has not purchased
                this song through this screen.

                Therefore open payment modal.
            */

      listenButton.addEventListener("click", () => {
        prepareSong({
          song_id: song.song_id,

          title: song.title,

          artist_name: song.artist_name,

          cover_image: song.cover_image,

          description: song.description,
        });
      });

      /* =================================================
               BUILD CARD
               ================================================= */

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

  /* =================================================
       CLOSE BUTTON
       ================================================= */

  if (closeButton) {
    closeButton.addEventListener("click", closeScreamModal);
  }

  /* =================================================
       SUBMIT PAYMENT
       ================================================= */

  if (submitButton) {
    submitButton.addEventListener("click", createScreamPayment);
  }

  /* =================================================
       CLICK OUTSIDE
       ================================================= */

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeScreamModal();
      }
    });
  }

  /* =================================================
       ESCAPE KEY
       ================================================= */

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

  /* =================================================
           WELCOME
           ================================================= */

  if (user) {
    updateWelcomeMessage(user);
  }

  /* =================================================
           LOGOUT
           ================================================= */

  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", listenerLogout);
  }

  /* =================================================
           PAYMENT MODAL
           ================================================= */

  setupScreamModal();

  /* =================================================
           LOAD LISTENER DATA
           ================================================= */

  if (user) {
    loadListenerLibrary();

    loadDiscoverMusic();
  }
});
