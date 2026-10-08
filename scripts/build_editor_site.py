"""Build and verify only scratch content, never normalize an author's source file."""
import argparse
import csv
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
from urllib.parse import unquote, urlsplit
try:
    from .article_routes import collect_routes, validate_routes, reserved_paths, public_route_manifest, inventory, git
    from .prepare_content import prepare_content
    from .editor_baseline import render_baseline, split_source, metadata_of, body_hash, math_policy
    from .check_editor_build import check_editor_build, post_content_hash
    from .check_build import check_build
    from .check_content_outputs import check_content_outputs
except ImportError:
    from article_routes import collect_routes, validate_routes, reserved_paths, public_route_manifest, inventory, git
    from prepare_content import prepare_content
    from editor_baseline import render_baseline, split_source, metadata_of, body_hash, math_policy
    from check_editor_build import check_editor_build, post_content_hash
    from check_build import check_build
    from check_content_outputs import check_content_outputs

def build_site(root: Path, public: Path) -> dict:
    root = root.resolve(); public = public.resolve()
    if public == root or public in (root / 'content').parents or root / 'content' == public or root / 'content' in public.parents:
        raise ValueError('output overlaps protected source')
    if public.exists() and any(public.iterdir()): raise ValueError('output must be a fresh empty directory')
    source_before = {p: p.read_bytes() for p in (root / 'content').rglob('*.md')}
    baseline = json.loads((root / 'data/editor/legacy-markdown.json').read_text())
    routes = collect_routes(root, baseline['revision'])
    route_errors = validate_routes(routes, reserved_paths(root))
    if route_errors: raise ValueError('\n'.join(route_errors))
    with tempfile.TemporaryDirectory(prefix='shuohui-editor-build-') as directory:
        tmp = Path(directory); site = tmp / 'site'; site.mkdir(); original = tmp / 'original'; original.mkdir()
        for name in ['static','assets','data','layouts','themes']:
            if (root / name).is_dir(): shutil.copytree(root / name, site / name, ignore=shutil.ignore_patterns('.git'))
        shutil.copy2(root / 'hugo.toml', site / 'hugo.toml')
        preparation = prepare_content(root, site / 'content', baseline, routes)
        manifest = public_route_manifest(routes, git(root, 'rev-parse', 'HEAD'))
        (site / 'static/admin/editor/public-routes.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        # A real old-tree render, not a hash of this migration's output.
        archive = subprocess.check_output(['git','archive',baseline['revision']], cwd=root)
        with tarfile.open(fileobj=io.BytesIO(archive)) as stream: stream.extractall(original, filter='data')
        shutil.copytree(root / 'themes', original / 'themes', dirs_exist_ok=True, ignore=shutil.ignore_patterns('.git'))
        old_public = tmp / 'old-public'; render_baseline(original, old_public)
        old_entries = {}
        for row in inventory(original, original / 'content'):
            if row['kind'] != 'page' or row['draft'].lower() == 'true': continue
            path = original / row['sourcePath']; head, body = split_source(path.read_bytes().decode())
            canonical = row['canonical']; output = old_public / canonical.lstrip('/')
            if canonical.endswith('/'): output /= 'index.html'
            old_entries[row['sourcePath']] = {'bodyHash': body_hash(body), 'canonical': canonical, 'htmlHash': post_content_hash(output.read_text()), 'mathPolicy': math_policy(original, path, metadata_of(head))}
        (old_public / 'baseline-entries.json').write_text(json.dumps({'entries': old_entries}))
        subprocess.run(['hugo','--source',str(site),'--destination',str(public),'--minify','--gc','--buildFuture'], check=True)
        rows = inventory(site, site / 'content'); list_path = tmp / 'inventory.csv'
        with list_path.open('w', newline='') as stream:
            fields = sorted({key for row in rows for key in row}); writer = csv.DictWriter(stream, fieldnames=fields); writer.writeheader(); writer.writerows(rows)
        sections = json.loads((root / 'data/sections.json').read_text())['sections']
        errors = check_build(public, ['admin/index.html','admin/config.yml','sitemap.xml'], [], sections=sections, content_dir=site / 'content', hugo_list=list_path)
        errors += check_content_outputs(public, list_path, routes)
        errors += check_editor_build(public, old_public, list_path, root)
        if errors: raise ValueError('\n'.join(errors))
    if any(p.read_bytes() != value for p, value in source_before.items()): raise ValueError('source content changed during build')
    return {'published': sum(not record['draft'] for record in routes), 'sourceFilesUnchanged': len(source_before), 'baselineHtmlDrift': 0, 'preparation': preparation}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--root', type=Path, default=Path.cwd()); parser.add_argument('--public', type=Path, required=True)
    args = parser.parse_args(); print(json.dumps(build_site(args.root, args.public), ensure_ascii=False))
