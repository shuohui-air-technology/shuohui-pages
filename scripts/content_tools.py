from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path


DATE_MINUTE_RE = re.compile(r"^(date:\s*)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$")
DATE_SECOND_RE = re.compile(r"^(date:\s*)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})$")
FRONT_MATTER_DATE_RE = re.compile(
    r"^date:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})$"
)


def normalize_date_text(text: str) -> str:
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return text

    closing_index = None
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            closing_index = index
            break
    if closing_index is None:
        return text

    for index in range(1, closing_index):
        line = lines[index]
        stripped = line.rstrip("\r\n")
        newline = line[len(stripped) :]
        if DATE_SECOND_RE.match(stripped):
            break
        match = DATE_MINUTE_RE.match(stripped)
        if match:
            lines[index] = f"{match.group(1)}{match.group(2)}:00{newline}"
            return "".join(lines)
    return text


def parse_front_matter(text: str) -> dict[str, object]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    parsed: dict[str, object] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if not line or line[0].isspace():
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        if value == "true":
            parsed[key] = True
        elif value == "false":
            parsed[key] = False
        elif value == "null":
            parsed[key] = None
        elif value[:1] in {"'", '"'} and value[-1:] == value[:1] and len(value) >= 2:
            parsed[key] = value[1:-1]
        else:
            parsed[key] = value
    return parsed


def _front_matter_lines(text: str) -> list[str] | None:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            return lines[1:index]
    return None


def _validate_date(value: object) -> bool:
    if not isinstance(value, str):
        return False
    if not FRONT_MATTER_DATE_RE.match(f"date: {value}"):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%dT%H:%M:%S")
    except ValueError:
        return False
    return True


def validate_front_matter(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    front_matter = _front_matter_lines(text)
    if front_matter is None:
        return [f"{path}: front matter: missing"]

    parsed = parse_front_matter(text)
    errors: list[str] = []

    if "title" not in parsed or not isinstance(parsed["title"], str) or not parsed["title"]:
        errors.append(f"{path}: title: missing")

    if "date" not in parsed:
        errors.append(f"{path}: date: missing")
    elif not _validate_date(parsed["date"]):
        errors.append(f"{path}: date: invalid")

    for field in ("draft", "math", "comments"):
        if field in parsed and not isinstance(parsed[field], bool):
            errors.append(f"{path}: {field}: expected boolean")

    return errors


def iter_markdown_files(content_dir: Path):
    yield from sorted(path for path in content_dir.rglob("*.md") if path.is_file())


def normalize_files(content_dir: Path) -> int:
    changed = 0
    for path in iter_markdown_files(content_dir):
        original = path.read_text(encoding="utf-8")
        updated = normalize_date_text(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    return changed


def validate_files(content_dir: Path) -> list[str]:
    errors: list[str] = []
    for path in iter_markdown_files(content_dir):
        errors.extend(validate_front_matter(path))
    return errors


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="content_tools.py")
    subparsers = parser.add_subparsers(dest="command", required=True)

    normalize_parser = subparsers.add_parser("normalize")
    normalize_parser.add_argument("content_dir", type=Path)

    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("content_dir", type=Path)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.command == "normalize":
        normalize_files(args.content_dir)
        return 0

    errors = validate_files(args.content_dir)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
