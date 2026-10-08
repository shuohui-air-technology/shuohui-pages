import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from scripts.content_tools import _validate_article_slug

routes = None
if importlib.util.find_spec('scripts.article_routes'):
    from scripts import article_routes as routes


class ArticleRoutesTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'content/acgn').mkdir(parents=True)
        (self.root / 'hugo.toml').write_text('baseURL="https://shuohui.uk/"\n')
        self.path = self.root / 'content/acgn/article.md'
        self.write('a')
        self.git('init', '-q')
        self.commit()
        self.base = self.git('rev-parse', 'HEAD').strip()

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, text=True, stderr=subprocess.DEVNULL)

    def commit(self):
        self.git('add', '.')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture')

    def write(self, slug, extra='', draft=False):
        self.path.write_text(f'---\ntitle: private fixture title\nslug: {slug}\ndate: 2026-01-01T00:00:00\ndraft: {str(draft).lower()}\n{extra}---\nbody\n')

    def collect(self):
        self.assertIsNotNone(routes, 'route history not implemented')
        return routes.collect_routes(self.root, self.base)

    def test_shared_slug_samples(self):
        samples = json.loads((Path(__file__).parent / 'fixtures/article-slugs.json').read_text())
        for sample in samples:
            self.assertEqual(_validate_article_slug(sample['value']), sample['valid'], sample['value'])

    def test_explicit_url_case_matches_actual_hugo_output(self):
        self.write('', 'url: /Custom/Path/\n')
        self.assertEqual(self.collect()[0]['canonical'], '/Custom/Path/')

    def test_slug_conflicts_with_filename_fallback(self):
        self.assertIsNotNone(routes)
        self.write('fallback')
        (self.path.parent / 'fallback.md').write_text('---\ntitle: other\ndraft: false\n---\nother')
        errors = routes.validate_routes(self.collect(), set())
        self.assertTrue(any('article.md' in e and 'fallback.md' in e and '/acgn/fallback/' in e for e in errors), errors)

    def test_history_a_b_c_redirects_directly_to_c(self):
        self.write('b'); self.commit()
        self.write('c'); self.commit()
        record = self.collect()[0]
        self.assertEqual(record['canonical'], '/acgn/c/')
        self.assertEqual(record['aliases'], ['/acgn/a/', '/acgn/b/'])

    def test_revert_has_no_self_alias(self):
        self.write('b'); self.commit()
        self.write('a'); self.commit()
        self.assertEqual(self.collect()[0]['aliases'], ['/acgn/b/'])

    def test_draft_has_no_alias_or_manifest_entry(self):
        self.write('b', 'aliases: [/old/]\n', draft=True); self.commit()
        record = self.collect()[0]
        self.assertEqual(record['aliases'], [])
        manifest = routes.public_route_manifest([record], 'rev')
        self.assertEqual(manifest['entries'], [])
        self.assertNotIn('private fixture title', json.dumps(manifest))

    def test_shallow_history_fails_closed(self):
        self.write('b'); self.commit()
        shallow = self.root.parent / f'{self.root.name}-shallow'
        self.addCleanup(lambda: __import__('shutil').rmtree(shallow, ignore_errors=True))
        subprocess.run(['git', 'clone', '-q', '--depth', '1', self.root.as_uri(), str(shallow)], check=True)
        self.assertIsNotNone(routes)
        with self.assertRaisesRegex(ValueError, 'history|shallow'):
            routes.collect_routes(shallow, self.base)

    def test_hugo_controls_unicode_fallback_underscores_and_url_override(self):
        self.write('what_is_agent')
        self.assertEqual(self.collect()[0]['canonical'], '/acgn/what_is_agent/')
        self.write('', 'url: /special/path/\naliases: [/absolute/, relative/]\n')
        record = self.collect()[0]
        self.assertEqual(record['canonical'], '/special/path/')
        self.assertIn('/absolute/', record['aliases'])
        self.assertTrue(any('relative/' in a for a in record['aliases']))
        self.path.rename(self.path.parent / '中文.md')
        with self.assertRaisesRegex(ValueError, 'rename|identity'):
            self.collect()

    def test_alias_cannot_occupy_canonical_or_reserved_paths(self):
        self.assertIsNotNone(routes)
        records = [dict(sourcePath='first.md', canonical='/one/', aliases=['/two/'], draft=False), dict(sourcePath='second.md', canonical='/two/', aliases=[], draft=False)]
        self.assertTrue(routes.validate_routes(records, set()))
        records[0]['aliases'] = ['/admin/']
        self.assertTrue(routes.validate_routes(records[:1], {'/admin/'}))

    def test_generated_aliases_match_real_hugo_output_and_unknown_fields_survive(self):
        self.assertIsNotNone(routes)
        from scripts.prepare_content import prepare_content
        self.write('c', 'aliases: [/absolute/, relative/]\ncustom: [one, two]\n')
        records = self.collect()
        prepared = self.root.parent / (self.root.name + '-prepared')
        public = self.root.parent / (self.root.name + '-public')
        self.addCleanup(lambda: __import__('shutil').rmtree(prepared, ignore_errors=True))
        self.addCleanup(lambda: __import__('shutil').rmtree(public, ignore_errors=True))
        prepare_content(self.root, prepared, {'entries': {}}, records)
        subprocess.run(['hugo', '--source', str(self.root), '--contentDir', str(prepared), '--destination', str(public)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for alias in records[0]['aliases']:
            html = (public / alias.lstrip('/') / 'index.html').read_text()
            self.assertIn('https://shuohui.uk/acgn/c/', html)
        self.assertIn('custom: [one, two]', (prepared / 'acgn/article.md').read_text())

    def test_alias_cannot_enter_reserved_admin_subtree(self):
        self.assertIsNotNone(routes)
        records = [dict(sourcePath='first.md', canonical='/one/', aliases=['/admin/secret/'], draft=False)]
        self.assertTrue(routes.validate_routes(records, {'/admin/'}))

    def test_article_created_after_baseline_cannot_be_silently_renamed(self):
        extra = self.path.parent / 'later.md'
        extra.write_text('---\ntitle: later\ndraft: false\n---\nbody')
        self.commit()
        extra.rename(extra.with_name('renamed.md'))
        self.commit()
        with self.assertRaisesRegex(ValueError, 'rename|identity'):
            self.collect()
