"""Prepare ephemeral Hugo content while leaving every repository article untouched."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil

import yaml
try:
    from .editor_baseline import compatible_body, math_policy, metadata_of, split_source
    from .content_tools import normalize_date_text
except ImportError:
    from editor_baseline import compatible_body, math_policy, metadata_of, split_source
    from content_tools import normalize_date_text


def replace_metadata_field(head: str, key: str, value: object, *, remove: bool = False) -> str:
    """Replace one YAML key using parser ranges, not an assumed number of list lines."""
    lines = head.splitlines(keepends=True)
    eol = '\r\n' if '\r\n' in head else '\n'
    content = ''.join(lines[1:-1])
    node = yaml.compose(content)
    if node and not isinstance(node, yaml.MappingNode):
        raise ValueError('front matter must be a mapping')
    replacement = '' if remove else yaml.safe_dump({key: value}, allow_unicode=True, sort_keys=False).replace('\n', eol)
    found = False
    for index, (key_node, _) in enumerate(node.value if node else []):
        if key_node.value != key:
            continue
        start = key_node.start_mark.index
        end = node.value[index + 1][0].start_mark.index if index + 1 < len(node.value) else len(content)
        content = content[:start] + replacement + content[end:]
        found = True
        break
    if not found and not remove:
        content += replacement
    return lines[0] + content + lines[-1]


def prepare_content(root: Path, destination: Path, baseline: dict, routes: list[dict]) -> dict:
    root = root.resolve()
    source = (root / 'content').resolve()
    destination = destination.resolve()
    if source == destination or source in destination.parents or destination in source.parents:
        raise ValueError('prepared content destination overlaps source')
    if destination.exists() and any(destination.iterdir()):
        raise ValueError('prepared content destination must be empty')
    shutil.copytree(source, destination, dirs_exist_ok=True)
    route_map = {record['sourcePath']: record for record in routes}
    result = {'compatible': [], 'strict': []}
    for original in sorted(source.rglob('*.md')):
        relative = original.relative_to(root).as_posix()
        target = destination / original.relative_to(source)
        text = original.read_bytes().decode('utf-8')
        head, body = split_source(text)
        metadata = metadata_of(head)
        if metadata.get('draft') is True:
            head = replace_metadata_field(head, 'aliases', None, remove=True)
        elif original.name != '_index.md':
            rendered = compatible_body(relative, body, math_policy(root, original, metadata), baseline)
            result['compatible' if rendered != body else 'strict'].append(relative)
            body = rendered
            record = route_map.get(relative)
            if record:
                head = replace_metadata_field(head, 'aliases', record['aliases'])
        # Date syntax preparation occurs in scratch only; does not alter body.
        target.write_bytes((normalize_date_text(head) + body).encode('utf-8'))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--baseline', type=Path, default=Path('data/editor/legacy-markdown.json'))
    parser.add_argument('--routes', type=Path)
    args = parser.parse_args()
    baseline = json.loads(args.baseline.read_text())
    routes = json.loads(args.routes.read_text()) if args.routes else []
    print(json.dumps(prepare_content(args.root.resolve(), args.destination, baseline, routes)))
