import json
import tempfile
import unittest
from pathlib import Path

from scripts.sync_sections import (
    load_sections,
    render_section_index,
    sync_sections,
    validate_sections,
)


VALID_REGISTRY = {
    "sections": [
        {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": True},
        {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
    ]
}


class SectionRegistryTests(unittest.TestCase):
    def test_load_sections_reads_current_registry_shape(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sections.json"
            path.write_text(
                json.dumps(VALID_REGISTRY, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            self.assertEqual(load_sections(path), VALID_REGISTRY["sections"])

    def test_validate_sections_accepts_current_layout(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])

            validate_sections(VALID_REGISTRY["sections"], root / "content")

    def test_validate_sections_rejects_duplicate_slugs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": True},
                {"name": "随笔", "slug": "math", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, "slug.*math"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_invalid_slug(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {
                    "name": "学术推导与笔记",
                    "slug": "Math Notes",
                    "weight": 10,
                    "math": True,
                },
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, "slug.*Math Notes"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_non_integer_weight(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {
                    "name": "学术推导与笔记",
                    "slug": "math",
                    "weight": "10",
                    "math": True,
                },
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, "weight.*math"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_missing_name(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {"name": "", "slug": "math", "weight": 10, "math": True},
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, "name.*math"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_unregistered_existing_content_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {"name": "学术推导与笔记", "slug": "math-notes", "weight": 10, "math": True},
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(
                ValueError,
                r"^content/math: existing section directory is not registered$",
            ):
                validate_sections(sections, root / "content")

    def test_render_section_index_matches_current_acgn_semantics(self):
        rendered = render_section_index(
            {"name": "随笔", "slug": "acgn", "weight": 20, "math": False}
        )

        self.assertEqual(
            rendered,
            '---\n'
            'title: "随笔"\n'
            "menu:\n"
            "  main:\n"
            '    name: "随笔"\n'
            "    weight: 20\n"
            "---\n",
        )

    def test_sync_sections_accepts_current_repository_layout(self):
        repository_root = Path(__file__).resolve().parents[1]
        sync_sections(repository_root)

    def _write_content_layout(self, repo_root: Path, section_slugs: list[str]) -> None:
        content_root = repo_root / "content"
        content_root.mkdir()
        (content_root / "_index.md").write_text("---\ntitle: Home\n---\n", encoding="utf-8")
        for slug in section_slugs:
            section_dir = content_root / slug
            section_dir.mkdir()
            (section_dir / "_index.md").write_text(
                f'---\ntitle: "{slug}"\n---\n',
                encoding="utf-8",
            )


if __name__ == "__main__":
    unittest.main()
