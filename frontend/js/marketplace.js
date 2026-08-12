/* ==========================================
   KOLO MUSIC MARKETPLACE SYSTEM
========================================== */

/*
This file controls:

- Trending songs
- Latest releases
- Featured artists
- Song purchasing
*/

/* ==========================================
   LOAD TRENDING SONGS
========================================== */

async function loadTrendingSongs() {
  try {
    const songs = await KOLO_API.get("/marketplace/trending");

    const container = document.getElementById("trendingContainer");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (!songs || songs.length === 0) {
      container.innerHTML = `
                <p>
                    No trending songs available.
                </p>
            `;

      return;
    }

    songs.forEach((song) => {
      container.innerHTML += `

                <div class="music-card">

                    <img
                        src="${song.cover_image || ""}"
                        alt="${song.title || "Song"}"
                    >

                    <div class="music-info">

                        <h3>
                            ${song.title || "Untitled"}
                        </h3>

                        <p>
                            ${song.artist_name || "Unknown Artist"}
                        </p>

                        <p>
                            🔥 ${song.sales || 0} sales
                        </p>

                        <button
                            type="button"
                            onclick="buySong('${song.song_id}')"
                        >
                            🎵 Scream — 50 LD
                        </button>

                    </div>

                </div>

            `;
    });
  } catch (error) {
    console.error("Trending loading error:", error);
  }
}

/* ==========================================
   LOAD ALL SONGS
========================================== */

async function loadSongs() {
  try {
    const response = await KOLO_API.get("/marketplace/songs");

    const container = document.getElementById("songsContainer");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    /*
        The marketplace endpoint may return:

        [
            {...}
        ]

        or:

        {
            songs: [...]
        }
        */

    const songs = Array.isArray(response) ? response : response?.songs || [];

    if (songs.length === 0) {
      container.innerHTML = `
                <p>
                    No songs found.
                </p>
            `;

      return;
    }

    songs.forEach((song) => {
      container.innerHTML += `

                <div class="music-card">

                    <img
                        src="${song.cover_image || ""}"
                        alt="${song.title || "Song"}"
                    >

                    <div class="music-info">

                        <h3>
                            ${song.title || "Untitled"}
                        </h3>

                        <p>
                            ${song.artist_name || "Unknown Artist"}
                        </p>

                        <p>
                            ${song.description || ""}
                        </p>

                        <p>
                            💰 50 LD
                        </p>

                        <button
                            type="button"
                            onclick="buySong('${song.song_id}')"
                        >
                            🎵 Scream — 50 LD
                        </button>

                    </div>

                </div>

            `;
    });
  } catch (error) {
    console.error("Songs loading error:", error);
  }
}

/* ==========================================
   LOAD FEATURED ARTISTS
========================================== */

async function loadArtists() {
  const container = document.getElementById("artistsContainer");

  if (!container) {
    return;
  }

  /*
    For now we display a placeholder.

    We can connect this to:

    GET /marketplace/artist/{artist_id}

    after the main marketplace
    purchase flow is completed.
    */

  container.innerHTML = `

        <div class="artist-card">

            <h3>
                ⭐ Featured Artists
            </h3>

            <p>
                Discover Liberia's best artists.
            </p>

        </div>

    `;
}

/* ==========================================
   BUY / SCREAM SONG
========================================== */

async function buySong(songId) {
  if (!songId) {
    alert("Song information is missing.");

    return;
  }

  /*
    Check whether a user is logged in.
    */

  let user = null;

  if (typeof getSavedUser === "function") {
    user = getSavedUser();
  }

  if (!user) {
    alert("Please login before purchasing a Scream.");

    if (typeof goToLogin === "function") {
      goToLogin();
    }

    return;
  }

  /*
    Confirm the 50 LD purchase.
    */

  const confirmed = confirm(
    "This Scream costs 50 LD.\n\n" +
      "You will receive one listening opportunity " +
      "for this song.\n\n" +
      "Continue?",
  );

  if (!confirmed) {
    return;
  }

  /*
    At this stage we create the payment request.

    Payment proof / Mobile Money confirmation
    will be connected next.
    */

  try {
    const payment = await KOLO_API.post("/payments/create", {
      user_id: user.id,
      song_id: songId,
      amount: 50,
      payment_method: "mobile_money",
    });

    if (!payment) {
      alert("Unable to create payment request.");

      return;
    }

    /*
        Save the payment temporarily so the
        payment-proof page/modal can use it.
        */

    localStorage.setItem("koloPendingPayment", JSON.stringify(payment));

    alert(
      "Scream payment request created.\n\n" +
        "Payment ID: " +
        (payment.payment?.[0]?.id || payment.payment?.id || "Created"),
    );

    /*
        We will connect the actual Mobile Money
        proof upload interface next.
        */
  } catch (error) {
    console.error("BUY SONG ERROR:", error);

    alert("Something went wrong while creating the payment.");
  }
}

/* ==========================================
   START MARKETPLACE
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  console.log("KOLO MUSIC marketplace started");

  loadTrendingSongs();

  loadSongs();

  loadArtists();
});
