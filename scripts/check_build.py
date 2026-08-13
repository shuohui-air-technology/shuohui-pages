from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable


def _normalize_relative_path(path: str) -> str:
    return Path(path).as_posix()


def check_build(
    public_dir: Path, required: Iterable[str], forbidden: Iterable[str]
) -> list[str]:
    errors: list[str] = []

    for relative_path in required:
        normalized_path = _normalize_relative_path(relative_path)
        if not (public_dir / normalized_path).is_file():
            errors.append(f"missing required output: {normalized_path}")

    for relative_path in forbidden:
        normalized_path = _normalize_relative_path(relative_path)
        if (public_dir / normalized_path).is_file():
            errors.append(f"forbidden output exists: {normalized_path}")

    return errors


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="check_build.py")
    parser.add_argument("--public", type=Path, required=True)
    parser.add_argument("--required", action="append", default=[])
    parser.add_argument("--forbidden", action="append", default=[])
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    errors = check_build(args.public, args.required, args.forbidden)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
