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

    const response =
      await KOLO_API.get("/marketplace/songs");

    const container =
      document.getElementById("songsContainer");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    const songs =
      Array.isArray(response)
        ? response
        : response?.songs || [];

    if (songs.length === 0) {

      container.innerHTML =
        "<p>No songs found.</p>";

      return;
    }

    songs.forEach((song) => {

      const card =
        document.createElement("div");

      card.className =
        "music-card";

      const image =
        document.createElement("img");

      image.src =
        song.cover_image || "";

      image.alt =
        song.title || "Song";

      const info =
        document.createElement("div");

      info.className =
        "music-info";

      const title =
        document.createElement("h3");

      title.textContent =
        song.title || "Untitled";

      const artist =
        document.createElement("p");

      artist.textContent =
        song.artist_name || "Unknown Artist";

      const description =
        document.createElement("p");

      description.textContent =
        song.description || "";

      const price =
        document.createElement("p");

      price.textContent =
        "50 LD";

      const button =
        document.createElement("button");

      button.type = "button";

      button.textContent =
        "Scream - 50 LD";

      button.addEventListener(
        "click",
        () => buySong(song.song_id)
      );

      info.appendChild(title);
      info.appendChild(artist);
      info.appendChild(description);
      info.appendChild(price);
      info.appendChild(button);

      card.appendChild(image);
      card.appendChild(info);

      container.appendChild(card);

    });

  } catch (error) {

    console.error(
      "Songs loading error:",
      error
    );

  }

}

/* ==========================================
   LOAD FEATURED ARTISTS
========================================== */

async function loadArtists() {

  const container =
    document.getElementById("artistsContainer");

  if (!container) {
    return;
  }

  try {

    const response =
      await KOLO_API.get("/marketplace/songs");

    const songs =
      Array.isArray(response)
        ? response
        : response?.songs || [];

    if (!songs.length) {

      container.innerHTML =
        "<p>No featured artists available.</p>";

      return;
    }

    const artists = [];
    const seenArtistIds = new Set();

    songs.forEach((song) => {

      const artistId =
        song.artist_id;

      if (!artistId) {
        return;
      }

      if (seenArtistIds.has(artistId)) {
        return;
      }

      seenArtistIds.add(artistId);

      artists.push({
        artist_id: artistId,

        artist_name:
          song.artist_name ||
          "Unknown Artist",

        cover_image:
          song.cover_image || ""
      });

    });

    if (!artists.length) {

      container.innerHTML =
        "<p>No featured artists available.</p>";

      return;
    }

    container.innerHTML = "";

    artists.forEach((artist) => {

      const card =
        document.createElement("div");

      card.className =
        "artist-card";

      const image =
        document.createElement("img");

      image.src =
        artist.cover_image ||
        "./asserts/images/kolo-logo.png";

      image.alt =
        artist.artist_name;

      image.onerror = function () {

        this.src =
          "./asserts/images/kolo-logo.png";

      };

      const name =
        document.createElement("h3");

      name.textContent =
        artist.artist_name;

      const button =
        document.createElement("button");

      button.type = "button";

      button.textContent =
        "View Artist";

      button.addEventListener(
        "click",
        () => {

          window.location.href =
            "./public_artist.html?artist_id=" +
            encodeURIComponent(
              artist.artist_id
            );

        }
      );

      card.appendChild(image);
      card.appendChild(name);
      card.appendChild(button);

      container.appendChild(card);

    });

  } catch (error) {

    console.error(
      "Featured artists loading error:",
      error
    );

    container.innerHTML =
      "<p>Unable to load featured artists.</p>";

  }

}
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


