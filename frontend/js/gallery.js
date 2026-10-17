/* ==========================================
   KOLO MUSIC — AUTOMATIC MUSIC GALLERY
========================================== */

let koloGallerySongs = [];
let koloGalleryIndex = 0;
let koloGalleryTimer = null;
let koloGallerySharing = null;
function closeKoloGallerySharing(resume = true, focus = false) {
 const a=koloGallerySharing;if(!a)return;koloGallerySharing=null;
 a.controller.clear();a.button.setAttribute('aria-expanded','false');a.message.textContent='';
 if(focus)a.button.focus();if(resume)startKoloGallery();
}
function attachKoloGallerySharing(container,song) {
 const sharing=window.KOLO_SHARING;
 if(!sharing||!sharing.songUrl(song.song_id)||song.song_available===false||(song.status&&song.status!=='approved'))return;
 const button=document.createElement('button');button.type='button';button.className='gallery-share-toggle';button.textContent='Share';
 button.setAttribute('aria-label','Share '+(song.title||'song'));button.setAttribute('aria-expanded','false');
 const {root,controller}=sharing.createPanel();button.setAttribute('aria-controls',root.id);
 const message=document.createElement('p');message.className='share-status';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 button.addEventListener('click',async()=>{
  if(koloGallerySharing?.button===button){closeKoloGallerySharing();return;}
  closeKoloGallerySharing(false);
  const songId=song.song_id; // Capture rendered identity before async work.
  const active={button,controller,message};koloGallerySharing=active;stopKoloGallery();button.setAttribute('aria-expanded','true');message.textContent='Checking song availability...';
  try {
   const metadata=await KOLO_API.get('/marketplace/song/'+encodeURIComponent(songId));
   if(koloGallerySharing!==active||!container.contains(button))return;
   if(!metadata||typeof metadata.song_id!=='string'||metadata.song_id.toLowerCase()!==songId.toLowerCase()||typeof metadata.title!=='string'||!metadata.title.trim())throw Error('Invalid metadata');
   controller.setSong({song_id:metadata.song_id,title:metadata.title.trim(),artist_name:typeof metadata.artist_name==='string'?metadata.artist_name:'Unknown artist'});message.textContent='';
  }catch(_){if(koloGallerySharing!==active)return;closeKoloGallerySharing();message.textContent='This song is unavailable for sharing. Try again later.';}
 });
 const escape=e=>{if(e.key==='Escape'&&koloGallerySharing?.button===button)closeKoloGallerySharing(true,true);};
 button.addEventListener('keydown',escape);root.addEventListener('keydown',escape);
 container.querySelector('.gallery-actions').appendChild(button);
 const info=container.querySelector('.kolo-gallery-info');info.appendChild(message);info.appendChild(root);
}


/* ==========================================
   KOLO MUSIC — FEATURED ARTISTS GALLERY
========================================== */

let koloArtists = [];
let koloArtistIndex = 0;
let koloArtistTimer = null;


/* ==========================================
   LOAD FEATURED ARTISTS
========================================== */

async function loadKoloArtists() {

    const containers =
        document.querySelectorAll(
            ".kolo-artists-gallery"
        );

    if (!containers.length) {
        return;
    }

    containers.forEach(container => {

        container.innerHTML = `
            <div class="artists-gallery-loading">
                Loading featured artists...
            </div>
        `;

    });

    try {

        const response =
            await KOLO_API.get(
                "/marketplace/songs"
            );

        const songs =
            Array.isArray(response)
                ? response
                : response?.songs || [];

        const artistMap =
            new Map();

        songs.forEach(song => {

            const artistId =
                song?.artist_id;

            if (!artistId) {
                return;
            }

            if (artistMap.has(artistId)) {
                return;
            }

            artistMap.set(
                artistId,
                {
                    artist_id:
                        artistId,

                    artist_name:
                        song.artist_name ||
                        "Unknown Artist",

                    artist_bio:
                        song.artist_bio ||
                        "",

                    profile_photo:
                        song.artist_profile_photo ||
                        ""
                }
            );

        });

        koloArtists =
            Array.from(
                artistMap.values()
            );

        if (!koloArtists.length) {

            containers.forEach(container => {

                container.innerHTML = `
                    <div class="artists-gallery-empty">
                        No featured artists yet.
                    </div>
                `;

            });

            return;
        }

        koloArtistIndex = 0;

        renderKoloArtist();

        startKoloArtistSlideshow();

    } catch (error) {

        console.error(
            "KOLO artists gallery loading error:",
            error
        );

        containers.forEach(container => {

            container.innerHTML = `
                <div class="artists-gallery-error">
                    Unable to load featured artists.
                </div>
            `;

        });

    }

}

/* ==========================================
   LOAD APPROVED SONGS
========================================== */

async function loadKoloGallery() {
    closeKoloGallerySharing(false);
    stopKoloGallery();

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
    closeKoloGallerySharing();

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

                    <button
                        type="button"
                        class="gallery-artist gallery-artist-link"
                        onclick="goToKoloGalleryArtist()"
                    >
                        ${escapeGalleryHTML(artist)}
                    </button>

                    <p class="gallery-description">
                        ${escapeGalleryHTML(description)}
                    </p>

                    <div class="gallery-actions">

                        <button
                            type="button"
                            class="gallery-prev"
                            onclick="previousKoloGallerySong()"
                        >
                            ?
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
                            ?
                        </button>

                    </div>

                    <div class="gallery-dots">

                        ${createGalleryDots()}

                    </div>

                </div>

            </div>
        `;

        attachKoloGallerySharing(container, song);
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
    closeKoloGallerySharing();

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
    closeKoloGallerySharing();

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
    closeKoloGallerySharing();

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
    if (koloGallerySharing) { stopKoloGallery(); return; }

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
   GO TO ARTIST
========================================== */

function goToKoloGalleryArtist() {

    if (!koloGallerySongs.length) {
        return;
    }

    const song =
        koloGallerySongs[koloGalleryIndex];

    const artistId =
        song?.artist_id;

    if (!artistId) {
        console.error("Artist ID is missing from gallery song.");
        return;
    }

    window.location.href =
        "public_artist.html?artist_id=" +
        encodeURIComponent(artistId);
}


/* ==========================================
   FEATURED ARTISTS GALLERY
========================================== */

async function loadKoloArtistsGallery() {

    const container =
        document.querySelector(".kolo-artists-gallery");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="artists-gallery-loading">
            Loading featured artists...
        </div>
    `;

    try {

        const response =
            await KOLO_API.get("/marketplace/songs");

        if (
            !response ||
            !Array.isArray(response.songs)
        ) {
            throw new Error("No artist data returned.");
        }

        const uniqueArtists = [];

        response.songs.forEach(song => {

            if (!song.artist_id) {
                return;
            }

            const exists =
                uniqueArtists.some(
                    artist =>
                        artist.artist_id === song.artist_id
                );

            if (!exists) {

                uniqueArtists.push({
                    artist_id:
                        song.artist_id,

                    artist_name:
                        song.artist_name ||
                        "Unknown Artist",

                    artist_bio:
                        song.artist_bio ||
                        "Liberian artist on KOLO MUSIC.",

                    artist_profile_photo:
                        song.artist_profile_photo ||
                        ""
                });

            }

        });

        koloArtists = uniqueArtists;

        if (!koloArtists.length) {

            container.innerHTML = `
                <div class="artists-gallery-empty">
                    No featured artists available yet.
                </div>
            `;

            return;
        }

        koloArtistIndex = 0;

        renderKoloArtistsGallery();

        startKoloArtistsGallery();

    } catch (error) {

        console.error(
            "KOLO featured artists loading error:",
            error
        );

        container.innerHTML = `
            <div class="artists-gallery-error">
                Unable to load featured artists.
            </div>
        `;

    }
}


/* ==========================================
   RENDER FEATURED ARTIST
========================================== */

function renderKoloArtistsGallery() {

    const container =
        document.querySelector(".kolo-artists-gallery");

    if (
        !container ||
        !koloArtists.length
    ) {
        return;
    }

    const totalArtists = koloArtists.length;

    /*
       Show 3 artists at a time.
       The index represents the first artist
       in the current visible group.
    */

    const visibleArtists = [];

    for (let i = 0; i < Math.min(3, totalArtists); i++) {

        const artistIndex =
            (koloArtistIndex + i) % totalArtists;

        visibleArtists.push(
            koloArtists[artistIndex]
        );

    }

    container.innerHTML = `

        <div class="artists-carousel">

            <button
                type="button"
                class="artists-carousel-arrow artists-carousel-prev"
                onclick="previousKoloArtist()"
                aria-label="Previous artists"
            >
                ?
            </button>


            <div class="artists-carousel-track">

                ${visibleArtists.map(artist => {

                    const photo =
                        artist.artist_profile_photo ||
                        "asserts/images/kolo-logo.png";

                    return `

                        <article class="artists-gallery-card">

                            <div class="artists-gallery-photo-wrap">

                                <img
                                    src="${escapeGalleryHTML(photo)}"
                                    alt="${escapeGalleryHTML(artist.artist_name)}"
                                    class="artists-gallery-photo"
                                    loading="lazy"
                                >

                            </div>

                            <div class="artists-gallery-info">

                                <p class="artists-gallery-label">
                                    FEATURED ARTIST
                                </p>

                                <h2 class="artists-gallery-name">
                                    ${escapeGalleryHTML(
                                        artist.artist_name
                                    )}
                                </h2>

                                <p class="artists-gallery-bio">
                                    ${escapeGalleryHTML(
                                        artist.artist_bio
                                    )}
                                </p>

                                <button
                                    type="button"
                                    class="artists-gallery-profile-btn"
                                    onclick="openKoloArtistProfileById('${escapeGalleryHTML(artist.artist_id)}')"
                                >
                                    View Profile
                                </button>

                            </div>

                        </article>

                    `;

                }).join("")}

            </div>


            <button
                type="button"
                class="artists-carousel-arrow artists-carousel-next"
                onclick="nextKoloArtist()"
                aria-label="Next artists"
            >
                ?
            </button>

        </div>


        <div class="artists-gallery-dots">

            ${createKoloArtistDots()}

        </div>

    `;

}

/* ==========================================
   OPEN ARTIST BY INDEX
========================================== */

function openKoloArtistProfileByIndex(index) {

    if (
        index < 0 ||
        index >= koloArtists.length
    ) {
        return;
    }

    const artist =
        koloArtists[index];

    if (!artist || !artist.artist_id) {
        return;
    }

    window.location.href =
        "public_artist.html?artist_id=" +
        encodeURIComponent(
            artist.artist_id
        );

}

/* ==========================================
   ARTIST DOTS
========================================== */

function createKoloArtistDots() {

    return koloArtists
        .slice(0, 10)
        .map((artist, index) => {

            return `
                <button
                    type="button"
                    class="artists-gallery-dot ${
                        index === koloArtistIndex
                            ? "active"
                            : ""
                    }"
                    onclick="showKoloArtist(${index})"
                    aria-label="Show artist ${index + 1}"
                ></button>
            `;

        })
        .join("");

}


/* ==========================================
   NEXT ARTIST
========================================== */

function nextKoloArtist() {

    if (!koloArtists.length) {
        return;
    }

    koloArtistIndex++;

    if (
        koloArtistIndex >=
        koloArtists.length
    ) {
        koloArtistIndex = 0;
    }

    renderKoloArtistsGallery();

}


/* ==========================================
   PREVIOUS ARTIST
========================================== */

function previousKoloArtist() {

    if (!koloArtists.length) {
        return;
    }

    koloArtistIndex--;

    if (koloArtistIndex < 0) {
        koloArtistIndex =
            koloArtists.length - 1;
    }

    renderKoloArtistsGallery();

}


/* ==========================================
   SHOW ARTIST
========================================== */

function showKoloArtist(index) {

    if (
        index < 0 ||
        index >= koloArtists.length
    ) {
        return;
    }

    koloArtistIndex = index;

    renderKoloArtistsGallery();

    restartKoloArtistsGallery();

}


/* ==========================================
   ARTIST AUTO SLIDESHOW
========================================== */

function startKoloArtistsGallery() {

    stopKoloArtistsGallery();

    koloArtistTimer =
        setInterval(() => {

            nextKoloArtist();

        }, 5000);

}


function restartKoloArtistsGallery() {

    startKoloArtistsGallery();

}


function stopKoloArtistsGallery() {

    if (koloArtistTimer) {

        clearInterval(koloArtistTimer);

        koloArtistTimer = null;

    }

}


/* ==========================================
   OPEN ARTIST PROFILE
========================================== */

function openKoloArtistProfile() {

    if (!koloArtists.length) {
        return;
    }

    const artist =
        koloArtists[koloArtistIndex];

    if (!artist.artist_id) {
        return;
    }

    window.location.href =
        "public_artist.html?artist_id=" +
        encodeURIComponent(
            artist.artist_id
        );

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
    () => {

        loadKoloGallery();

        if (typeof loadKoloArtistsGallery === "function") {
            loadKoloArtistsGallery();
        }

    }
);










/* ==========================================
   OPEN ARTIST PROFILE BY ID
========================================== */

function openKoloArtistProfileById(artistId) {

    if (!artistId) {
        console.error("Artist ID is missing.");
        return;
    }

    window.location.href =
        "public_artist.html?artist_id=" +
        encodeURIComponent(artistId);
}


