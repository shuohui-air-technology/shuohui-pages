from __future__ import annotations

import json
import re
from pathlib import Path


SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_sections(path: Path) -> list[dict[str, object]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"{path}: missing registry file") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path}: invalid JSON: {exc.msg}") from exc

    if not isinstance(payload, dict):
        raise ValueError(f"{path}: expected top-level object")

    sections = payload.get("sections")
    if not isinstance(sections, list):
        raise ValueError(f"{path}: sections: expected list")

    normalized: list[dict[str, object]] = []
    for index, section in enumerate(sections):
        if not isinstance(section, dict):
            raise ValueError(f"{path}: sections[{index}]: expected object")
        normalized.append(dict(section))
    return normalized


def validate_sections(sections: list[dict[str, object]], content_root: Path) -> None:
    seen_slugs: set[str] = set()
    seen_names: set[str] = set()

    for index, section in enumerate(sections):
        location = _section_location(section, index)

        name = section.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(
                f"{location}: name: required non-empty string for {_describe_slug(section)}"
            )
        if name in seen_names:
            raise ValueError(f"{location}: name: duplicate value {name!r}")
        seen_names.add(name)

        slug = section.get("slug")
        if not isinstance(slug, str) or not SLUG_RE.fullmatch(slug):
            raise ValueError(f"{location}: slug: invalid value {slug!r}")
        if slug in seen_slugs:
            raise ValueError(f"{location}: slug: duplicate value {slug!r}")
        seen_slugs.add(slug)

        weight = section.get("weight")
        if isinstance(weight, bool) or not isinstance(weight, int) or weight < 0:
            raise ValueError(f"{location}: weight: expected non-negative integer for {slug}")

        math = section.get("math")
        if not isinstance(math, bool):
            raise ValueError(f"{location}: math: expected boolean for {slug}")

    expected_dirs = seen_slugs
    actual_dirs = {
        path.name for path in content_root.iterdir() if path.is_dir() and path.name != "_index.md"
    }

    missing_dirs = sorted(expected_dirs - actual_dirs)
    if missing_dirs:
        missing_slug = missing_dirs[0]
        raise ValueError(
            f"content/{missing_slug}: missing section directory for registered slug"
        )

    unregistered_dirs = sorted(actual_dirs - expected_dirs)
    if unregistered_dirs:
        unregistered_slug = unregistered_dirs[0]
        raise ValueError(
            f"content/{unregistered_slug}: existing section directory is not registered"
        )


def render_section_index(section: dict[str, object]) -> str:
    title = _yaml_quote(_require_string(section, "name"))
    weight = _require_weight(section)
    return (
        "---\n"
        f"title: {title}\n"
        "menu:\n"
        "  main:\n"
        f"    name: {title}\n"
        f"    weight: {weight}\n"
        "---\n"
    )


def sync_sections(repo_root: Path) -> None:
    registry_path = repo_root / "data" / "sections.json"
    sections = load_sections(registry_path)
    validate_sections(sections, repo_root / "content")


def _section_location(section: dict[str, object], index: int) -> str:
    slug = section.get("slug")
    if isinstance(slug, str) and slug:
        return f"section[{index}] ({slug})"
    return f"section[{index}]"


def _describe_slug(section: dict[str, object]) -> str:
    slug = section.get("slug")
    if isinstance(slug, str) and slug:
        return slug
    return "unknown slug"


def _require_string(section: dict[str, object], field: str) -> str:
    value = section.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{_section_location(section, -1)}: {field}: required non-empty string")
    return value


def _require_weight(section: dict[str, object]) -> int:
    value = section.get("weight")
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(
            f"{_section_location(section, -1)}: weight: expected non-negative integer"
        )
    return value


def _yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)
