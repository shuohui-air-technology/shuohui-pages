#!/usr/bin/env python3
"""Fetch the pinned PaperMod theme into the local Hugo themes directory."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Callable, Sequence


PAPERMOD_REPOSITORY = "https://github.com/adityatelange/hugo-PaperMod.git"
PAPERMOD_COMMIT = "d3768854d00ad003b0a8dbdba254ce9224377a01"
THEME_RELATIVE_PATH = Path("themes/PaperMod")


RunGit = Callable[[Sequence[str], Path | None], str]


def run_git(args: Sequence[str], cwd: Path | None = None) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return completed.stdout.strip()


def bootstrap_theme(repository_root: Path, run: RunGit = run_git) -> Path:
    repository_root = repository_root.resolve()
    theme_path = repository_root / THEME_RELATIVE_PATH

    if theme_path.exists() and not (theme_path / ".git").is_dir():
        raise RuntimeError(
            f"{theme_path} exists but is not a git checkout; refusing to overwrite local files."
        )

    theme_path.parent.mkdir(parents=True, exist_ok=True)

    if not theme_path.exists():
        run(["clone", "--no-checkout", PAPERMOD_REPOSITORY, str(theme_path)], repository_root)
    else:
        dirty = run(["status", "--porcelain"], theme_path)
        if dirty:
            raise RuntimeError(
                f"{theme_path} has local changes; refusing to overwrite them."
            )

    run(["fetch", "--depth", "1", "origin", PAPERMOD_COMMIT], theme_path)
    run(["checkout", "--detach", PAPERMOD_COMMIT], theme_path)

    dirty = run(["status", "--porcelain"], theme_path)
    if dirty:
        raise RuntimeError(f"{theme_path} is not clean after checkout.")

    actual_commit = run(["rev-parse", "HEAD"], theme_path)
    if actual_commit != PAPERMOD_COMMIT:
        raise RuntimeError(
            f"PaperMod checkout is {actual_commit}, expected {PAPERMOD_COMMIT}."
        )

    return theme_path


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path.cwd(),
        help="Repository root containing hugo.toml (default: current directory).",
    )
    args = parser.parse_args(argv)

    try:
        theme_path = bootstrap_theme(args.repo_root)
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Theme bootstrap failed: {error}", file=sys.stderr)
        return 1

    print(f"PaperMod ready at {theme_path} ({PAPERMOD_COMMIT})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
