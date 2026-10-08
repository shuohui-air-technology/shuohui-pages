import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.find_spec('editor_baseline')
baseline = None
if spec:
    import editor_baseline as baseline


class LegacyBaselineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'content/acgn').mkdir(parents=True)
        (self.root / 'content/acgn/_index.md').write_text('---\ntitle: 随笔\nmath: false\n---\n')
        self.article = self.root / 'content/acgn/one.md'
        self.article.write_text('---\ntitle: 一\nmath: false\ndraft: false\n---\n\n说明：\n这里是正文。\n')
        subprocess.run(['git', 'init', '-q'], cwd=self.root, check=True)
        subprocess.run(['git', 'add', '.'], cwd=self.root, check=True)
        subprocess.run(['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture'], cwd=self.root, check=True)
        self.revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=self.root, text=True).strip()

    def capture(self):
        self.assertIsNotNone(baseline, 'legacy capture not implemented')
        return baseline.capture_baseline(self.root, self.revision, self.root / 'legacy.json')

    def test_baseline_does_not_write_source(self):
        before = self.article.read_bytes()
        self.capture()
        self.assertEqual(self.article.read_bytes(), before)

    def test_unchanged_body_uses_frozen_output(self):
        data = self.capture()
        self.assertEqual(baseline.compatible_body('content/acgn/one.md', '\n说明：\n这里是正文。\n', {'math': False, 'legacyMathDirectory': False}, data), '\n### 说明\n\n这里是正文。\n')

    def test_one_character_edit_bypasses_legacy_rules(self):
        data = self.capture()
        body = '\n说明：\n这里是新正文。\n'
        self.assertEqual(baseline.compatible_body('content/acgn/one.md', body, {'math': False, 'legacyMathDirectory': False}, data), body)

    def test_metadata_only_edit_keeps_compatibility(self):
        data = self.capture()
        self.article.write_text(self.article.read_text().replace('title: 一', 'title: 二'))
        body = '\n说明：\n这里是正文。\n'
        self.assertEqual(baseline.compatible_body('content/acgn/one.md', body, {'math': False, 'legacyMathDirectory': False}, data), '\n### 说明\n\n这里是正文。\n')

    def test_math_policy_edit_bypasses_legacy_rules(self):
        data = self.capture()
        body = '\n说明：\n这里是正文。\n'
        self.assertEqual(baseline.compatible_body('content/acgn/one.md', body, {'math': True, 'legacyMathDirectory': False}, data), body)

    def test_draft_not_in_public_baseline(self):
        self.article.write_text(self.article.read_text().replace('draft: false', 'draft: true'))
        subprocess.run(['git', 'add', '.'], cwd=self.root, check=True)
        subprocess.run(['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'draft'], cwd=self.root, check=True)
        self.revision = 'HEAD'
        self.assertEqual(self.capture()['entries'], {})

    def test_source_changed_since_revision_is_rejected(self):
        self.article.write_text(self.article.read_text() + 'changed')
        with self.assertRaisesRegex(ValueError, 'revision'):
            self.capture()
