"""test_suite_secrets.py OutputSanitizer: secret values, URIs, assignments, JSON fields and local paths."""

from __future__ import annotations

import json
import uuid

from scriptsupport import TempDirCase

from test_suite_secrets import OutputSanitizer


def fake_secret(prefix: str = "zz") -> str:
    """A unique, obviously fake value built at run time."""
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class SanitizerTests(TempDirCase):
    def setUp(self) -> None:
        super().setUp()
        self.root = self.tmp.resolve()

    def sanitizer(self, *values: str) -> OutputSanitizer:
        return OutputSanitizer(self.root, values)

    def test_clean_text_is_unchanged(self) -> None:
        text = "[INFO] Running http suite... tests/API/x.http failed"
        self.assertEqual(self.sanitizer().sanitize(text), text)

    def test_loaded_secret_values_are_redacted(self) -> None:
        secret = fake_secret()
        out = self.sanitizer(secret).sanitize(f"logged in with {secret} twice {secret}")
        self.assertNotIn(secret, out)
        self.assertEqual(out.count("<redacted>"), 2)

    def test_values_shorter_than_four_characters_and_empty_ones_are_ignored(self) -> None:
        sanitizer = self.sanitizer("abc", "")
        self.assertEqual(sanitizer.sanitize("abc stays"), "abc stays")
        self.assertEqual(self.sanitizer("abcd").sanitize("abcd"), "<redacted>")

    def test_longer_secrets_are_replaced_before_their_prefixes(self) -> None:
        sanitizer = self.sanitizer("abcd", "abcd1234", "abcd", "ab")
        self.assertEqual(sanitizer.secret_values, ["abcd1234", "abcd"])
        self.assertEqual(sanitizer.sanitize("id abcd1234 end"), "id <redacted> end")

    def test_repository_root_becomes_a_placeholder(self) -> None:
        for spelling in (str(self.root), self.root.as_posix()):
            with self.subTest(spelling=spelling):
                out = self.sanitizer().sanitize(f"failed in {spelling}")
                self.assertIn("<repo>", out)
                self.assertNotIn(spelling, out)

    def test_postgres_uris_are_redacted_whole(self) -> None:
        password = fake_secret("pw")
        for scheme in ("postgres", "postgresql", "POSTGRESQL"):
            with self.subTest(scheme=scheme):
                out = self.sanitizer().sanitize(f"conn {scheme}://app_user:{password}@db.example.test:5432/app next")
                for leaked in (password, "app_user", "db.example.test"):
                    self.assertNotIn(leaked, out)
                self.assertIn("<redacted>", out)

    def test_secret_shaped_assignments_are_redacted(self) -> None:
        names = ("password", "passwd", "secret", "token", "authorization", "cookie", "connectionstring", "pgpassword")
        forms = (lambda n, v: f"{n}={v}", lambda n, v: f"{n.upper()}: {v}", lambda n, v: f"{n}: {v}, next=1")
        for name in names:
            for index, form in enumerate(forms):
                value = fake_secret()
                with self.subTest(name=name, form=index):
                    out = self.sanitizer().sanitize(form(name, value))
                    self.assertNotIn(value, out)
                    self.assertIn("<redacted>", out)

    def test_other_assignments_stay_readable(self) -> None:
        self.assertEqual(self.sanitizer().sanitize("username=alice mode=fast"), "username=alice mode=fast")

    def test_authorization_header_scheme_and_credentials_are_both_redacted(self) -> None:
        token = fake_secret()
        out = self.sanitizer().sanitize(f"Authorization: Bearer {token}")
        self.assertNotIn(token, out)

    def test_secret_named_json_fields_lose_their_value_but_keep_neighbours(self) -> None:
        fields = ("password", "accessToken", "refreshToken", "Set-Cookie", "cookie", "connectionString", "clientSecret",
                  "authorization", "pgPassword")
        for field in fields:
            value = fake_secret()
            with self.subTest(field=field):
                out = self.sanitizer().sanitize(json.dumps({field: value, "name": "visible-neighbour"}))
                self.assertNotIn(value, out)
                self.assertIn("visible-neighbour", out)

    def test_multi_cookie_value_is_replaced_as_a_whole(self) -> None:
        first, second = fake_secret("sid"), fake_secret("other")
        header = json.dumps({"set-cookie": f"{first}=1; Path=/; HttpOnly, {second}=2; Secure"})
        out = self.sanitizer().sanitize(header)
        self.assertNotIn(first, out)
        self.assertNotIn(second, out)

    def test_windows_paths_are_masked(self) -> None:
        for path in (r"C:\Users\someone\project\file.txt", "D:/work/someone/repo/x.py"):
            with self.subTest(path=path):
                out = self.sanitizer().sanitize(f"open {path} failed")
                self.assertNotIn("someone", out)
                self.assertIn("<local-path>", out)

    def test_unix_paths_are_masked_but_api_routes_survive(self) -> None:
        out = self.sanitizer().sanitize("read /home/someone/project/x.py after GET /api/auth/login")
        self.assertNotIn("someone", out)
        self.assertIn("/api/auth/login", out)
        for route in ("/api/quotes", "/health", "/alive"):
            self.assertEqual(OutputSanitizer._sanitize_unix_path(_Match(route)), route)
        self.assertEqual(OutputSanitizer._sanitize_unix_path(_Match("/tmp/x")), "<local-path>")

    def test_relative_repository_paths_stay(self) -> None:
        self.assertEqual(self.sanitizer().sanitize("tests/API/x.http:12"), "tests/API/x.http:12")


class _Match:
    """Minimal re.Match stand-in for the static path callback."""

    def __init__(self, value: str) -> None:
        self.value = value

    def group(self, _index: int) -> str:
        return self.value


if __name__ == "__main__":
    import unittest

    unittest.main()
