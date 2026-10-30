"""validate.py size stage: limits, generated-file exclusions and C# type spans."""

from __future__ import annotations

import unittest
from unittest import mock

from scriptsupport import TempDirCase

import validate


def csharp_class(name: str, members: int) -> list[str]:
    """A class whose span is members + 3 lines."""
    body = [f"    public int P{index} {{ get; set; }}" for index in range(members)]
    return [f"public class {name}", "{", *body, "}"]


class SourceClassificationTests(unittest.TestCase):
    def test_checked_suffixes(self) -> None:
        for suffix in (".cs", ".ts", ".tsx", ".js", ".mjs", ".py"):
            with self.subTest(suffix=suffix):
                self.assertTrue(validate.is_checked_source(f"app/Thing{suffix}"))

    def test_other_suffixes_are_not_checked(self) -> None:
        for name in ("README.md", "data.json", "style.css", "api.http", "query.sql"):
            with self.subTest(name=name):
                self.assertFalse(validate.is_checked_source(f"app/{name}"))

    def test_generated_and_vendored_paths_are_not_checked(self) -> None:
        for path in (
            "app/AutoService.ApiService/Migrations/20240101000000_Init.cs",
            "app/AutoService.ApiService/Migrations/AppDbContextModelSnapshot.cs",
            "app/AutoService.ApiService/Data/Thing.Designer.cs",
            "app/AutoService.WebUI/node_modules/pkg/index.js",
            "app/AutoService.WebUI/dist/assets/index.js",
            "app/AutoService.ApiService/bin/Debug/Gen.cs",
            "app/AutoService.ApiService/obj/Gen.cs",
        ):
            with self.subTest(path=path):
                self.assertFalse(validate.is_checked_source(path))

    def test_test_file_detection(self) -> None:
        for path in (
            "tests/Scripts/test_x.py",
            "tests/AutoService.UnitTests/Thing.cs",
            "app/AutoService.WebUI/tests/e2e/a.ts",
            "app/AutoService.WebUI/src/Thing.spec.tsx",
            "app/AutoService.WebUI/src/Thing.test.ts",
        ):
            with self.subTest(path=path):
                self.assertTrue(validate.is_test_file(path))
        for path in ("app/AutoService.ApiService/Program.cs", "scripts/validate.py"):
            with self.subTest(path=path):
                self.assertFalse(validate.is_test_file(path))


class StageSizeTests(TempDirCase):
    def setUp(self) -> None:
        super().setUp()
        patcher = mock.patch.object(validate, "ROOT", self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)

    def make(self, path: str, lines: int) -> str:
        self.write(path, "line\n" * lines)
        return path

    def test_empty_selection_passes(self) -> None:
        result = validate.stage_size([])
        self.assertEqual((result.name, result.status, result.detail), ("size", "PASS", []))

    def test_source_limit_is_500_lines(self) -> None:
        self.assertEqual(validate.stage_size([self.make("app/Ok.ts", 500)]).status, "PASS")
        result = validate.stage_size([self.make("app/Big.ts", 501)])
        self.assertEqual(result.status, "FAIL")
        self.assertEqual(result.detail, ["app/Big.ts: 501 lines > 500"])

    def test_test_limit_is_250_lines(self) -> None:
        self.assertEqual(validate.stage_size([self.make("tests/ok.py", 250)]).status, "PASS")
        result = validate.stage_size([self.make("tests/big.py", 251)])
        self.assertEqual(result.detail, ["tests/big.py: 251 lines > 250"])

    def test_spec_suffix_uses_the_test_limit_outside_tests_folders(self) -> None:
        result = validate.stage_size([self.make("app/AutoService.WebUI/src/Thing.spec.ts", 251)])
        self.assertEqual(result.status, "FAIL")
        self.assertIn("> 250", result.detail[0])

    def test_source_between_test_and_source_limit_passes(self) -> None:
        self.assertEqual(validate.stage_size([self.make("app/Mid.cs", 400)]).status, "PASS")

    def test_generated_and_non_source_files_are_skipped_whatever_their_size(self) -> None:
        files = [
            self.make("app/AutoService.ApiService/Migrations/M.cs", 1000),
            self.make("app/AutoService.ApiService/Thing.Designer.cs", 1000),
            self.make("docs/notes.md", 1000),
        ]
        self.assertEqual(validate.stage_size(files).status, "PASS")

    def test_every_violation_is_listed(self) -> None:
        files = [self.make("app/A.ts", 501), self.make("tests/b.py", 251)]
        self.assertEqual(len(validate.stage_size(files).detail), 2)

    def test_csharp_type_over_300_lines_is_reported(self) -> None:
        self.write("app/Big.cs", "\n".join(["namespace Demo;", *csharp_class("Big", 298)]) + "\n")
        result = validate.stage_size(["app/Big.cs"])
        self.assertEqual(result.status, "FAIL")
        self.assertEqual(result.detail, ["app/Big.cs: type Big spans 301 lines > 300"])

    def test_csharp_type_of_exactly_300_lines_passes(self) -> None:
        self.write("app/Fits.cs", "\n".join(["namespace Demo;", *csharp_class("Fits", 297)]) + "\n")
        self.assertEqual(validate.stage_size(["app/Fits.cs"]).status, "PASS")


class CsharpTypeSpanTests(unittest.TestCase):
    def test_file_scoped_namespace_type(self) -> None:
        lines = ["namespace Demo;", *csharp_class("Foo", 1)]
        self.assertEqual(validate.csharp_type_spans(lines), [("Foo", 4)])

    def test_block_scoped_namespace_type(self) -> None:
        lines = ["namespace Demo", "{", "    public class A", "    {", "        int x;", "    }", "}"]
        self.assertEqual(validate.csharp_type_spans(lines), [("A", 4)])

    def test_sequential_types_are_reported_separately(self) -> None:
        lines = [*csharp_class("First", 1), "", *csharp_class("Second", 2)]
        self.assertEqual(validate.csharp_type_spans(lines), [("First", 4), ("Second", 5)])

    def test_nested_type_belongs_to_the_outer_span(self) -> None:
        lines = ["public class Outer", "{", "    public class Inner", "    {", "    }", "}"]
        self.assertEqual(validate.csharp_type_spans(lines), [("Outer", 6)])

    def test_interface_struct_and_record_class_are_recognised(self) -> None:
        for keyword in ("interface", "struct", "record", "sealed class", "public sealed record"):
            with self.subTest(keyword=keyword):
                lines = [f"{keyword} Thing", "{", "}"]
                self.assertEqual(validate.csharp_type_spans(lines), [("Thing", 3)])

    def test_semicolon_terminated_declaration_is_not_a_span(self) -> None:
        self.assertEqual(validate.csharp_type_spans(["public record Point(int X, int Y);"]), [])

    def test_no_types(self) -> None:
        self.assertEqual(validate.csharp_type_spans(["using System;", "// class in a comment"]), [])


if __name__ == "__main__":
    unittest.main()
