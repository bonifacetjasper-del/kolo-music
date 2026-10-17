"""Offline preview tests: mocked database, no environment loading or network."""
import importlib.util
import json
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch
from html.parser import HTMLParser
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
ID = "12345678-1234-1234-1234-123456789abc"
OTHER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
HOST = "https://example.supabase.co"


class Database:
    def __init__(self):
        self.rows = {}; self.fail = False; self.queries = []
    def table(self, table):
        owner = self
        class Query:
            def __init__(self): self.filters = {}
            def select(self, value):
                assert "audio" not in value and "*" not in value
                return self
            def eq(self, key, value): self.filters[key] = value; return self
            def limit(self, value): return self
            def execute(self):
                owner.queries.append((table, self.filters))
                if owner.fail: raise RuntimeError("SECRET database error")
                if table == "artists": return SimpleNamespace(data=[{"artist_name": 'Artist "<& 音'}])
                row = owner.rows.get(self.filters.get("id"))
                return SimpleNamespace(data=[row] if row and row["status"] == self.filters.get("status") else [])
        return Query()


class Head(HTMLParser):
    def __init__(self, html):
        super().__init__(); self.tags = {}; self.feed(html)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta": self.tags[a.get("property", a.get("name"))] = a.get("content")
        if tag == "link" and a.get("rel") == "canonical": self.tags["canonical"] = a["href"]


class PreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = Database(); database = ModuleType("backend.database"); database.supabase = cls.db
        def load(name, path):
            spec = importlib.util.spec_from_file_location(name, ROOT / path)
            mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod
        with patch.dict(sys.modules, {"backend.database": database}):
            marketplace = load("preview_marketplace_test", "backend/routes/marketplace.py")
            with patch.dict(sys.modules, {"backend.routes.marketplace": marketplace}):
                cls.preview = load("preview_test", "backend/routes/song_preview.py")
        app = FastAPI(); app.include_router(cls.preview.router); cls.client = TestClient(app)

    def setUp(self):
        self.db.fail = False; self.db.queries = []
        self.db.rows = {ID: {"id": ID, "status": "approved", "title": 'Song "<& 音',
                            "artist_id": OTHER, "cover_image": HOST + "/storage/v1/object/public/covers/a/cover.png"}}
        self.env = patch.dict("os.environ", {"SUPABASE_URL": HOST}); self.env.start(); self.addCleanup(self.env.stop)

    def test_initial_html_and_browser_dom(self):
        response = self.client.get(f"/song.html?id={ID}&payment_id=SECRET", headers={"host": "evil.example"})
        self.assertEqual(response.status_code, 200); self.assertEqual(response.headers["cache-control"], "no-store")
        head = Head(response.text)
        self.assertEqual(head.tags["canonical"], "https://kolo-music.vercel.app/song.html?id=" + ID)
        self.assertEqual(head.tags["og:url"], head.tags["canonical"])
        self.assertEqual(head.tags["og:image"], self.db.rows[ID]["cover_image"])
        self.assertIn('Song "<& 音', head.tags["og:title"])
        self.assertIn('Artist "<& 音', head.tags["description"])
        self.assertIn("&quot;&lt;&amp;", response.text); self.assertNotIn("SECRET", response.text)
        self.assertEqual(head.tags["twitter:card"], "summary_large_image")
        self.assertEqual(response.text, self.client.get(f"/song.html?id={ID}", headers={"user-agent": "facebookexternalhit/1.1"}).text)
        for marker in ['id="song-sharing"', 'src="js/song.js"']:
            self.assertIn(marker, response.text)
        self.assertTrue(all(filters.get("status") == "approved" for table, filters in self.db.queries if table == "songs"))

    def test_invalid_parameters(self):
        for query in ["", "?id=bad", f"?id={ID}&id={ID}", f"?id={ID}%0A"]:
            r = self.client.get("/song.html" + query); self.assertEqual(r.status_code, 400)
            self.assertNotIn("og:title", r.text)
        self.assertEqual(self.db.queries, [])

    def test_nonpublic_missing_and_failure(self):
        for status in ["pending", "rejected", "unavailable"]:
            self.db.rows[ID]["status"] = status
            r = self.client.get(f"/song.html?id={ID}"); self.assertEqual(r.status_code, 404)
            self.assertNotIn("og:image", r.text); self.assertNotIn("Song &quot;", r.text)
        self.db.rows.clear(); self.assertEqual(self.client.get(f"/song.html?id={ID}").status_code, 404)
        self.db.fail = True; r = self.client.get(f"/song.html?id={ID}")
        self.assertEqual(r.status_code, 503); self.assertNotIn("SECRET", r.text)

    def test_cover_allowlist(self):
        for url in [None, "http://example.supabase.co/storage/v1/object/public/covers/a.png",
                    "https://evil.example/storage/v1/object/public/covers/a.png",
                    HOST + "/storage/v1/object/sign/covers/a.png?token=SECRET",
                    HOST + "/storage/v1/object/public/audio/a.png",
                    HOST + "/storage/v1/object/public/covers/../audio/a.png",
                    HOST + "/storage/v1/object/public/covers/%2e%2e/audio/a.png",
                    HOST + "/storage/v1/object/public/covers/a.png?token=x",
                    HOST + "/storage/v1/object/public/covers/a.svg"]:
            self.assertEqual(self.preview.cover_url(url), self.preview.FALLBACK)

    def test_isolation_and_routing(self):
        self.db.rows[OTHER] = {**self.db.rows[ID], "id": OTHER, "title": "Second song"}
        first = Head(self.client.get(f"/song.html?id={ID}").text)
        second = Head(self.client.get(f"/song.html?id={OTHER}").text)
        self.assertNotEqual(first.tags["og:title"], second.tags["og:title"])
        self.assertTrue(second.tags["canonical"].endswith(OTHER))
        config = json.loads((ROOT / "vercel.json").read_text())
        self.assertEqual(config["routes"][0], {"src": r"/song\.html", "dest": "api/index.py"})
        self.assertEqual(config["routes"][1]["src"], "/api/(.*)")
        self.assertIn("frontend/song.html", config["builds"][0]["config"]["includeFiles"])


if __name__ == "__main__": unittest.main()
