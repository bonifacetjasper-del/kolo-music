/* Shares public metadata only; never requests media or purchase access. */
(() => {
  "use strict";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const instances = new WeakMap();
  function songUrl(id) {
    if (typeof id !== "string" || !UUID.test(id)) return null;
    const url = new URL("https://kolo-music.vercel.app/song.html");
    url.search = new URLSearchParams({id: id.toLowerCase()}).toString();
    return url.href;
  }
  function links(id, title, artist) {
    const url = songUrl(id);
    if (!url) return null;
    const text = `Discover ${title || "this song"} by ${artist || "a KOLO MUSIC artist"} on KOLO MUSIC.`;
    const whatsapp = new URL("https://wa.me/");
    whatsapp.search = new URLSearchParams({text: `${text} ${url}`}).toString();
    const facebook = new URL("https://www.facebook.com/sharer/sharer.php");
    facebook.search = new URLSearchParams({u: url}).toString();
    return {url, text, title: title || "KOLO MUSIC", whatsapp: whatsapp.href, facebook: facebook.href};
  }
  function mount(root) {
    if (!root) return null;
    if (instances.has(root)) return instances.get(root);
    const find = name => root.querySelector(`[data-share="${name}"]`);
    const status = find("status"), fallback = find("fallback"), input = find("url");
    const native = find("native"), copy = find("copy");
    let current = null;
    function reset() {
      status.textContent = "";
      fallback.hidden = true;
      input.value = "";
    }
    function manual(data) {
      fallback.hidden = false;
      input.value = data.url;
      status.textContent = "Select and copy the song link below.";
      input.focus();
      input.select();
    }
    copy.addEventListener("click", async () => {
      const data = current;
      if (!data) return;
      reset();
      try {
        await navigator.clipboard.writeText(data.url);
        if (current === data) status.textContent = "Link copied!";
      } catch (_) {
        if (current === data) manual(data);
      }
    });
    native.addEventListener("click", async () => {
      const data = current;
      if (!data || typeof navigator.share !== "function") return;
      reset();
      try {
        // Invoke before any await so the click's user activation is retained.
        await navigator.share({title: data.title, text: data.text, url: data.url});
      } catch (error) {
        if (current === data && error?.name !== "AbortError") manual(data);
      }
    });
    const controller = {
      clear() {
        current = null;
        root.hidden = true;
        reset();
        for (const name of ["whatsapp", "facebook"]) find(name).removeAttribute("href");
      },
      // Caller must supply metadata confirmed by the approved public endpoint.
      setSong(song) {
        controller.clear();
        const data = song && links(song.song_id, song.title, song.artist_name);
        if (!data) return;
        current = data;
        find("whatsapp").href = data.whatsapp;
        find("facebook").href = data.facebook;
        native.hidden = typeof navigator.share !== "function";
        root.hidden = false;
      }
    };
    controller.clear();
    instances.set(root, controller);
    return controller;
  }
  let panelNumber = 0;
  function createPanel() {
    const root = document.createElement("section");
    root.className = "kolo-sharing"; root.hidden = true;
    root.id = `kolo-share-panel-${++panelNumber}`;
    root.setAttribute("aria-label", "Share This Song");
    const actions = document.createElement("div"); actions.className = "share-actions";
    for (const [name, label] of [["whatsapp", "WhatsApp"], ["facebook", "Facebook"], ["copy", "Copy Link"], ["native", "Share to More Apps"]]) {
      const link = name === "whatsapp" || name === "facebook";
      const element = document.createElement(link ? "a" : "button");
      element.setAttribute("data-share", name);
      element.className = `share-button share-${name}`; element.textContent = label;
      if (link) { element.target = "_blank"; element.rel = "noopener noreferrer"; }
      else element.type = "button";
      actions.appendChild(element);
    }
    root.appendChild(actions);
    const status = document.createElement("p"); status.className = "share-status";
    status.setAttribute("data-share", "status"); status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite"); root.appendChild(status);
    const fallback = document.createElement("div"); fallback.className = "share-fallback";
    fallback.setAttribute("data-share", "fallback");
    const input = document.createElement("input"); input.id = `${root.id}-url`;
    input.type = "text"; input.readOnly = true; input.spellcheck = false;
    input.setAttribute("data-share", "url");
    const label = document.createElement("label"); label.htmlFor = input.id; label.textContent = "Public song link";
    fallback.appendChild(label); fallback.appendChild(input); root.appendChild(fallback);
    return {root, controller: mount(root)};
  }
  window.KOLO_SHARING = Object.freeze({songUrl, links, mount, createPanel});
})();
