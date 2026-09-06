from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path


class HugoMathLoadingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo_root = Path(__file__).resolve().parents[1]
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.public_dir = Path(cls.temp_dir.name) / "public"
        result = subprocess.run(
            [
                "hugo",
                "--minify",
                "--gc",
                "--buildFuture",
                "--destination",
                str(cls.public_dir),
            ],
            cwd=cls.repo_root,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            raise AssertionError(result.stderr or result.stdout)

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    def _html(self, relative_path: str) -> str:
        return (self.public_dir / relative_path).read_text(encoding="utf-8")

    def test_math_section_loads_mathjax_without_opening_an_article(self):
        source = self._html("math/index.html")
        self.assertIn("/js/mathjax-config.js", source)
        self.assertIn("mathjax@3.2.2/es5/tex-mml-chtml.js", source)
        self.assertIn(r"$$\sin\alpha + \sin\beta", source)

    def test_non_math_pages_do_not_load_mathjax(self):
        for relative_path in ("index.html", "acgn/index.html"):
            source = self._html(relative_path)
            self.assertNotIn("mathjax@3.2.2", source)

    def test_mixed_section_loads_mathjax_when_a_child_enables_math(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture_root = Path(directory)
            content_dir = fixture_root / "content"
            section_dir = content_dir / "mixed"
            section_dir.mkdir(parents=True)
            (content_dir / "_index.md").write_text(
                '---\ntitle: "Fixture"\n---\n', encoding="utf-8"
            )
            (section_dir / "_index.md").write_text(
                '---\ntitle: "Mixed"\nmath: false\n---\n', encoding="utf-8"
            )
            (section_dir / "formula.md").write_text(
                '---\n'
                'title: "Formula"\n'
                'date: 2026-08-31T00:00:00+08:00\n'
                'draft: false\n'
                'math: true\n'
                'comments: false\n'
                '---\n\n$x+y$\n',
                encoding="utf-8",
            )
            public_dir = fixture_root / "public"
            result = subprocess.run(
                [
                    "hugo",
                    "--minify",
                    "--gc",
                    "--buildFuture",
                    "--contentDir",
                    str(content_dir),
                    "--destination",
                    str(public_dir),
                ],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            source = (public_dir / "mixed" / "index.html").read_text(
                encoding="utf-8"
            )
            self.assertIn("/js/mathjax-config.js", source)
            self.assertIn("mathjax@3.2.2/es5/tex-mml-chtml.js", source)

    def test_math_article_still_loads_mathjax(self):
        source = self._html("math/和差化积/index.html")
        self.assertIn("/js/mathjax-config.js", source)
        self.assertIn("mathjax@3.2.2/es5/tex-mml-chtml.js", source)

    def test_latex_cheatsheet_comparison_examples_survive_hugo(self):
        source = self._html("math/latex-格式速记/index.html")
        self.assertIn(r"\mathord{<}", source)
        self.assertIn(r"\mathord{>}", source)
        self.assertIn(r"\mathord{=}", source)
        self.assertIn(r"\mathord{-}", source)
        self.assertNotIn("<blockquote></blockquote>", source)
        self.assertNotIn("<h1 id=heading-3>$$", source)
        self.assertNotIn("<h2 id=heading-5>$$", source)
        self.assertNotIn("<h3></h3>", source)
        self.assertRegex(source, r"<h3[^>]*>#<")
        self.assertIn("函数 $f(x)=x^2$ 在 $x=0$ 处取得最小值。", source)


if __name__ == "__main__":
    unittest.main()
