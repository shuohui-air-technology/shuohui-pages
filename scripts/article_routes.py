"""Hugo-derived public routes, bounded Git history, and non-overwriting aliases."""
from __future__ import annotations

import argparse
import csv
import io
import json
from pathlib import Path, PurePosixPath
import posixpath
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit

try:
    from .editor_baseline import stable_id, split_source, metadata_of
except ImportError:
    from editor_baseline import stable_id, split_source, metadata_of


def git(root: Path, *args) -> str:
    return subprocess.check_output(['git', *args], cwd=root, text=True, stderr=subprocess.DEVNULL).strip()


def route_key(path: str) -> str:
    parsed = urlsplit(path)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError(f'route must be a local path: {path}')
    decoded = unquote(parsed.path)
    if '\\' in decoded or any(part in {'.', '..'} for part in decoded.split('/')):
        raise ValueError(f'unsafe route path: {path}')
    result = '/' + decoded.lstrip('/')
    if result.endswith('/index.html'):
        result = result[:-10]
    return result


def inventory(root: Path, content: Path, config: Path | None = None) -> list[dict]:
    with tempfile.TemporaryDirectory(prefix='shuohui-inventory-') as tmp:
        overlay = Path(tmp) / 'content.toml'
        overlay.write_text('contentDir = ' + json.dumps(str(content.resolve())) + '\n')
        command = ['hugo', 'list', 'all', '--source', str(root), '--config', f'{config or root / "hugo.toml"},{overlay}']
        try:
            raw = subprocess.check_output(command, text=True, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as exc:
            raise ValueError(f'Hugo inventory failed: {exc.stdout}\n{exc.stderr}') from exc
    rows = list(csv.DictReader(io.StringIO(raw)))
    for row in rows:
        path = Path(row['path'])
        if not path.is_absolute():
            path = root / path
        if row['kind'] == 'page':
            row['sourcePath'] = 'content/' + path.resolve().relative_to(content.resolve()).as_posix()
        row['canonical'] = route_key(urlsplit(row['permalink']).path)
    return rows


def current_records(root: Path, content: Path, config: Path | None = None) -> list[dict]:
    records = []
    for row in inventory(root, content, config):
        if row['kind'] != 'page':
            continue
        source = content / PurePosixPath(row['sourcePath']).relative_to('content')
        metadata = metadata_of(split_source(source.read_bytes().decode())[0])
        aliases = metadata.get('aliases') or []
        if not isinstance(aliases, list) or not all(isinstance(alias, str) for alias in aliases):
            raise ValueError(f'{row["sourcePath"]}: aliases must be a list of local paths')
        canonical = row['canonical']
        draft = row['draft'].lower() == 'true'
        expanded = []
        for alias in aliases:
            # Hugo resolves relative aliases against the page's parent URL.
            path = alias if alias.startswith('/') else posixpath.join(posixpath.dirname(canonical.rstrip('/')), alias)
            path = route_key(path)
            if not PurePosixPath(path).suffix:
                path = path.rstrip('/') + '/'
            if path != canonical:
                expanded.append(path)
        records.append({'id': stable_id(row['sourcePath']), 'sourcePath': row['sourcePath'], 'canonical': canonical, 'aliases': [] if draft else sorted(set(expanded)), 'draft': draft})
    return records


def collect_routes(root: Path, baseline_revision: str) -> list[dict]:
    root = root.resolve()
    if git(root, 'rev-parse', '--is-shallow-repository') == 'true':
        raise ValueError('shallow Git history cannot protect historical routes')
    try:
        baseline_revision = git(root, 'rev-parse', '--verify', f'{baseline_revision}^{{commit}}')
        subprocess.run(['git', 'merge-base', '--is-ancestor', baseline_revision, 'HEAD'], cwd=root, check=True, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError as exc:
        raise ValueError('baseline history is missing or not an ancestor') from exc
    baseline_paths = set(git(root, 'ls-tree', '-r', '--name-only', baseline_revision, '--', 'content').splitlines())
    current_paths = {p.relative_to(root).as_posix() for p in (root / 'content').rglob('*.md')}
    missing = {p for p in baseline_paths if p.endswith('.md') and p not in current_paths}
    if missing:
        raise ValueError('missing article identity; explicit rename mapping required: ' + ', '.join(sorted(missing)))
    renamed = git(root, 'log', '--format=', '--name-status', '--diff-filter=R', '--find-renames', f'{baseline_revision}..HEAD', '--', 'content')
    if renamed:
        raise ValueError('explicit rename identity mapping required: ' + renamed)
    commits = [baseline_revision, *git(root, 'rev-list', '--reverse', '--topo-order', f'{baseline_revision}..HEAD', '--', 'content', 'hugo.toml').splitlines()]
    history: dict[str, set[str]] = {}
    with tempfile.TemporaryDirectory(prefix='shuohui-routes-') as tmp:
        scratch = Path(tmp)
        for index, revision in enumerate(commits):
            content = scratch / str(index) / 'content'
            content.mkdir(parents=True)
            for name in git(root, 'ls-tree', '-r', '--name-only', revision, '--', 'content').splitlines():
                if not name.endswith('.md'):
                    continue
                target = scratch / str(index) / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(subprocess.check_output(['git', 'show', f'{revision}:{name}'], cwd=root))
            config = scratch / str(index) / 'hugo.toml'
            config.write_bytes(subprocess.check_output(['git', 'show', f'{revision}:hugo.toml'], cwd=root))
            for record in current_records(root, content, config):
                if not record['draft']:
                    history.setdefault(record['sourcePath'], set()).add(record['canonical'])
    records = current_records(root, root / 'content')
    for record in records:
        if not record['draft']:
            record['aliases'] = sorted((set(record['aliases']) | history.get(record['sourcePath'], set())) - {record['canonical']})
    return records


def validate_routes(records: list[dict], reserved_paths: set[str]) -> list[str]:
    owners = {route_key(path).casefold(): 'reserved system/section page' for path in reserved_paths}
    errors = []
    for record in records:
        if record['draft']:
            continue
        for path in [record['canonical'], *record['aliases']]:
            key = route_key(path).casefold()
            if key.startswith('/admin/') and key != '/admin/':
                errors.append(f'reserved admin route {key}: {record["sourcePath"]}')
                continue
            previous = owners.get(key)
            if previous is not None and previous != record['sourcePath']:
                errors.append(f'duplicate route {key}: {previous}; {record["sourcePath"]}')
            else:
                owners[key] = record['sourcePath']
    return errors


def public_route_manifest(records: list[dict], revision: str) -> dict:
    return {'version': 1, 'revision': revision, 'entries': [{key: record[key] for key in ('id', 'canonical', 'aliases')} for record in records if not record['draft']]}


def reserved_paths(root: Path) -> set[str]:
    paths = {'/', '/admin/', '/404.html', '/sitemap.xml', '/index.xml', '/robots.txt'}
    paths.update(row['canonical'] for row in inventory(root, root / 'content') if row['kind'] != 'page')
    for path in (root / 'static').rglob('*'):
        if path.is_file():
            paths.add('/' + path.relative_to(root / 'static').as_posix())
    return paths


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--baseline', type=Path, default=Path('data/editor/routes-baseline.json'))
    parser.add_argument('--records', type=Path, required=True)
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--capture-baseline', help='Capture initial public routes once at this content revision')
    args = parser.parse_args()
    root = args.root.resolve()
    if args.capture_baseline:
        if args.baseline.exists():
            raise SystemExit('baseline already exists; refusing to replace route identity history')
        subprocess.run(['git', 'diff', '--exit-code', args.capture_baseline, '--', 'content', 'hugo.toml'], cwd=root, check=True)
        captured = public_route_manifest(current_records(root, root / 'content'), git(root, 'rev-parse', args.capture_baseline))
        args.baseline.parent.mkdir(parents=True, exist_ok=True)
        args.baseline.write_text(json.dumps(captured, ensure_ascii=False, indent=2) + '\n')
    baseline = json.loads(args.baseline.read_text())
    records = collect_routes(root, baseline['revision'])
    errors = validate_routes(records, reserved_paths(root))
    if errors:
        raise SystemExit('\n'.join(errors))
    args.records.parent.mkdir(parents=True, exist_ok=True)
    args.records.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    if args.manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(public_route_manifest(records, git(root, 'rev-parse', 'HEAD')), ensure_ascii=False, indent=2) + '\n')
