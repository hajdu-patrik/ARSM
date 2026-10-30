"""select-e2e-specs.py: spec selection rules for a WebUI diff."""

from __future__ import annotations

import unittest
from unittest import mock

from scriptsupport import TempDirCase, load_script

select = load_script("select-e2e-specs.py", "select_e2e_specs")
AXE = select.AXE_SWEEP_SPEC


class SelectSpecsTests(TempDirCase):
    def setUp(self) -> None:
        super().setUp()
        patcher = mock.patch.object(select, "E2E_DIR", self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_no_files_select_nothing(self) -> None:
        self.assertEqual(select.select_specs([]), set())

    def test_markdown_files_are_ignored_even_under_src(self) -> None:
        self.assertEqual(select.select_specs(["README.md", "src/pages/Login/notes.md"]), set())

    def test_a_changed_spec_selects_itself_without_the_axe_sweep(self) -> None:
        self.write("login-edge.spec.ts")
        self.assertEqual(select.select_specs(["tests/e2e/login-edge.spec.ts"]), {"login-edge"})

    def test_a_changed_page_object_selects_the_specs_importing_it(self) -> None:
        self.write("quotes-a.spec.ts", "import { QuotesPage } from './pages/quotes.page';\n")
        self.write("quotes-b.spec.ts", "import { QuotesPage } from './pages/quotes.page'\n")
        self.write("other.spec.ts", "import { X } from './pages/catalog.page';\n")
        self.assertEqual(select.select_specs(["tests/e2e/pages/quotes.page.ts"]), {"quotes-a", "quotes-b"})

    def test_a_page_object_without_importing_specs_selects_nothing(self) -> None:
        self.write("other.spec.ts", "import { X } from './pages/catalog.page';\n")
        self.assertEqual(select.select_specs(["tests/e2e/pages/unused.page.ts"]), set())

    def test_every_feature_rule_selects_its_specs(self) -> None:
        for prefix, specs in select.FEATURE_SPECS.items():
            path = prefix + "Changed.tsx" if prefix.endswith("/") else prefix
            expected = set(specs) | ({AXE} if path.startswith("src/") else set())
            with self.subTest(path=path):
                self.assertEqual(select.select_specs([path]), expected)

    def test_a_src_rule_hit_adds_the_axe_sweep_and_a_test_support_rule_does_not(self) -> None:
        self.assertIn(AXE, select.select_specs(["src/pages/Login/LoginPage.tsx"]))
        self.assertEqual(select.select_specs(["tests/e2e/support/list-alignment-fixtures.ts"]), {"list-alignment"})

    def test_unmapped_files_select_the_full_suite(self) -> None:
        for path in (
            "package.json", "vite.config.ts", "src/App.tsx", "src/components/Button.tsx", "src/pages/LoadingPage.tsx",
            "src/pages/Unknown/Page.tsx", "tests/e2e/support/sign-in.ts", "tests/e2e/pages/nested/x.page.ts",
            "playwright.config.ts",
        ):
            with self.subTest(path=path):
                self.assertIsNone(select.select_specs([path]))

    def test_one_unmapped_file_forces_the_full_suite_in_any_position(self) -> None:
        mapped = "src/pages/Login/LoginPage.tsx"
        self.assertIsNone(select.select_specs([mapped, "package.json"]))
        self.assertIsNone(select.select_specs(["package.json", mapped]))

    def test_selections_of_several_files_are_united(self) -> None:
        self.write("route-guards.spec.ts")
        files = ["src/pages/Settings/Page.tsx", "tests/e2e/route-guards.spec.ts"]
        self.assertEqual(select.select_specs(files), {"settings-edge", "settings-profile", "settings-password", "settings-picture", "settings-account", "settings-company", AXE, "route-guards"})

    def test_markdown_does_not_mask_an_unmapped_file(self) -> None:
        self.assertIsNone(select.select_specs(["README.md", "package.json"]))


class PatternTests(unittest.TestCase):
    def test_spec_pattern(self) -> None:
        self.assertEqual(select.SPEC_PATTERN.match("tests/e2e/quote-editor.spec.ts").group(1), "quote-editor")
        self.assertIsNone(select.SPEC_PATTERN.match("tests/e2e/pages/x.spec.ts"))
        self.assertIsNone(select.SPEC_PATTERN.match("tests/e2e/x.spec.tsx"))

    def test_page_object_pattern(self) -> None:
        self.assertEqual(select.PAGE_OBJECT_PATTERN.match("tests/e2e/pages/quotes.page.ts").group(1), "quotes")
        self.assertIsNone(select.PAGE_OBJECT_PATTERN.match("tests/e2e/pages/a/b.page.ts"))
        self.assertIsNone(select.PAGE_OBJECT_PATTERN.match("tests/e2e/other/b.page.ts"))


class SpecsUsingPageObjectTests(TempDirCase):
    def test_finds_only_specs_with_the_import_needle(self) -> None:
        self.write("a.spec.ts", "import { P } from './pages/quotes.page';\n")
        self.write("b.spec.ts", "// no import\n")
        self.write("helper.ts", "import { P } from './pages/quotes.page';\n")
        with mock.patch.object(select, "E2E_DIR", self.tmp):
            self.assertEqual(select.specs_using_page_object("quotes"), {"a"})


if __name__ == "__main__":
    unittest.main()
