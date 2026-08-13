import tempfile
import unittest
from pathlib import Path

from scripts.check_build import check_build


class BuildCheckTests(unittest.TestCase):
    def test_required_and_forbidden_paths_are_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            (public / "acgn").mkdir()
            (public / "acgn/index.html").write_text("ok", encoding="utf-8")
            errors = check_build(
                public,
                required=["acgn/index.html"],
                forbidden=["acgn/draft/index.html"],
            )
            self.assertEqual(errors, [])

    def test_missing_required_path_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            errors = check_build(Path(directory), ["sitemap.xml"], [])
            self.assertEqual(errors, ["missing required output: sitemap.xml"])

    def test_present_forbidden_path_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            (public / "draft/index.html").parent.mkdir()
            (public / "draft/index.html").write_text("draft", encoding="utf-8")
            errors = check_build(public, [], ["draft/index.html"])
            self.assertEqual(errors, ["forbidden output exists: draft/index.html"])


if __name__ == "__main__":
    unittest.main()
