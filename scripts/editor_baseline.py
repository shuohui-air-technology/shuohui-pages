"""Content-addressed migration snapshot; normalization never runs on source content."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

import yaml
try:
    from .content_tools import normalize_date_text, normalize_markdown_structure, normalize_files
    from .sync_sections import sync_sections
except ImportError:
    from content_tools import normalize_date_text, normalize_markdown_structure, normalize_files
    from sync_sections import sync_sections


class SourceLoader(yaml.SafeLoader):
    pass


# Keep dates as strings, exactly as CMS/Hugo article metadata expects.
SourceLoader.yaml_implicit_resolvers = {
    key: [(tag, pattern) for tag, pattern in resolvers if tag != 'tag:yaml.org,2002:timestamp']
    for key, resolvers in copy.deepcopy(yaml.SafeLoader.yaml_implicit_resolvers).items()
}


def parse_metadata(text: str) -> dict:
    data = yaml.load(text, Loader=SourceLoader) or {}
    if not isinstance(data, dict):
        raise ValueError('front matter must be a mapping')
    return data


def split_source(text: str) -> tuple[str, str]:
    match = re.match(r'^(?:\ufeff)?---[^\S\r\n]*\r?\n[\s\S]*?^---[^\S\r\n]*(?:\r?\n|$)', text, re.MULTILINE)
    if not match:
        raise ValueError('missing or unclosed YAML front matter')
    return match[0], text[match.end():]


def metadata_of(head: str) -> dict:
    lines = head.splitlines(keepends=True)
    return parse_metadata(''.join(lines[1:-1]))


def stable_id(path: str) -> str:
    return hashlib.sha256(path.encode()).hexdigest()


def body_hash(body: str) -> str:
    return hashlib.sha256(body.encode()).hexdigest()


def math_policy(root: Path, path: Path, metadata: dict) -> dict:
    section_index = path.parent / '_index.md'
    default = False
    if section_index.is_file() and section_index != path:
        default = metadata_of(split_source(section_index.read_bytes().decode())[0]).get('math', False)
    return {'math': metadata.get('math', default) is True, 'legacyMathDirectory': path.parent.name == 'math'}


def capture_baseline(root: Path, revision: str, output: Path) -> dict:
    revision = subprocess.check_output(['git', 'rev-parse', '--verify', f'{revision}^{{commit}}'], cwd=root, text=True).strip()
    entries = {}
    for path in sorted((root / 'content').rglob('*.md')):
        relative = path.relative_to(root).as_posix()
        source = path.read_bytes().decode('utf-8')
        try:
            committed = subprocess.check_output(['git', 'show', f'{revision}:{relative}'], cwd=root, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError as exc:
            raise ValueError(f'{relative}: missing in baseline revision') from exc
        if committed != path.read_bytes():
            raise ValueError(f'{relative}: content differs from baseline revision')
        if path.name == '_index.md':
            continue
        head, body = split_source(source)
        metadata = metadata_of(head)
        if metadata.get('draft') is True:
            continue
        old_source = normalize_date_text(source.replace('\r\n', '\n').replace('\r', '\n'))
        if path.parent.name != 'math':
            old_source = normalize_markdown_structure(old_source)
        rendered = split_source(old_source)[1]
        if rendered != body:
            entries[relative] = {'id': stable_id(relative), 'bodyHash': body_hash(body), 'mathPolicy': math_policy(root, path, metadata), 'renderedMarkdown': rendered}
    result = {'version': 1, 'revision': revision, 'entries': entries}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result


def compatible_body(path: str, body: str, math_policy: dict, baseline: dict) -> str:
    entry = baseline.get('entries', {}).get(path)
    if entry and entry['bodyHash'] == body_hash(body) and entry['mathPolicy'] == math_policy:
        return entry['renderedMarkdown']
    return body


def render_baseline(root: Path, destination: Path) -> None:
    if destination.exists():
        raise ValueError('baseline output already exists; choose a fresh directory')
    with tempfile.TemporaryDirectory(prefix='shuohui-baseline-') as tmp:
        scratch = Path(tmp)
        for name in ['content', 'static', 'assets', 'data', 'layouts', 'themes']:
            if (root / name).is_dir():
                shutil.copytree(root / name, scratch / name, ignore=shutil.ignore_patterns('.git'))
        shutil.copy2(root / 'hugo.toml', scratch / 'hugo.toml')
        sync_sections(scratch)
        normalize_files(scratch / 'content')
        subprocess.run(['hugo', '--source', str(scratch), '--destination', str(destination), '--buildFuture', '--minify', '--gc'], check=True)
        inventory = subprocess.check_output(['hugo', 'list', 'all', '--source', str(scratch)], text=True)
        (destination.parent / f'{destination.name}-inventory.csv').write_text(inventory)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--revision', required=True)
    parser.add_argument('--output', type=Path, default=Path('data/editor/legacy-markdown.json'))
    parser.add_argument('--render', type=Path)
    args = parser.parse_args()
    data = capture_baseline(args.root.resolve(), args.revision, args.output.resolve())
    if args.render:
        render_baseline(args.root.resolve(), args.render.resolve())
    print(f'Captured {len(data["entries"])} legacy rendering records at {data["revision"]}')
