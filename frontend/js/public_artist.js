/* =========================================================
   KOLO MUSIC — PUBLIC ARTIST PROFILE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    loadPublicArtistProfile();
});


/* =========================================================
   GET ARTIST ID FROM URL
   Example:
   public_artist.html?artist_id=123
   ========================================================= */

function getPublicArtistId() {

    const params =
        new URLSearchParams(window.location.search);

    return params.get("artist_id");
}


/* =========================================================
   LOAD PUBLIC ARTIST PROFILE
   ========================================================= */

async function loadPublicArtistProfile() {

    const artistId =
        getPublicArtistId();

    if (!artistId) {

        showPublicArtistError(
            "Artist profile was not specified."
        );

        return;
    }

    try {

        const response =
            await KOLO_API.get(
                `/marketplace/artist/${encodeURIComponent(artistId)}`
            );

        if (!response) {
            throw new Error(
                "Artist profile not found."
            );
        }


        /* ==========================================
           ARTIST INFORMATION
        =========================================== */

        const nameElement =
            document.getElementById(
                "publicArtistName"
            );

        const bioElement =
            document.getElementById(
                "publicArtistBio"
            );

        const photoElement =
            document.getElementById(
                "publicArtistPhoto"
            );

        const countElement =
            document.getElementById(
                "publicArtistSongCount"
            );


        if (nameElement) {

            nameElement.textContent =
                response.artist_name ||
                "Artist";

        }


        if (bioElement) {

            bioElement.textContent =
                response.bio ||
                "This artist has not added a biography yet.";

        }


        if (
            photoElement &&
            response.profile_photo_url
        ) {

            photoElement.src =
                response.profile_photo_url;

        }


        if (countElement) {

            const count =
                Number(response.songs_uploaded || 0);

            countElement.textContent =
                `${count} approved song${count === 1 ? "" : "s"}`;

        }


        /* ==========================================
           RENDER SONGS
        =========================================== */

        renderPublicArtistSongs(
            response.songs || []
        );


    } catch (error) {

        console.error(
            "PUBLIC ARTIST PROFILE ERROR:",
            error
        );

        showPublicArtistError(
            error?.message ||
            "Unable to load artist profile."
        );

    }

}


/* =========================================================
   RENDER PUBLIC SONGS
========================================================= */

function renderPublicArtistSongs(songs) {

    const container =
        document.getElementById(
            "publicArtistSongsContainer"
        );

    const message =
        document.getElementById(
            "publicArtistSongsMessage"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !Array.isArray(songs) ||
        songs.length === 0
    ) {

        if (message) {

            message.textContent =
                "This artist has no approved songs yet.";

        }

        return;
    }


    if (message) {

        message.textContent =
            `${songs.length} approved song${songs.length === 1 ? "" : "s"}.`;

    }


    songs.forEach(song => {

        const card =
            document.createElement("article");

        card.className =
            "public-song-card";


        /* ==========================================
           COVER
        =========================================== */

        const cover =
            document.createElement("img");

        cover.className =
            "public-song-cover";

        cover.src =
            song.cover_image ||
            "asserts/images/kolo-logo.png";

        cover.alt =
            song.title ||
            "KOLO MUSIC";

        cover.onerror = function () {

            this.src =
                "asserts/images/kolo-logo.png";

        };


        /* ==========================================
           SONG INFORMATION
        =========================================== */

        const info =
            document.createElement("div");

        info.className =
            "public-song-info";


        const title =
            document.createElement("h3");

        title.textContent =
            song.title ||
            "Untitled";


        const description =
            document.createElement("p");

        description.textContent =
            song.description ||
            "No description available.";


        /* ==========================================
           PRICE
        =========================================== */

        const price =
            document.createElement("span");

        price.className =
            "public-song-price";

        price.textContent =
            `${song.price || 50} ${song.currency || "LD"} per scream`;


        /* ==========================================
           SCREAM BUTTON
        =========================================== */

        const screamButton =
            document.createElement("button");

        screamButton.type =
            "button";

        screamButton.className =
            "public-scream-button";

        screamButton.textContent =
            `🎵 Scream — ${song.price || 50} ${song.currency || "LD"}`;


        screamButton.addEventListener(
            "click",
            () => {

                startPublicSongPayment(
                    song
                );

            }
        );


        info.appendChild(title);
        info.appendChild(description);
        info.appendChild(price);
        info.appendChild(screamButton);


        card.appendChild(cover);
        card.appendChild(info);


        container.appendChild(card);

    });

}


/* =========================================================
   START PUBLIC SONG PAYMENT
========================================================= */

function startPublicSongPayment(song) {

    const user =
        JSON.parse(
            localStorage.getItem("koloUser") || "null"
        );


    /*
       A visitor must log in before purchasing.
    */

    if (!user) {

        const returnUrl =
            `public_artist.html?artist_id=${encodeURIComponent(
                getPublicArtistId()
            )}`;


        window.location.href =
            `login.html?return=${encodeURIComponent(
                returnUrl
            )}`;

        return;
    }


    /*
       We intentionally do NOT play the song here.

       Payment/access should happen through the
       existing KOLO MUSIC listener payment flow.
    */

    window.location.href =
        `listener.html?song_id=${encodeURIComponent(
            song.song_id
        )}`;

}


/* =========================================================
   ERROR DISPLAY
========================================================= */

function showPublicArtistError(message) {

    const messageElement =
        document.getElementById(
            "publicArtistSongsMessage"
        );

    if (messageElement) {

        messageElement.textContent =
            message;

    }

    const nameElement =
        document.getElementById(
            "publicArtistName"
        );

    if (nameElement) {

        nameElement.textContent =
            "Artist Profile";

    }

}
