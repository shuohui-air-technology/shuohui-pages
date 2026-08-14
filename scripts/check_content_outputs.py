from __future__ import annotations

import argparse
import csv
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


def check_content_outputs(public: Path, hugo_list: Path) -> list[str]:
    errors: list[str] = []
    with hugo_list.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        missing_columns = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing_columns:
            return [
                "hugo list output missing columns: "
                + ", ".join(sorted(missing_columns))
            ]

        for row in reader:
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

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="check_content_outputs.py")
    parser.add_argument("--public", type=Path, required=True)
    parser.add_argument("--hugo-list", type=Path, required=True)
    args = parser.parse_args(argv)

    errors = check_content_outputs(args.public, args.hugo_list)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
