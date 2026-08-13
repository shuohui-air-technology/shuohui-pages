import tempfile
import unittest
from pathlib import Path

from scripts.content_tools import (
    normalize_date_text,
    parse_front_matter,
    validate_front_matter,
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


if __name__ == "__main__":
    unittest.main()
