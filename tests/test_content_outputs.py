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
    def test_route_records_require_alias_output_pointing_to_canonical(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / 'public'
            (public / 'acgn/new').mkdir(parents=True)
            (public / 'acgn/new/index.html').write_text('published')
            inventory = root / 'inventory.csv'
            write_hugo_list(inventory, [{'path': 'content/acgn/one.md', 'kind': 'page', 'section': 'acgn', 'draft': 'false', 'permalink': 'https://shuohui.uk/acgn/new/'}])
            records = [{'sourcePath': 'content/acgn/one.md', 'draft': False, 'canonical': '/acgn/new/', 'aliases': ['/acgn/old/']}]
            errors = check_content_outputs(public, inventory, records)
            self.assertTrue(any('missing alias' in error for error in errors))
            (public / 'acgn/old').mkdir()
            (public / 'acgn/old/index.html').write_text('<meta http-equiv="refresh" content="0; url=https://shuohui.uk/acgn/wrong/">')
            self.assertTrue(any('alias target' in error for error in check_content_outputs(public, inventory, records)))
            (public / 'acgn/old/index.html').write_text('<link rel="canonical" href="https://shuohui.uk/acgn/new/"><meta http-equiv="refresh" content="0; url=https://shuohui.uk/acgn/new/">')
            self.assertEqual(check_content_outputs(public, inventory, records), [])

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

    def test_duplicate_article_routes_are_reported_even_when_one_is_a_draft(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            public.mkdir()
            hugo_list = root / "hugo-list.csv"
            write_hugo_list(
                hugo_list,
                [
                    {
                        "path": "content/acgn/first.md",
                        "slug": "shared",
                        "title": "First",
                        "date": "2026-08-14T10:00:00Z",
                        "expiryDate": "0001-01-01T00:00:00Z",
                        "publishDate": "2026-08-14T10:00:00Z",
                        "draft": "false",
                        "permalink": "https://example.com/acgn/shared/",
                        "kind": "page",
                        "section": "acgn",
                    },
                    {
                        "path": "content/acgn/second.md",
                        "slug": "shared",
                        "title": "Second",
                        "date": "2026-08-14T11:00:00Z",
                        "expiryDate": "0001-01-01T00:00:00Z",
                        "publishDate": "2026-08-14T11:00:00Z",
                        "draft": "true",
                        "permalink": "https://example.com/acgn/shared/",
                        "kind": "page",
                        "section": "acgn",
                    },
                ],
            )

            errors = check_content_outputs(public, hugo_list)

            self.assertEqual(
                errors,
                [
                    "duplicate article route: acgn/shared/index.html "
                    "(content/acgn/first.md; content/acgn/second.md)",
                    "missing published output: acgn/shared/index.html",
                ],
            )


if __name__ == "__main__":
    unittest.main()
