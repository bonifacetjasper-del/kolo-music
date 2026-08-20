/* =========================================================
   KOLO MUSIC - ARTIST SONG UPLOAD SYSTEM

   File:
   frontend/js/artist_uploads.js

   Handles:
   - Artist authentication
   - Artist profile loading
   - Artist approval check
   - Artist ID detection
   - Cover preview
   - Audio file selection
   - Song upload
   - Upload messages
   - Redirect after successful upload
========================================================= */

/* =========================================================
   CONFIGURATION
========================================================= */

const ARTIST_UPLOAD_API = "http://127.0.0.1:8000/api";

/* =========================================================
   GET LOGGED-IN USER
========================================================= */

function getLoggedInArtistUser() {
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

/* =========================================================
   GET ELEMENTS
========================================================= */

function getUploadElements() {
  return {
    form: document.getElementById("uploadSongForm"),

    title: document.getElementById("songTitle"),

    description: document.getElementById("songDescription"),

    cover: document.getElementById("songCover"),

    audio: document.getElementById("songAudio"),

    submitButton: document.getElementById("submitUploadSongButton"),

    message: document.getElementById("uploadSongMessage"),

    pageMessage: document.getElementById("uploadPageMessage"),

    artistName: document.getElementById("uploadArtistName"),

    artistStatus: document.getElementById("artistUploadStatus"),

    artistStatusText: document.getElementById("uploadArtistStatusText"),

    artistAvatar: document.getElementById("uploadArtistAvatar"),

    coverPreviewContainer: document.getElementById("coverPreviewContainer"),

    coverPreview: document.getElementById("coverPreview"),

    audioFileInfo: document.getElementById("audioFileInfo"),

    audioFileName: document.getElementById("audioFileName"),
  };
}

/* =========================================================
   SHOW UPLOAD MESSAGE
========================================================= */

function showUploadMessage(message, type = "error") {
  const elements = getUploadElements();

  if (!elements.message) {
    return;
  }

  elements.message.textContent = message;

  elements.message.className = `form-message ${type}`;
}

/* =========================================================
   SHOW PAGE MESSAGE
========================================================= */

function showPageMessage(message, type = "error") {
  const elements = getUploadElements();

  if (!elements.pageMessage) {
    return;
  }

  elements.pageMessage.textContent = message;

  elements.pageMessage.classList.remove("hidden");

  elements.pageMessage.classList.remove("error", "success", "info");

  elements.pageMessage.classList.add(type);
}

/* =========================================================
   CLEAR UPLOAD MESSAGE
========================================================= */

function clearUploadMessage() {
  const elements = getUploadElements();

  if (elements.message) {
    elements.message.textContent = "";

    elements.message.className = "form-message";
  }
}

/* =========================================================
   LOAD ARTIST PROFILE
========================================================= */

async function loadArtistProfile() {
  const user = getLoggedInArtistUser();

  const elements = getUploadElements();

  /* =====================================================
       CHECK LOGIN
    ===================================================== */

  if (!user || !user.id) {
    showPageMessage("You must be logged in as an artist.", "error");

    setTimeout(function () {
      window.location.href = "./login.html";
    }, 1500);

    return null;
  }

  /* =====================================================
       CHECK ROLE
    ===================================================== */

  if (user.role !== "artist") {
    showPageMessage("Only artist accounts can upload songs.", "error");

    setTimeout(function () {
      window.location.href = "./index.html";
    }, 1500);

    return null;
  }

  try {
    console.log("Loading artist profile...");

    /* =================================================
           REQUEST ARTIST DASHBOARD
        ================================================= */

    const response = await fetch(`${ARTIST_UPLOAD_API}/artist/dashboard`, {
      method: "GET",

      headers: {
        "user-id": user.id,
      },
    });

    /* =================================================
           HANDLE SERVER ERROR
        ================================================= */

    if (!response.ok) {
      let errorMessage = "Unable to load artist profile.";

      try {
        const errorData = await response.json();

        if (errorData.detail) {
          errorMessage = Array.isArray(errorData.detail)
            ? errorData.detail
                .map((error) => error.msg || JSON.stringify(error))
                .join(", ")
            : errorData.detail;
        }
      } catch (error) {
        console.error("Unable to read artist error:", error);
      }

      throw new Error(errorMessage);
    }

    /* =================================================
           READ RESPONSE
        ================================================= */

    const data = await response.json();

    console.log("Artist dashboard response:", data);

    if (!data || !data.success || !data.artist) {
      throw new Error("Artist profile could not be loaded.");
    }

    /* =================================================
           GET ARTIST
        ================================================= */

    const artist = data.artist;

    /* =================================================
           SAVE ARTIST ID
        ================================================= */

    if (artist.id) {
      localStorage.setItem("koloArtistId", artist.id);

      console.log("Artist ID saved:", artist.id);
    }

    /* =================================================
           ARTIST NAME
        ================================================= */

    const artistName = artist.artist_name || "Artist";

    if (elements.artistName) {
      elements.artistName.textContent = artistName;
    }

    /* =================================================
           ARTIST AVATAR
        ================================================= */

    if (elements.artistAvatar) {
      elements.artistAvatar.textContent = artistName.charAt(0).toUpperCase();
    }

    /* =================================================
           ARTIST STATUS
        ================================================= */

    const status = artist.status || "unknown";

    if (elements.artistStatus) {
      elements.artistStatus.textContent = status.toUpperCase();

      elements.artistStatus.className = `artist-status status-${status}`;
    }

    if (elements.artistStatusText) {
      elements.artistStatusText.textContent = `Account status: ${status}`;
    }

    /* =================================================
           CHECK APPROVAL
        ================================================= */

    if (status !== "approved") {
      if (elements.submitButton) {
        elements.submitButton.disabled = true;
      }

      if (elements.form) {
        elements.form.classList.add("upload-disabled");
      }

      showPageMessage(
        "Your artist account must be approved before you can upload songs.",
        "error",
      );

      return artist;
    }

    /* =================================================
           ARTIST APPROVED
        ================================================= */

    if (elements.submitButton) {
      elements.submitButton.disabled = false;
    }

    console.log("Artist approved. Upload enabled.");

    return artist;
  } catch (error) {
    console.error("LOAD ARTIST PROFILE ERROR:", error);

    showPageMessage(error.message || "Unable to load artist profile.", "error");

    return null;
  }
}

/* =========================================================
   COVER IMAGE PREVIEW
========================================================= */

function handleCoverPreview(event) {
  const file = event.target.files?.[0];

  const elements = getUploadElements();

  if (!file) {
    if (elements.coverPreviewContainer) {
      elements.coverPreviewContainer.classList.add("hidden");
    }

    return;
  }

  /* =====================================================
       CHECK IMAGE TYPE
    ===================================================== */

  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedImageTypes.includes(file.type)) {
    showUploadMessage("Please select a JPG, PNG or WEBP image.", "error");

    event.target.value = "";

    return;
  }

  /* =====================================================
       CREATE PREVIEW
    ===================================================== */

  const imageURL = URL.createObjectURL(file);

  if (elements.coverPreview) {
    elements.coverPreview.src = imageURL;
  }

  if (elements.coverPreviewContainer) {
    elements.coverPreviewContainer.classList.remove("hidden");
  }
}

/* =========================================================
   AUDIO FILE INFORMATION
========================================================= */

function handleAudioSelection(event) {
  const file = event.target.files?.[0];

  const elements = getUploadElements();

  if (!file) {
    if (elements.audioFileInfo) {
      elements.audioFileInfo.classList.add("hidden");
    }

    return;
  }

  /* =====================================================
       CHECK AUDIO TYPE
    ===================================================== */

  const allowedAudioTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/x-wav",
  ];

  if (!allowedAudioTypes.includes(file.type)) {
    showUploadMessage(
      "Please select a valid MP3, WAV or OGG audio file.",
      "error",
    );

    event.target.value = "";

    return;
  }

  /* =====================================================
       SHOW FILE NAME
    ===================================================== */

  if (elements.audioFileName) {
    elements.audioFileName.textContent = file.name;
  }

  if (elements.audioFileInfo) {
    elements.audioFileInfo.classList.remove("hidden");
  }
}

/* =========================================================
   VALIDATE UPLOAD FORM
========================================================= */

function validateUploadForm() {
  const elements = getUploadElements();

  /* =====================================================
       TITLE
    ===================================================== */

  const title = elements.title?.value.trim();

  if (!title) {
    showUploadMessage("Please enter the song title.", "error");

    elements.title?.focus();

    return false;
  }

  /* =====================================================
       COVER
    ===================================================== */

  const cover = elements.cover?.files?.[0];

  if (!cover) {
    showUploadMessage("Please select a cover image.", "error");

    return false;
  }

  /* =====================================================
       AUDIO
    ===================================================== */

  const audio = elements.audio?.files?.[0];

  if (!audio) {
    showUploadMessage("Please select your audio file.", "error");

    return false;
  }

  return true;
}

/* =========================================================
   UPLOAD SONG
========================================================= */

async function uploadSong(event) {
  event.preventDefault();

  clearUploadMessage();

  const elements = getUploadElements();

  /* =====================================================
       CHECK USER
    ===================================================== */

  const user = getLoggedInArtistUser();

  if (!user || !user.id) {
    showUploadMessage(
      "Your login session has expired. Please login again.",
      "error",
    );

    return;
  }

  /* =====================================================
       CHECK FORM
    ===================================================== */

  if (!validateUploadForm()) {
    return;
  }

  /* =====================================================
       GET ARTIST ID
    ===================================================== */

  let artistId = localStorage.getItem("koloArtistId");

  /* =====================================================
       IF ARTIST ID IS MISSING, LOAD PROFILE
    ===================================================== */

  if (!artistId) {
    const artist = await loadArtistProfile();

    if (!artist || !artist.id) {
      showUploadMessage("Unable to identify your artist account.", "error");

      return;
    }

    artistId = artist.id;
  }

  /* =====================================================
       GET FILES
    ===================================================== */

  const cover = elements.cover.files[0];

  const audio = elements.audio.files[0];

  /* =====================================================
       CREATE FORMDATA
    ===================================================== */

  const formData = new FormData();

  formData.append("artist_id", artistId);

  formData.append("title", elements.title.value.trim());

  formData.append("description", elements.description?.value.trim() || "");

  formData.append("cover", cover);

  formData.append("audio", audio);

  /* =====================================================
       DISABLE BUTTON
    ===================================================== */

  if (elements.submitButton) {
    elements.submitButton.disabled = true;

    elements.submitButton.textContent = "Uploading...";
  }

  showUploadMessage("Uploading your song. Please wait...", "info");

  try {
    console.log("Uploading song:", {
      artistId: artistId,
      title: elements.title.value.trim(),
      cover: cover.name,
      audio: audio.name,
    });

    /* =================================================
           SEND TO FASTAPI
        ================================================= */

    const response = await fetch(`${ARTIST_UPLOAD_API}/songs/upload`, {
      method: "POST",

      body: formData,
    });

    /* =================================================
           HANDLE SERVER ERROR
        ================================================= */

    if (!response.ok) {
      let errorMessage = `Upload failed (${response.status}).`;

      try {
        const errorData = await response.json();

        if (errorData.detail) {
          errorMessage = Array.isArray(errorData.detail)
            ? errorData.detail
                .map((error) => error.msg || JSON.stringify(error))
                .join(", ")
            : errorData.detail;
        }
      } catch (error) {
        console.error("Unable to read upload error:", error);
      }

      throw new Error(errorMessage);
    }

    /* =================================================
           SUCCESS RESPONSE
        ================================================= */

    const data = await response.json();

    console.log("Song upload response:", data);

    showUploadMessage(
      "Song uploaded successfully! It is now waiting for admin approval.",
      "success",
    );

    /* =================================================
           RESET FORM
        ================================================= */

    if (elements.form) {
      elements.form.reset();
    }

    if (elements.coverPreviewContainer) {
      elements.coverPreviewContainer.classList.add("hidden");
    }

    if (elements.audioFileInfo) {
      elements.audioFileInfo.classList.add("hidden");
    }

    /* =================================================
           REDIRECT
        ================================================= */

    setTimeout(function () {
      window.location.href = "./artist.html";
    }, 2000);
  } catch (error) {
    console.error("SONG UPLOAD ERROR:", error);

    showUploadMessage(error.message || "Unable to upload song.", "error");
  } finally {
    if (elements.submitButton) {
      elements.submitButton.disabled = false;

      elements.submitButton.textContent = "Upload Song";
    }
  }
}

/* =========================================================
   INITIALIZE UPLOAD PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
  console.log("KOLO MUSIC artist upload page ready.");

  /* ===============================================
           LOAD ARTIST PROFILE
        =============================================== */

  await loadArtistProfile();

  /* ===============================================
           GET ELEMENTS
        =============================================== */

  const elements = getUploadElements();

  /* ===============================================
           COVER PREVIEW
        =============================================== */

  if (elements.cover) {
    elements.cover.addEventListener("change", handleCoverPreview);
  }

  /* ===============================================
           AUDIO SELECTION
        =============================================== */

  if (elements.audio) {
    elements.audio.addEventListener("change", handleAudioSelection);
  }

  /* ===============================================
           UPLOAD FORM
        =============================================== */

  if (elements.form) {
    elements.form.addEventListener("submit", uploadSong);
  }

  console.log("KOLO MUSIC upload system initialized.");
});

/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.getLoggedInArtistUser = getLoggedInArtistUser;

window.loadArtistProfile = loadArtistProfile;

window.uploadSong = uploadSong;

window.handleCoverPreview = handleCoverPreview;

window.handleAudioSelection = handleAudioSelection;

