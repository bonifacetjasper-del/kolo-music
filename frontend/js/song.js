/* Public metadata only. No playback, payment, or entitlement operations. */
(() => {
  "use strict";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const FALLBACK = "asserts/images/kolo-logo.png";
  const IMAGE_ORIGIN = "https://cgecltllioogvmfrnkyg.supabase.co";
  const byId = id => document.getElementById(id);
  let loading = false;
  let loadedSongId = null;
  const sharing = window.KOLO_SHARING?.mount(byId("song-sharing"));

  function coverUrl(value) {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value);
      if (url.origin !== IMAGE_ORIGIN || url.username || url.password
          || !url.pathname.startsWith("/storage/v1/object/public/covers/")
          || url.search || url.hash) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  }

  function showState(title, message, retry = false) {
    loadedSongId = null;
    sharing?.clear();
    byId("song-content").hidden = true;
    byId("page-state").hidden = false;
    byId("state-title").textContent = title;
    byId("state-message").textContent = message;
    byId("retry-button").hidden = !retry;
  }

  async function loadSong() {
    if (loading) return;
    const ids = new URLSearchParams(window.location.search).getAll("id");
    if (ids.length !== 1 || !UUID.test(ids[0])) {
      showState("This song link is invalid", "Use a complete KOLO MUSIC song link, or return home to discover music.");
      byId("song-page").setAttribute("aria-busy", "false");
      return;
    }
    const songId = ids[0];
    loading = true;
    byId("song-page").setAttribute("aria-busy", "true");
    showState("Finding your song…", "Loading song information from KOLO MUSIC.");
    try {
      if (!window.KOLO_API || typeof window.KOLO_API.get !== "function") {
        throw new Error("API unavailable");
      }
      const song = await window.KOLO_API.get(`/marketplace/song/${encodeURIComponent(songId)}`);
      // Approval is enforced by the public endpoint. Do not load artist dashboards.
      if (!song || typeof song !== "object" || Array.isArray(song)
          || typeof song.song_id !== "string" || !UUID.test(song.song_id)
          || song.song_id.toLowerCase() !== songId.toLowerCase()
          || typeof song.title !== "string" || !song.title.trim()) {
        throw new Error("Invalid metadata response");
      }
      const title = song.title.trim();
      byId("song-title").textContent = title;
      byId("song-artist").textContent = typeof song.artist_name === "string"
        && song.artist_name.trim() ? song.artist_name : "Unknown artist";
      const description = typeof song.description === "string" ? song.description.trim() : "";
      byId("song-description").textContent = description;
      byId("song-description").hidden = !description;
      const image = byId("song-cover");
      image.alt = `Cover for ${title}`;
      image.onerror = () => {
        image.onerror = null;
        image.src = FALLBACK;
        image.alt = "KOLO MUSIC cover placeholder";
      };
      image.src = coverUrl(song.cover_image) || FALLBACK;
      const artistLink = byId("artist-link");
      artistLink.hidden = true;
      artistLink.removeAttribute("href");
      if (typeof song.artist_id === "string" && UUID.test(song.artist_id)) {
        artistLink.href = `public_artist.html?artist_id=${encodeURIComponent(song.artist_id)}`;
        artistLink.hidden = false;
      }
      document.title = `${title} | KOLO MUSIC`;
      byId("page-state").hidden = true;
      byId("song-content").hidden = false;
      loadedSongId = song.song_id;
      sharing?.setSong({song_id: song.song_id, title, artist_name: byId("song-artist").textContent});
    } catch (error) {
      if (error && error.status === 404) {
        showState("This song is unavailable", "The song may no longer be available. Explore more music on KOLO MUSIC.");
      } else {
        showState("We couldn’t load this song", "Check your connection and try again. KOLO MUSIC may also be temporarily unavailable.", true);
      }
    } finally {
      loading = false;
      byId("song-page").setAttribute("aria-busy", "false");
    }
  }

  byId("retry-button").addEventListener("click", loadSong);
  loadSong();
})();
