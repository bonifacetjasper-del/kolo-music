/* =========================================================
   KOLO MUSIC — GLOBAL SEARCH
========================================================= */

let koloSearchTimeout = null;


/* =========================================================
   INITIALIZE SEARCH
========================================================= */

function initializeKoloSearch() {

    const input =
        document.getElementById("koloSearchInput");

    const clearButton =
        document.getElementById("koloSearchClear");

    const results =
        document.getElementById("koloSearchResults");

    if (!input || !results) {
        return;
    }


    input.addEventListener("input", function () {

        const query =
            input.value.trim();

        clearTimeout(koloSearchTimeout);

        if (!query) {

            results.innerHTML = "";

            results.classList.remove(
                "active"
            );

            if (clearButton) {
                clearButton.classList.remove(
                    "visible"
                );
            }

            return;
        }


        if (clearButton) {
            clearButton.classList.add(
                "visible"
            );
        }


        results.innerHTML = `
            <div class="kolo-search-loading">
                Searching KOLO MUSIC...
            </div>
        `;

        results.classList.add("active");


        koloSearchTimeout =
            setTimeout(
                () => searchKoloMusic(query),
                300
            );

    });


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            function () {

                input.value = "";

                results.innerHTML = "";

                results.classList.remove(
                    "active"
                );

                clearButton.classList.remove(
                    "visible"
                );

                input.focus();

            }
        );

    }


    document.addEventListener(
        "click",
        function (event) {

            const wrapper =
                document.querySelector(
                    ".kolo-search-wrapper"
                );

            if (
                wrapper &&
                !wrapper.contains(event.target)
            ) {

                results.classList.remove(
                    "active"
                );

            }

        }
    );

}


/* =========================================================
   SEARCH KOLO MUSIC
========================================================= */

async function searchKoloMusic(query) {

    const results =
        document.getElementById(
            "koloSearchResults"
        );

    if (!results) {
        return;
    }


    try {

        const response =
            await KOLO_API.get(
                `/marketplace/search?query=${encodeURIComponent(query)}`
            );


        if (
            !response ||
            !Array.isArray(response.songs)
        ) {

            throw new Error(
                "Invalid search response"
            );

        }


        renderKoloSearchResults(
            response.songs,
            query
        );


    } catch (error) {

        console.error(
            "KOLO SEARCH ERROR:",
            error
        );

        results.innerHTML = `
            <div class="kolo-search-error">
                Unable to search KOLO MUSIC.
            </div>
        `;

    }

}


/* =========================================================
   RENDER RESULTS
========================================================= */

function renderKoloSearchResults(
    songs,
    query
) {

    const results =
        document.getElementById(
            "koloSearchResults"
        );

    if (!results) {
        return;
    }


    if (!songs.length) {

        results.innerHTML = `
            <div class="kolo-search-empty">

                <strong>No music found</strong>

                <span>
                    No songs matching "${escapeKoloSearchHTML(query)}"
                </span>

            </div>
        `;

        results.classList.add("active");

        return;
    }


    results.innerHTML = `

        <div class="kolo-search-heading">
            <span>SEARCH RESULTS</span>
            <small>${songs.length} found</small>
        </div>

        <div class="kolo-search-list">

            ${songs.map(song => `

                <button
                    type="button"
                    class="kolo-search-result"
                    onclick="openKoloSearchSong('${song.song_id}')"
                >

                    <img
                        src="${
                            escapeKoloSearchHTML(
                                song.cover_image ||
                                "asserts/images/kolo-logo.png"
                            )
                        }"
                        alt=""
                        class="kolo-search-cover"
                    >

                    <span class="kolo-search-song-info">

                        <strong>
                            ${
                                escapeKoloSearchHTML(
                                    song.title ||
                                    "Untitled"
                                )
                            }
                        </strong>

                        <small>
                            ${
                                escapeKoloSearchHTML(
                                    song.artist_name ||
                                    "Unknown Artist"
                                )
                            }
                        </small>

                    </span>

                    <span class="kolo-search-price">
                        50 LD
                    </span>

                </button>

            `).join("")}

        </div>
    `;

    results.classList.add("active");
}


/* =========================================================
   OPEN SEARCH RESULT
========================================================= */

function openKoloSearchSong(songId) {

    if (!songId) {
        return;
    }


    const user =
        typeof getKoloUser === "function"
            ? getKoloUser()
            : null;


    /*
       Visitors go to login first.
    */

    if (!user) {

        window.location.href =
            `login.html?redirect=listener.html&song=${encodeURIComponent(songId)}`;

        return;
    }


    /*
       Logged-in listeners go to Discover.
    */

    window.location.href =
        `listener.html#discover`;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeKoloSearchHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   START SEARCH
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeKoloSearch
);
