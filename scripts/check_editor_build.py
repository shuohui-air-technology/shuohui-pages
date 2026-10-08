"""Verify literal-source rendering compatibility and locally pinned editor assets."""
import csv
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit
try:
    from .editor_baseline import split_source, metadata_of, body_hash, math_policy
except ImportError:
    from editor_baseline import split_source, metadata_of, body_hash, math_policy

class _BodyParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.depth = 0; self.tokens = []; self.found = False
    def handle_starttag(self, tag, attrs):
        if not self.depth and 'post-content' in dict(attrs).get('class', '').split():
            self.depth = 1; self.found = True; return
        if self.depth:
            self.tokens.append(('start', tag, sorted(attrs)))
            if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.depth += 1
    def handle_endtag(self, tag):
        if self.depth:
            self.depth -= 1
            if self.depth: self.tokens.append(('end', tag))
    def handle_data(self, data):
        if self.depth: self.tokens.append(('text', data))

def post_content_hash(html: str) -> str | None:
    parser = _BodyParser(); parser.feed(html)
    return hashlib.sha256(json.dumps(parser.tokens, ensure_ascii=False).encode()).hexdigest() if parser.found else None

def check_asset_manifests(public: Path) -> list[str]:
    errors = []
    for kind, required in [('editor', {'editor.js','bootstrap.js','editor.css','LICENSES.txt','compatibility-preview.json'}), ('vendor', {'sveltia-cms.js','chunks/react-dom.js','LICENSE'})]:
        directory = public / 'admin' / kind
        try:
            manifest = json.loads((directory / 'build-manifest.json').read_text())
            files = manifest['files']
            if not required <= files.keys(): errors.append(f'{kind}: missing required manifest assets')
            for name, expected in files.items():
                path = directory / name
                if Path(name).is_absolute() or '..' in Path(name).parts or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                    errors.append(f'{kind}: asset hash mismatch: {name}')
            if kind == 'editor' and manifest.get('gzipBytes', 10**9) > 300 * 1024: errors.append('editor: gzip budget exceeded')
        except (OSError, ValueError, KeyError, TypeError): errors.append(f'{kind}: invalid or missing build manifest')
    return errors

def check_editor_build(public: Path, baseline: Path, inventory: Path, source_root: Path | None = None) -> list[str]:
    errors = check_asset_manifests(public)
    entries = json.loads((baseline / 'baseline-entries.json').read_text())['entries']
    with inventory.open(newline='') as stream:
        rows = list(csv.DictReader(stream))
    public_routes = set()
    for row in rows:
        if row.get('kind') != 'page' or row.get('draft', '').lower() == 'true': continue
        public_routes.add(unquote(urlsplit(row['permalink']).path))
        key = row.get('sourcePath') or row['path']
        record = entries.get(key)
        if not record: continue
        source = source_root / key if source_root else Path(row['path'])
        head, body = split_source(source.read_bytes().decode())
        if body_hash(body) != record['bodyHash']: continue
        if 'mathPolicy' in record and math_policy(source_root or source.parent, source, metadata_of(head)) != record['mathPolicy']: continue
        canonical = unquote(urlsplit(row['permalink']).path)
        path = public / canonical.lstrip('/') / 'index.html' if canonical.endswith('/') else public / canonical.lstrip('/')
        if not path.is_file() or post_content_hash(path.read_text()) != record['htmlHash']:
            errors.append(f'unchanged article HTML drift: {key}')
    try:
        manifest = json.loads((public / 'admin/editor/public-routes.json').read_text())
        if any(set(entry) != {'id','canonical','aliases'} or entry['canonical'] not in public_routes for entry in manifest['entries']):
            errors.append('public route manifest includes a private or unknown entry')
    except (OSError, ValueError, KeyError, TypeError): errors.append('public route manifest missing or invalid')
    return errors
