/* =========================================================
   KOLO MUSIC - ARTIST PROFILE DASHBOARD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    loadArtistProfile();

    const bioButton = document.getElementById("editBioButton");
    const saveBioButton = document.getElementById("saveBioButton");
    const bio = document.getElementById("artistBio");
    const photoInput = document.getElementById("artistPhotoInput");

    if (bioButton) {
        bioButton.addEventListener("click", () => {
            bio.disabled = false;
            bio.focus();

            bioButton.style.display = "none";
            if (saveBioButton) {
                saveBioButton.style.display = "inline-flex";
            }
        });
    }

    if (saveBioButton) {
        saveBioButton.addEventListener("click", saveArtistBio);
    }

    if (bio) {
        bio.addEventListener("input", updateBioCounter);
    }

    if (photoInput) {
        photoInput.addEventListener("change", uploadArtistPhoto);
    }
});


/* =========================================================
   LOAD ARTIST PROFILE
========================================================= */

async function loadArtistProfile() {

    try {

        const response =
            await KOLO_API.get("/artist/profile");

        const artist =
            response?.artist;

        if (!artist) {
            throw new Error("Artist profile not found");
        }

        const name =
            artist.artist_name || "Artist";

        const nameElement =
            document.getElementById("artistProfileName");

        const emailElement =
            document.getElementById("artistProfileEmail");

        const statusElement =
            document.getElementById("artistProfileStatus");

        const badge =
            document.getElementById("artistApprovalBadge");

        const bio =
            document.getElementById("artistBio");

        const photo =
            document.getElementById("artistProfilePhoto");

        if (nameElement) {
            nameElement.textContent = name;
        }

        if (emailElement) {
            const user = JSON.parse(
                localStorage.getItem("koloUser") || "{}"
            );

            emailElement.textContent =
                user.email || "";
        }

        if (statusElement) {
            statusElement.textContent =
                String(artist.status || "UNKNOWN").toUpperCase();
        }

        if (badge) {
            badge.textContent =
                String(artist.status || "APPROVED").toUpperCase()
                + " ARTIST";
        }

        if (bio) {
            bio.value = artist.bio || "";
            bio.disabled = true;
        }

        updateBioCounter();

        if (
            photo &&
            artist.profile_photo_url
        ) {
            photo.src =
                artist.profile_photo_url;
        }

        renderArtistSongs(
            response.songs || []
        );

    } catch (error) {

        console.error(
            "LOAD ARTIST PROFILE ERROR:",
            error
        );

        alert(
            "Unable to load your artist profile."
        );
    }
}


/* =========================================================
   SAVE BIO
========================================================= */

async function saveArtistBio() {

    const bio =
        document.getElementById("artistBio");

    const nameElement =
        document.getElementById("artistProfileName");

    const saveButton =
        document.getElementById("saveBioButton");

    if (!bio) {
        return;
    }

    try {

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        const artistName =
            nameElement?.textContent?.trim();

        const response =
            await KOLO_API.put(
                "/artist/profile",
                {
                    artist_name:
                        artistName || "Artist",

                    bio:
                        bio.value.trim()
                }
            );

        if (!response?.success) {
            throw new Error(
                response?.detail ||
                "Unable to save bio"
            );
        }

        bio.disabled = true;

        const editButton =
            document.getElementById("editBioButton");

        if (editButton) {
            editButton.style.display =
                "inline-flex";
        }

        if (saveButton) {
            saveButton.style.display =
                "none";
        }

        alert("Bio saved successfully.");

    } catch (error) {

        console.error(
            "SAVE BIO ERROR:",
            error
        );

        alert(
            error?.message ||
            "Unable to save bio."
        );

    } finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Bio";
        }
    }
}


/* =========================================================
   BIO COUNTER
========================================================= */

function updateBioCounter() {

    const bio =
        document.getElementById("artistBio");

    const counter =
        document.getElementById("bioCharacterCount");

    if (bio && counter) {
        counter.textContent =
            bio.value.length;
    }
}


/* =========================================================
   UPLOAD PROFILE PHOTO
========================================================= */

async function uploadArtistPhoto(event) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {

        alert(
            "Please select a JPG, PNG or WEBP image."
        );

        event.target.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {

        alert(
            "Profile photo must be smaller than 5 MB."
        );

        event.target.value = "";
        return;
    }

    const photo =
        document.getElementById("artistProfilePhoto");

    try {

        const formData =
            new FormData();

        formData.append(
            "photo",
            file
        );

        /*
         * IMPORTANT:
         * Do NOT manually set Content-Type.
         * Browser must create the multipart boundary.
         */

        const accessToken = getKoloAccessToken();

        if (!accessToken) {
            throw new Error(
                "Your login session has expired. Please log in again."
            );
        }

        const response =
            await fetch(
                `${API_URL}/artist/profile-photo`,
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            `Bearer ${accessToken}`
                    },

                    /*
                     * IMPORTANT:
                     * Do NOT set Content-Type here.
                     * The browser creates the multipart boundary.
                     */
                    body: formData
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            let errorMessage =
                "Profile photo upload failed";

            if (data?.detail) {

                if (typeof data.detail === "string") {

                    errorMessage =
                        data.detail;

                } else {

                    errorMessage =
                        JSON.stringify(data.detail);
                }
            }

            throw new Error(errorMessage);
        }

        if (
            data?.profile_photo_url &&
            photo
        ) {

            photo.src =
                data.profile_photo_url
                + "?t="
                + Date.now();
        }

        alert(
            "Profile photo updated successfully."
        );

    } catch (error) {

        console.error(
            "PROFILE PHOTO ERROR:",
            error
        );

        alert(
            error?.message ||
            "Unable to upload profile photo."
        );

    } finally {

        event.target.value = "";
    }
}


/* =========================================================
   RENDER SONGS
========================================================= */

function renderArtistSongs(songs) {

    const container =
        document.getElementById(
            "artistSongsContainer"
        );

    const message =
        document.getElementById(
            "artistSongsMessage"
        );

    if (!container) {
        console.error(
            "artistSongsContainer not found."
        );
        return;
    }

    container.innerHTML = "";

    if (!Array.isArray(songs) || !songs.length) {

        if (message) {
            message.textContent =
                "You have not uploaded any songs yet.";
        }

        return;
    }

    if (message) {
        message.textContent =
            `${songs.length} uploaded song(s).`;
    }

    songs.forEach(song => {

        const card =
            document.createElement("article");

        card.className =
            "artist-song-card";

        /* ==============================
           COVER
        ============================== */

        const cover =
            document.createElement("img");

        cover.className =
            "artist-song-cover";

        cover.src =
            song.cover_image ||
            "./asserts/images/kolo-logo.png";

        cover.alt =
            song.title ||
            "KOLO MUSIC";

        cover.onerror = function () {
            this.src =
                "./asserts/images/kolo-logo.png";
        };

        /* ==============================
           INFORMATION
        ============================== */

        const info =
            document.createElement("div");

        info.className =
            "artist-song-info";

        const title =
            document.createElement("h3");

        title.textContent =
            song.title ||
            "Untitled";

        const status =
            document.createElement("p");

        status.className =
            "artist-song-status";

        status.textContent =
            `Status: ${song.status || "unknown"}`;

        /* ==============================
           ARTIST AUDIO PLAYER
        ============================== */

        const player =
            document.createElement("div");

        player.className =
            "artist-audio-player";

        /* PLAY / PAUSE BUTTON */

        const listenButton =
            document.createElement("button");

        listenButton.type = "button";

        listenButton.className =
            "artist-listen-button";

        listenButton.textContent =
            "▶ Listen Free";

        /* PROGRESS BAR */

        const progress =
            document.createElement("input");

        progress.type = "range";
        progress.min = "0";
        progress.max = "100";
        progress.value = "0";
        progress.className =
            "artist-progress";

        /* TIME DISPLAY */

        const timeDisplay =
            document.createElement("span");

        timeDisplay.className =
            "artist-time";

        timeDisplay.textContent =
            "0:00 / 0:00";

        player.appendChild(listenButton);
        player.appendChild(progress);
        player.appendChild(timeDisplay);

        let audio = null;
        let audioUrl = null;
        let loadingAudio = false;

        function formatTime(seconds) {

            if (!Number.isFinite(seconds)) {
                return "0:00";
            }

            const minutes =
                Math.floor(seconds / 60);

            const secs =
                Math.floor(seconds % 60)
                .toString()
                .padStart(2, "0");

            return `${minutes}:${secs}`;
        }

        async function loadArtistAudio() {

            if (audio) {
                return;
            }

            if (loadingAudio) {
                return;
            }

            loadingAudio = true;

            listenButton.disabled = true;
            listenButton.textContent =
                "Loading...";

            try {

                if (
                    String(song.status || "").toLowerCase()
                    !== "approved"
                ) {

                    throw new Error(
                        "This song is not approved yet."
                    );
                }

                const user =
                    getKoloUser();

                if (!user) {

                    window.location.href =
                        "./login.html";

                    return;
                }

                const response =
                    await fetch(
                        `${API_URL}/artist/song/${song.id}/play`,
                        {
                            method: "GET",
                            headers:
                                getAuthHeaders()
                        }
                    );

                if (!response.ok) {

                    let errorData = null;

                    try {
                        errorData =
                            await response.json();
                    } catch (_) {}

                    throw new Error(
                        errorData?.detail ||
                        "Unable to start song."
                    );
                }

                const data =
                    await response.json();

                audioUrl =
                    data?.audio_url;

                if (!audioUrl) {

                    throw new Error(
                        "Audio URL was not returned."
                    );
                }

                audio =
                    new Audio(audioUrl);

                audio.preload =
                    "metadata";

                audio.addEventListener(
                    "loadedmetadata",
                    () => {

                        timeDisplay.textContent =
                            `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;

                    }
                );

                audio.addEventListener(
                    "timeupdate",
                    () => {

                        if (
                            audio.duration &&
                            Number.isFinite(audio.duration)
                        ) {

                            progress.value =
                                (
                                    audio.currentTime /
                                    audio.duration
                                ) * 100;
                        }

                        timeDisplay.textContent =
                            `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
                    }
                );

                audio.addEventListener(
                    "play",
                    () => {

                        listenButton.textContent =
                            "⏸ Pause";

                        listenButton.disabled =
                            false;
                    }
                );

                audio.addEventListener(
                    "pause",
                    () => {

                        if (!audio.ended) {

                            listenButton.textContent =
                                "▶ Resume";
                        }

                        listenButton.disabled =
                            false;
                    }
                );

                audio.addEventListener(
                    "ended",
                    () => {

                        progress.value =
                            "0";

                        listenButton.textContent =
                            "▶ Listen Again";

                        listenButton.disabled =
                            false;
                    }
                );

                await audio.play();

            } catch (error) {

                console.error(
                    "ARTIST SONG PLAY ERROR:",
                    error
                );

                alert(
                    error?.message ||
                    "Unable to play this song."
                );

                audio = null;

                listenButton.textContent =
                    "▶ Listen Free";

                listenButton.disabled =
                    false;

            } finally {

                loadingAudio = false;
            }
        }

        listenButton.addEventListener(
            "click",
            async () => {

                if (!audio) {

                    await loadArtistAudio();

                    return;
                }

                if (audio.paused) {

                    try {

                        await audio.play();

                    } catch (error) {

                        console.error(
                            "AUDIO RESUME ERROR:",
                            error
                        );

                    }

                } else {

                    audio.pause();
                }
            }
        );

        progress.addEventListener(
            "input",
            () => {

                if (
                    audio &&
                    Number.isFinite(audio.duration)
                ) {

                    audio.currentTime =
                        (
                            Number(progress.value) /
                            100
                        ) *
                        audio.duration;
                }
            }
        );
        info.appendChild(title);
        info.appendChild(status);
        info.appendChild(player);

        card.appendChild(cover);
        card.appendChild(info);

        container.appendChild(card);

    });
}







