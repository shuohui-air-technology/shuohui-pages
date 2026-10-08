import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_cms', ROOT / 'scripts/build_cms.py')
module = None
if spec and spec.loader and Path(spec.origin).exists():
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)


class CmsBuildTests(unittest.TestCase):
    def test_reused_dependencies_resolve_inside_the_staged_checkout(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'original/node_modules'
            package = source / '.pnpm/example/node_modules/example'
            package.mkdir(parents=True)
            (package / 'Component.svelte').write_text('<p>example</p>')
            (source / 'example').symlink_to('.pnpm/example/node_modules/example')
            dest = root / 'staged/node_modules'
            module.copy_dependencies(source, dest)
            self.assertFalse(dest.is_symlink())
            self.assertTrue((dest / 'example').is_symlink())
            self.assertTrue((dest / 'example/Component.svelte').resolve().is_relative_to(dest.resolve()))
            self.assertEqual((dest / 'example/Component.svelte').read_text(), '<p>example</p>')

    def test_modified_upstream_source_is_rejected_before_patch(self):
        self.assertIsNotNone(module, 'build CMS boundary is not implemented')
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            (path / 'a.js').write_text('tampered')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                module.verify_sources(path, {'files': {'a.js': '0' * 64}})

    def test_matching_source_is_accepted_without_writes(self):
        self.assertIsNotNone(module, 'build CMS boundary is not implemented')
        import hashlib
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            (path / 'a.js').write_bytes(b'original')
            module.verify_sources(path, {'files': {'a.js': hashlib.sha256(b'original').hexdigest()}})
            self.assertEqual((path / 'a.js').read_bytes(), b'original')
