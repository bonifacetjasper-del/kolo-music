/* ==========================================
   KOLO MUSIC — AUTOMATIC MUSIC GALLERY
========================================== */

let koloGallerySongs = [];
let koloGalleryIndex = 0;
let koloGalleryTimer = null;

/* ==========================================
   LOAD APPROVED SONGS
========================================== */

async function loadKoloGallery() {

    const containers =
        document.querySelectorAll(".kolo-music-gallery");

    if (!containers.length) {
        return;
    }

    containers.forEach(container => {

        container.innerHTML = `
            <div class="gallery-loading">
                Loading KOLO MUSIC...
            </div>
        `;

    });

    try {

        const response =
            await KOLO_API.get("/marketplace/songs");

        if (
            !response ||
            !Array.isArray(response.songs)
        ) {

            throw new Error(
                "No approved songs were returned."
            );

        }

        koloGallerySongs =
            response.songs;

        if (!koloGallerySongs.length) {

            containers.forEach(container => {

                container.innerHTML = `
                    <div class="gallery-empty">
                        No music available yet.
                    </div>
                `;

            });

            return;
        }

        koloGalleryIndex = 0;

        renderKoloGallery();

        startKoloGallery();

    } catch (error) {

        console.error(
            "KOLO gallery loading error:",
            error
        );

        containers.forEach(container => {

            container.innerHTML = `
                <div class="gallery-error">
                    Unable to load KOLO MUSIC.
                </div>
            `;

        });

    }
}


/* ==========================================
   RENDER CURRENT SONG
========================================== */

function renderKoloGallery() {

    if (!koloGallerySongs.length) {
        return;
    }

    const song =
        koloGallerySongs[
            koloGalleryIndex
        ];

    const containers =
        document.querySelectorAll(
            ".kolo-music-gallery"
        );

    containers.forEach(container => {

        const cover =
            song.cover_image ||
            "asserts/images/kolo-logo.png";

        const title =
            song.title ||
            "Untitled";

        const artist =
            song.artist_name ||
            "Unknown Artist";

        const description =
            song.description ||
            "Discover music on KOLO MUSIC.";

        container.innerHTML = `

            <div class="kolo-gallery-card">

                <div class="kolo-gallery-image-wrap">

                    <img
                        src="${escapeGalleryHTML(cover)}"
                        alt="${escapeGalleryHTML(title)}"
                        class="kolo-gallery-image"
                    >

                    <div class="kolo-gallery-overlay">

                        <span>
                            KOLO MUSIC
                        </span>

                    </div>

                </div>

                <div class="kolo-gallery-info">

                    <p class="gallery-label">
                        FEATURED MUSIC
                    </p>

                    <h3>
                        ${escapeGalleryHTML(title)}
                    </h3>

                    <p class="gallery-artist">
                        ${escapeGalleryHTML(artist)}
                    </p>

                    <p class="gallery-description">
                        ${escapeGalleryHTML(description)}
                    </p>

                    <div class="gallery-actions">

                        <button
                            type="button"
                            class="gallery-prev"
                            onclick="previousKoloGallerySong()"
                        >
                            ←
                        </button>

                        <button
                            type="button"
                            class="gallery-discover"
                            onclick="goToKoloGalleryMusic()"
                        >
                            Discover Music
                        </button>

                        <button
                            type="button"
                            class="gallery-next"
                            onclick="nextKoloGallerySong()"
                        >
                            →
                        </button>

                    </div>

                    <div class="gallery-dots">

                        ${createGalleryDots()}

                    </div>

                </div>

            </div>
        `;

    });

}


/* ==========================================
   GALLERY DOTS
========================================== */

function createGalleryDots() {

    return koloGallerySongs
        .slice(0, 10)
        .map((song, index) => {

            return `
                <button
                    type="button"
                    class="gallery-dot ${
                        index === koloGalleryIndex
                            ? "active"
                            : ""
                    }"
                    onclick="showKoloGallerySong(${index})"
                    aria-label="Show song ${index + 1}"
                ></button>
            `;

        })
        .join("");

}


/* ==========================================
   NEXT SONG
========================================== */

function nextKoloGallerySong() {

    if (!koloGallerySongs.length) {
        return;
    }

    koloGalleryIndex++;

    if (
        koloGalleryIndex >=
        koloGallerySongs.length
    ) {

        koloGalleryIndex = 0;

    }

    renderKoloGallery();

}


/* ==========================================
   PREVIOUS SONG
========================================== */

function previousKoloGallerySong() {

    if (!koloGallerySongs.length) {
        return;
    }

    koloGalleryIndex--;

    if (koloGalleryIndex < 0) {

        koloGalleryIndex =
            koloGallerySongs.length - 1;

    }

    renderKoloGallery();

}


/* ==========================================
   SHOW SPECIFIC SONG
========================================== */

function showKoloGallerySong(index) {

    if (
        index < 0 ||
        index >= koloGallerySongs.length
    ) {

        return;

    }

    koloGalleryIndex = index;

    renderKoloGallery();

    restartKoloGallery();

}


/* ==========================================
   AUTOMATIC SLIDESHOW
========================================== */

function startKoloGallery() {

    stopKoloGallery();

    koloGalleryTimer =
        setInterval(() => {

            nextKoloGallerySong();

        }, 5000);

}


/* ==========================================
   RESTART TIMER
========================================== */

function restartKoloGallery() {

    startKoloGallery();

}


/* ==========================================
   STOP TIMER
========================================== */

function stopKoloGallery() {

    if (koloGalleryTimer) {

        clearInterval(
            koloGalleryTimer
        );

        koloGalleryTimer = null;

    }

}


/* ==========================================
   GO TO MUSIC
========================================== */

function goToKoloGalleryMusic() {

    window.location.href =
        "listener.html#discover";

}


/* ==========================================
   HTML ESCAPE
========================================== */

function escapeGalleryHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    loadKoloGallery
);
