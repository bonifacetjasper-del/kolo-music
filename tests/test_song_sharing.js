// Offline DOM/API doubles: no network, real sharing, credentials, or payments.
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const ID = "12345678-1234-1234-1234-123456789abc";
const canonical = `https://kolo-music.vercel.app/song.html?id=${ID}`;
const tick = () => new Promise(resolve => setImmediate(resolve));
class Node {
  constructor() { this.hidden = false; this.events = {}; this.textContent = ""; }
  addEventListener(name, handler) { assert(!this.events[name], "Duplicate handler"); this.events[name] = handler; }
  removeAttribute(name) { delete this[name]; }
  setAttribute(name, value) { this[name] = value; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  click() { return this.events.click?.(); }
}
function browser(navigator = {}) {
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); };
  const root = node("song-sharing");
  root.querySelector = selector => node(/data-share="([^"]+)"/.exec(selector)[1]);
  const context = {URL, URLSearchParams, navigator, console,
    window: {location: {search: `?id=${ID}&token=private&action=download`}},
    document: {getElementById: node, title: ""}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("frontend/js/sharing.js", "utf8"), context);
  return {context, node, root, api: context.window.KOLO_SHARING};
}
const song = {song_id: ID, title: "Song & <title>", artist_name: "Artist", audio_url: "SECRET", payment_id: "SECRET", listener_id: "SECRET"};
(async () => {
  let b = browser();
  assert.equal(b.api.songUrl(ID.toUpperCase()), canonical);
  for (const invalid of [null, {}, 42, "", "invalid", ID + "&token=SECRET", " " + ID, ID + "\n"]) assert.equal(b.api.songUrl(invalid), null);
  const links = b.api.links(ID, song.title, song.artist_name);
  const wa = new URL(links.whatsapp), fb = new URL(links.facebook);
  assert.equal(wa.origin, "https://wa.me");
  assert.equal(wa.searchParams.get("text"), `Discover ${song.title} by Artist on KOLO MUSIC. ${canonical}`);
  assert.equal(fb.origin, "https://www.facebook.com");
  assert.equal(fb.pathname, "/sharer/sharer.php");
  assert.deepEqual([...fb.searchParams], [["u", canonical]]);
  const controller = b.api.mount(b.root);
  assert.equal(b.root.hidden, true);
  assert.strictEqual(b.api.mount(b.root), controller);
  controller.setSong(song); controller.setSong(song);
  assert.equal(b.node("native").hidden, true);
  assert.equal(b.root.hidden, false);
  assert(!b.node("whatsapp").href.includes("SECRET"));
  await b.node("copy").click();
  assert.equal(b.node("url").value, canonical);
  assert(b.node("url").focused && b.node("url").selected);
  controller.clear();
  assert(b.root.hidden && b.node("fallback").hidden);
  assert.equal(b.node("whatsapp").href, undefined);
  controller.setSong({song_id: "invalid"}); assert(b.root.hidden);

  let copied;
  b = browser({clipboard: {async writeText(url) {copied = url;}}});
  b.api.mount(b.root).setSong(song); await b.node("copy").click();
  assert.equal(copied, canonical); assert.equal(b.node("status").textContent, "Link copied!");
  b = browser({clipboard: {async writeText() {throw Error("Denied");}}});
  b.api.mount(b.root).setSong(song); await b.node("copy").click(); assert.equal(b.node("fallback").hidden, false);

  let payload, invoked = false;
  b = browser({share(data) {invoked = true; payload = data; return Promise.resolve();}});
  b.api.mount(b.root).setSong(song); assert.equal(b.node("native").hidden, false);
  const pending = b.node("native").click(); assert(invoked); await pending;
  assert.deepEqual(Object.keys(payload).sort(), ["text", "title", "url"]); assert.equal(payload.url, canonical);
  for (const name of ["AbortError", "NotAllowedError"]) {
    b = browser({share() {return Promise.reject(Object.assign(Error("Sharing stopped"), {name}));}});
    b.api.mount(b.root).setSong(song); await b.node("native").click();
    assert.equal(b.node("fallback").hidden, name === "AbortError");
    if (name === "AbortError") assert.equal(b.node("status").textContent, "");
  }
  // Stale clipboard completion must not expose a cleared/unavailable song.
  let resolveCopy;
  b = browser({clipboard: {writeText() {return new Promise(resolve => {resolveCopy = resolve;});}}});
  const stale = b.api.mount(b.root); stale.setSong(song);
  const copying = b.node("copy").click(); stale.clear(); resolveCopy(); await copying;
  assert(b.root.hidden); assert.equal(b.node("status").textContent, "");

  // Exercise actual song.js availability transitions with the real sharing module.
  for (const outcome of ["success", "404", "malformed", "invalid-id", "duplicate-id"]) {
    b = browser(); let calls = 0;
    if (outcome === "invalid-id") b.context.window.location.search = "?id=invalid";
    if (outcome === "duplicate-id") b.context.window.location.search = `?id=${ID}&id=${ID}`;
    b.context.window.KOLO_API = {async get() {
      calls++;
      if (outcome === "404") throw Object.assign(Error("Unavailable"), {status: 404});
      return outcome === "malformed" ? {song_id: ID, title: ""} : song;
    }};
    vm.runInContext(fs.readFileSync("frontend/js/song.js", "utf8"), b.context);
    assert(b.root.hidden); await tick();
    assert.equal(b.root.hidden, outcome !== "success");
    if (outcome.endsWith("id")) assert.equal(calls, 0);
    if (outcome === "success") {
      assert.equal(b.node("whatsapp").href, links.whatsapp);
      await b.node("retry-button").click(); await tick();
      assert.equal(b.root.hidden, false);
      b.context.window.KOLO_API.get = async () => {throw Object.assign(Error("Gone"), {status: 404});};
      await b.node("retry-button").click(); await tick(); assert(b.root.hidden);
    }
  }
  const html = fs.readFileSync("frontend/song.html", "utf8");
  assert(html.indexOf('src="js/sharing.js"') < html.indexOf('src="js/song.js"'));
  assert(html.includes('id="song-sharing" class="kolo-sharing" aria-labelledby="share-heading" hidden'));
  assert(html.includes('id="share-song-url" data-share="url" type="text" readonly'));
  assert.equal((html.match(/data-share="copy"/g) || []).length, 1);
  console.log("PASS: UUID safety, social URLs, clipboard success/fallback, native support/cancellation, stale operations, metadata refresh, unavailable songs and HTML integration.");
})().catch(error => {console.error(error); process.exitCode = 1;});
