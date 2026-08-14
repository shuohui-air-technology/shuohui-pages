import tempfile
import unittest
from pathlib import Path

from scripts.content_tools import (
    iter_markdown_files,
    normalize_files,
    normalize_date_text,
    parse_front_matter,
    validate_markdown_structure,
    validate_front_matter,
    validate_files,
)


class ContentToolsTests(unittest.TestCase):
    def test_normalize_date_text_adds_missing_seconds(self):
        source = "---\ndate: 2026-06-15T20:37\n---\n"
        self.assertIn("date: 2026-06-15T20:37:00", normalize_date_text(source))

    def test_normalize_date_text_preserves_existing_seconds(self):
        source = "---\ndate: 2026-06-15T20:37:00\n---\n"
        self.assertEqual(source, normalize_date_text(source))

    def test_parse_front_matter_reads_scalar_types(self):
        parsed = parse_front_matter(
            "---\ntitle: Example\ndraft: false\nmath: true\ncover: null\n---\n"
        )
        self.assertEqual(parsed["title"], "Example")
        self.assertIs(parsed["draft"], False)
        self.assertIs(parsed["math"], True)
        self.assertIsNone(parsed["cover"])

    def test_validate_front_matter_allows_intentional_draft(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "draft.md"
            path.write_text(
                "---\ntitle: Draft\ndate: 2026-06-09T10:24:00\n"
                "draft: true\nmath: false\n---\ntext\n",
                encoding="utf-8",
            )
            self.assertEqual(validate_front_matter(path), [])

    def test_validate_front_matter_rejects_invalid_date_and_boolean(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.md"
            path.write_text(
                "---\ntitle: Invalid\ndate: 2026-06-09T10:24\n"
                "draft: maybe\n---\ntext\n",
                encoding="utf-8",
            )
            errors = validate_front_matter(path)
            self.assertTrue(any("date" in error for error in errors))
            self.assertTrue(any("draft" in error for error in errors))

    def test_validate_front_matter_reports_null_date_as_invalid(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "null-date.md"
            path.write_text(
                "---\ntitle: Null Date\ndate: null\n---\ntext\n",
                encoding="utf-8",
            )
            errors = validate_front_matter(path)
            self.assertTrue(any("date: invalid" in error for error in errors))
            self.assertFalse(any("date: missing" in error for error in errors))

    def test_validate_markdown_structure_flags_unformatted_boundaries(self):
        source = (
            "---\ntitle: Example\ndate: 2026-08-14T10:00:00\n---\n\n"
            "1.Agent\n"
            "这是一个用于说明段落分隔问题的较长文本，后面本应是一个新的段落。\n"
            "优点：\n"
            "这是优点内容。\n"
        )

        errors = validate_markdown_structure(source)

        self.assertTrue(any("ordered list marker" in error for error in errors))
        self.assertTrue(any("standalone label" in error for error in errors))
        self.assertTrue(any("paragraph boundary" in error for error in errors))

    def test_validate_front_matter_allows_section_index_without_date(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "_index.md"
            path.write_text(
                "---\ntitle: Section Index\n---\ntext\n",
                encoding="utf-8",
            )
            self.assertEqual(validate_front_matter(path), [])

    def test_iter_markdown_files_includes_section_index_files(self):
        with tempfile.TemporaryDirectory() as directory:
            content_dir = Path(directory)
            (content_dir / "section").mkdir()
            (content_dir / "section" / "_index.md").write_text(
                "---\ntitle: Section\ndate: 2026-06-09T10:24\n---\n",
                encoding="utf-8",
            )
            (content_dir / "section" / "post.md").write_text(
                "---\ntitle: Post\ndate: 2026-06-09T10:24:00\n---\n",
                encoding="utf-8",
            )
            files = [path.name for path in iter_markdown_files(content_dir)]
            self.assertEqual(files, ["_index.md", "post.md"])

    def test_normalize_and_validate_include_section_index_files(self):
        with tempfile.TemporaryDirectory() as directory:
            content_dir = Path(directory)
            (content_dir / "section").mkdir()
            index_path = content_dir / "section" / "_index.md"
            index_path.write_text(
                "---\ntitle: Section\ndate: 2026-06-09T10:24\n---\n",
                encoding="utf-8",
            )
            self.assertEqual(normalize_files(content_dir), 1)
            self.assertIn("10:24:00", index_path.read_text(encoding="utf-8"))
            self.assertEqual(validate_files(content_dir), [])

    def test_parse_front_matter_preserves_intentional_draft(self):
        parsed = parse_front_matter(
            "---\ntitle: Draft\ndraft: true\nmath: false\n---\n"
        )
        self.assertIs(parsed["draft"], True)


if __name__ == "__main__":
    unittest.main()
