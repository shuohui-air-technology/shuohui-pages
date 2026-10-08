import importlib.util
from pathlib import Path
import tempfile
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
prepare = None
if importlib.util.find_spec('prepare_content'):
    import prepare_content as prepare


class PrepareContentTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(prepare, 'temporary content preparer not implemented')
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name) / 'repo'
        (self.root / 'content/acgn').mkdir(parents=True)
        self.path = self.root / 'content/acgn/one.md'
        self.raw = b'---\r\ntitle: one\r\ncustom: [x, y]\r\nmath: false\r\ndraft: false\r\n---\r\n\r\nbody  \r\n\r\n'
        self.path.write_bytes(self.raw)
        self.destination = self.root.parent / 'prepared'

    def test_prepare_preserves_source_and_unknown_fields(self):
        prepare.prepare_content(self.root, self.destination, {'entries': {}}, [{'sourcePath': 'content/acgn/one.md', 'aliases': ['/acgn/old/'], 'draft': False}])
        self.assertEqual(self.path.read_bytes(), self.raw)
        saved = (self.destination / 'acgn/one.md').read_bytes()
        self.assertIn(b'custom: [x, y]', saved)
        self.assertTrue(saved.endswith(b'\r\nbody  \r\n\r\n'))
        self.assertIn(b'/acgn/old/', saved)

    def test_draft_aliases_removed_only_from_scratch(self):
        self.path.write_bytes(self.raw.replace(b'draft: false', b'draft: true').replace(b'math: false', b'aliases: [/acgn/old/]\r\nmath: false'))
        before = self.path.read_bytes()
        prepare.prepare_content(self.root, self.destination, {'entries': {}}, [])
        self.assertEqual(self.path.read_bytes(), before)
        self.assertNotIn(b'/acgn/old/', (self.destination / 'acgn/one.md').read_bytes())

    def test_source_overlapping_destinations_are_rejected(self):
        for path in [self.root, self.root / 'content', self.root / 'content/copy']:
            with self.assertRaisesRegex(ValueError, 'overlap'):
                prepare.prepare_content(self.root, path, {'entries': {}}, [])

    def test_existing_destination_is_not_deleted_or_overwritten(self):
        self.destination.mkdir()
        (self.destination / 'owned').write_text('keep')
        with self.assertRaisesRegex(ValueError, 'empty|exist'):
            prepare.prepare_content(self.root, self.destination, {'entries': {}}, [])
        self.assertEqual((self.destination / 'owned').read_text(), 'keep')
