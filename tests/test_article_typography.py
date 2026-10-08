import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ArticleTypographyTests(unittest.TestCase):
    def test_exact_family_version_and_nonblocking_local_first_subsets(self):
        css = (ROOT / 'assets/css/fonts/lxgw-wenkai-mono-1.522.css').read_text()
        self.assertIn('LXGW WenKai Mono:Version 1.522', css)
        faces = re.findall(r'@font-face\{([^}]+)\}', css)
        self.assertGreater(len(faces), 50)
        for face in faces:
            self.assertIn('font-display:swap', face)
            self.assertIn('unicode-range:', face)
            self.assertIn('src:local("LXGW WenKai Mono"),url(', face)
            self.assertIn('https://fontsapi.zeoseven.com/293/main/', face)
        self.assertNotIn('@import', css)
        self.assertIn('SIL OPEN FONT LICENSE', (ROOT / 'static/fonts/lxgw-wenkai-mono/OFL.txt').read_text())

    def test_scope_is_articles_not_navigation_code_or_formula_glyphs(self):
        css = (ROOT / 'assets/css/article-typography.css').read_text()
        self.assertIn('.post-single {', css)
        self.assertIn('.post-single code,', css)
        self.assertIn('font-family: monospace', css)
        rules = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
        self.assertNotRegex(rules, r'(?:mjx-|katex|\*)')
        head = (ROOT / 'layouts/partials/extend_head.html').read_text()
        self.assertIn('if .IsPage', head)
        self.assertIn('data-article-typography', head)
        self.assertIn('fingerprint', head)


if __name__ == '__main__':
    unittest.main()
