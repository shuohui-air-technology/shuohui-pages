import csv
import tempfile
import unittest
from pathlib import Path

from scripts.check_content_outputs import check_content_outputs


HEADER = [
    "path",
    "slug",
    "title",
    "date",
    "expiryDate",
    "publishDate",
    "draft",
    "permalink",
    "kind",
    "section",
]


def write_hugo_list(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=HEADER)
        writer.writeheader()
        writer.writerows(rows)


class ContentOutputTests(unittest.TestCase):
    def test_published_pages_are_required_and_drafts_are_forbidden(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            published = public / "acgn/published/index.html"
            published.parent.mkdir(parents=True)
            published.write_text("published", encoding="utf-8")
            hugo_list = root / "hugo-list.csv"
            write_hugo_list(
                hugo_list,
                [
                    {
                        "path": "content/acgn/published.md",
                        "slug": "",
                        "title": "Published",
                        "date": "2026-08-14T10:00:00Z",
                        "expiryDate": "0001-01-01T00:00:00Z",
                        "publishDate": "2026-08-14T10:00:00Z",
                        "draft": "false",
                        "permalink": "https://example.com/acgn/published/",
                        "kind": "page",
                        "section": "acgn",
                    },
                    {
                        "path": "content/acgn/draft.md",
                        "slug": "",
                        "title": "Draft",
                        "date": "2026-08-14T11:00:00Z",
                        "expiryDate": "0001-01-01T00:00:00Z",
                        "publishDate": "2026-08-14T11:00:00Z",
                        "draft": "true",
                        "permalink": "https://example.com/acgn/draft/",
                        "kind": "page",
                        "section": "acgn",
                    },
                ],
            )

            self.assertEqual(check_content_outputs(public, hugo_list), [])

    def test_missing_published_and_present_draft_outputs_are_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            draft = public / "acgn/draft/index.html"
            draft.parent.mkdir(parents=True)
            draft.write_text("draft", encoding="utf-8")
            hugo_list = root / "hugo-list.csv"
            write_hugo_list(
                hugo_list,
                [
                    {
                        "path": "content/acgn/published.md",
                        "slug": "",
                        "title": "Published",
                        "date": "2026-08-14T10:00:00Z",
                        "expiryDate": "0001-01-01T00:00:00Z",
                        "publishDate": "2026-08-14T10:00:00Z",
                        "draft": "false",
                        "permalink": "https://example.com/acgn/published/",
                        "kind": "page",
                        "section": "acgn",
                    },
                    {
                        "path": "content/acgn/draft.md",
                        "slug": "",
                        "title": "Draft",
                        "date": "2026-08-14T11:00:00Z",
                        "expiryDate": "0001-01-01T00:00:00Z",
                        "publishDate": "2026-08-14T11:00:00Z",
                        "draft": "true",
                        "permalink": "https://example.com/acgn/draft/",
                        "kind": "page",
                        "section": "acgn",
                    },
                ],
            )

            self.assertEqual(
                check_content_outputs(public, hugo_list),
                [
                    "missing published output: acgn/published/index.html",
                    "draft output exists: acgn/draft/index.html",
                ],
            )


if __name__ == "__main__":
    unittest.main()
