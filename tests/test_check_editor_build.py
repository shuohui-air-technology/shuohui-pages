import csv
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from scripts.check_editor_build import check_editor_build, post_content_hash
from scripts.check_build import check_build

class EditorBuildTests(unittest.TestCase):
    def test_unchanged_body_requires_same_published_html(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); public = root / 'public'; baseline = root / 'baseline'
            public.mkdir(); baseline.mkdir(); source = root / 'post.md'; source.write_text('---\ntitle: x\n---\nbody\n')
            (public / 'acgn/x').mkdir(parents=True)
            (public / 'acgn/x/index.html').write_text('<div class="post-content"><p>broken</p></div>')
            (baseline / 'baseline-entries.json').write_text(json.dumps({'entries': {str(source): {'bodyHash': hashlib.sha256(b'body\n').hexdigest(), 'canonical': '/acgn/x/', 'htmlHash': post_content_hash('<div class="post-content"><p>body</p></div>')}}}))
            inventory = root / 'inventory.csv'
            with inventory.open('w') as stream:
                writer = csv.DictWriter(stream, fieldnames=['path','kind','draft','permalink']); writer.writeheader(); writer.writerow({'path': str(source), 'kind': 'page', 'draft':'false','permalink':'https://shuohui.uk/acgn/x/'})
            self.assertTrue(any('unchanged article HTML drift' in error for error in check_editor_build(public, baseline, inventory)))
    def test_stylesheet_missing_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory); (public / 'index.html').write_text('<link rel="stylesheet" href="/missing.css?v=1">')
            self.assertTrue(any('missing.css' in error for error in check_build(public, [], [])))
    def test_ci_never_normalizes_author_source(self):
        workflow = Path('.github/workflows/hugo.yml').read_text()
        self.assertNotIn('normalize content', workflow)
        self.assertIn('fetch-depth: 0', workflow)
        self.assertIn('node-version: 24', workflow)
        self.assertIn('build_editor_site.py', workflow)
