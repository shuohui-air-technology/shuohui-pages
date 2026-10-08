from __future__ import annotations

import argparse
import csv
import json
from html.parser import HTMLParser
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit


REQUIRED_COLUMNS = {
    "draft",
    "kind",
    "permalink",
    "section",
}


def _output_path(permalink: str) -> Path:
    path = unquote(urlsplit(permalink).path).lstrip("/")
    if not path:
        return Path("index.html")
    if path.endswith("/"):
        path += "index.html"
    return Path(path)


class AliasTargets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.refresh = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')
        if tag == 'meta' and attrs.get('http-equiv', '').lower() == 'refresh':
            parts = attrs.get('content', '').split('url=', 1)
            if len(parts) == 2:
                self.refresh = parts[1].strip()


def check_content_outputs(public: Path, hugo_list: Path, routes: list[dict] | None = None) -> list[str]:
    errors: list[str] = []
    with hugo_list.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        missing_columns = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing_columns:
            return [
                "hugo list output missing columns: "
                + ", ".join(sorted(missing_columns))
            ]

        rows = list(reader)
        route_owners: dict[str, str] = {}
        for row in rows:
            if row.get("kind") != "page" or not row.get("section"):
                continue

            relative_path = _output_path(row["permalink"])
            display_path = relative_path.as_posix()
            owner = row.get("path", "unknown source")
            previous_owner = route_owners.get(display_path)
            if previous_owner is not None:
                errors.append(
                    f"duplicate article route: {display_path} ({previous_owner}; {owner})"
                )
            else:
                route_owners[display_path] = owner

        for row in rows:
            if row.get("kind") != "page" or not row.get("section"):
                continue

            relative_path = _output_path(row["permalink"])
            output = public / relative_path
            display_path = relative_path.as_posix()
            is_draft = row["draft"].strip().lower() == "true"
            if is_draft:
                if output.exists():
                    errors.append(f"draft output exists: {display_path}")
            elif not output.is_file():
                errors.append(f"missing published output: {display_path}")

    if routes is not None:
        canonical_urls = {unquote(urlsplit(row['permalink']).path): row['permalink'] for row in rows if row.get('kind') == 'page'}
        for record in routes:
            if record['draft']:
                continue
            expected = canonical_urls.get(record['canonical'])
            if expected is None:
                errors.append(f'route inventory mismatch: {record["sourcePath"]}: {record["canonical"]}')
                continue
            for alias in record['aliases']:
                output = public / _output_path(alias)
                if not output.is_file():
                    errors.append(f'missing alias output: {alias}')
                    continue
                targets = AliasTargets()
                targets.feed(output.read_text(encoding='utf-8'))
                if unquote(targets.canonical or '') != unquote(expected) or unquote(targets.refresh or '') != unquote(expected):
                    errors.append(f'alias target mismatch: {alias}: expected {expected}')
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="check_content_outputs.py")
    parser.add_argument("--public", type=Path, required=True)
    parser.add_argument("--hugo-list", type=Path, required=True)
    parser.add_argument('--routes', type=Path)
    args = parser.parse_args(argv)

    records = json.loads(args.routes.read_text()) if args.routes else None
    errors = check_content_outputs(args.public, args.hugo_list, records)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
