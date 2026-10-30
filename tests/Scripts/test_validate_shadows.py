"""validate.py shadows stage: the no-shadow detector and its file selection."""

from __future__ import annotations

import unittest
from unittest import mock

from scriptsupport import TempDirCase

import validate

SRC = "app/AutoService.WebUI/src/"


class ShadowPatternTests(unittest.TestCase):
    def assert_detected(self, line: str) -> None:
        self.assertIsNotNone(validate.SHADOW_PATTERN.search(line), line)

    def assert_clean(self, line: str) -> None:
        self.assertIsNone(validate.SHADOW_PATTERN.search(line), line)

    def test_shadow_utilities_are_detected(self) -> None:
        for line in (
            'className="shadow-md"',
            'className="rounded shadow"',
            'className="dark:shadow-lg"',
            'className="hover:shadow-xl"',
            "transition-shadow",
            "shadow-none",
        ):
            with self.subTest(line=line):
                self.assert_detected(line)

    def test_css_box_shadow_is_detected(self) -> None:
        self.assert_detected(".card { box-shadow: 0 0 1px #000; }")

    def test_ring_utilities_are_detected(self) -> None:
        for line in (
            'className="ring-2 ring-blue-500"',
            'className="p-2 ring-offset-2"',
            'className="focus-visible:ring-2"',
            'className="inset-ring-1"',
            "className='!ring-2'",
            'className="focus:ring"',
            'className="focus:ring p-2"',
        ):
            with self.subTest(line=line):
                self.assert_detected(line)

    def test_bare_ring_without_a_variant_is_allowed(self) -> None:
        self.assert_clean('className="ring"')

    def test_lookalikes_are_not_detected(self) -> None:
        for line in (
            "const shadowRoot = host.attachShadow();",
            'className="text-shadowless"',
            'data-shadow="x"',
            "spring-boot string-ring springs",
            'className="rounded border p-2"',
        ):
            with self.subTest(line=line):
                self.assert_clean(line)

    def test_arbitrary_shadow_value_with_a_color_function_is_detected(self) -> None:
        self.assert_detected('className="shadow-[0_1px_2px_rgba(0,0,0,0.2)]"')
        self.assert_detected('className="shadow-[0_0_1px_#000]"')

    def test_important_modifier_is_detected_for_shadow_like_for_ring(self) -> None:
        self.assert_detected('className="!ring-2"')
        self.assert_detected('className="!shadow-md"')
        self.assert_detected('className="focus:!shadow-md"')


class StageShadowsTests(TempDirCase):
    def setUp(self) -> None:
        super().setUp()
        patcher = mock.patch.object(validate, "ROOT", self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_clean_src_files_pass(self) -> None:
        self.write(SRC + "A.tsx", 'export const A = () => <div className="p-2" />;\n')
        result = validate.stage_shadows([SRC + "A.tsx"])
        self.assertEqual((result.name, result.status, result.detail), ("shadows", "PASS", []))

    def test_hit_reports_path_line_and_trimmed_text(self) -> None:
        self.write(SRC + "A.tsx", 'const a = 1;\n    <div className="shadow-md" />\n')
        result = validate.stage_shadows([SRC + "A.tsx"])
        self.assertEqual(result.status, "FAIL")
        self.assertEqual(result.detail, [f'{SRC}A.tsx:2: <div className="shadow-md" />'])

    def test_long_lines_are_cut_to_120_characters(self) -> None:
        line = 'x = "shadow-md ' + "a" * 300 + '"'
        self.write(SRC + "A.ts", line + "\n")
        self.assertEqual(validate.stage_shadows([SRC + "A.ts"]).detail, [f"{SRC}A.ts:1: {line[:120]}"])

    def test_css_is_checked(self) -> None:
        self.write(SRC + "index.css", ".a { box-shadow: none; }\n")
        self.assertEqual(validate.stage_shadows([SRC + "index.css"]).status, "FAIL")

    def test_files_outside_webui_src_are_ignored(self) -> None:
        for path in (
            "app/AutoService.WebUI/tests/e2e/a.ts",
            "app/AutoService.ApiService/Thing.ts",
            "tests/Scripts/test_x.ts",
        ):
            self.write(path, 'className="shadow-md"\n')
            self.assertEqual(validate.stage_shadows([path]).status, "PASS", path)

    def test_other_suffixes_under_src_are_ignored(self) -> None:
        self.write(SRC + "notes.md", "shadow-md box-shadow\n")
        self.assertEqual(validate.stage_shadows([SRC + "notes.md"]).status, "PASS")

    def test_every_hit_of_every_file_is_listed(self) -> None:
        self.write(SRC + "A.tsx", "shadow-md\nring-2\n")
        self.write(SRC + "B.css", "a { box-shadow: none }\n")
        result = validate.stage_shadows([SRC + "A.tsx", SRC + "B.css"])
        self.assertEqual(len(result.detail), 3)


if __name__ == "__main__":
    unittest.main()
