from __future__ import annotations

import json
import re
from pathlib import Path


SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ARTICLE_COLLECTIONS_MARKER = "## ARTICLE_COLLECTIONS ##"


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


def validate_sections(
    sections: list[dict[str, object]],
    content_root: Path,
    *,
    allow_missing_registered_dirs: bool = False,
) -> None:
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

    unregistered_dirs = sorted(actual_dirs - expected_dirs)
    if unregistered_dirs:
        unregistered_slug = unregistered_dirs[0]
        raise ValueError(
            f"content/{unregistered_slug}: existing section directory is not registered"
        )

    missing_dirs = sorted(expected_dirs - actual_dirs)
    if missing_dirs and not allow_missing_registered_dirs:
        missing_slug = missing_dirs[0]
        raise ValueError(
            f"content/{missing_slug}: missing section directory for registered slug"
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


def render_admin_config(sections: list[dict[str, object]], template: str) -> str:
    if ARTICLE_COLLECTIONS_MARKER not in template:
        raise ValueError("admin config template is missing the article-collection marker")

    collections = "\n".join(_render_article_collection(section) for section in sections)
    return template.replace(ARTICLE_COLLECTIONS_MARKER, collections)


def sync_sections(repo_root: Path) -> None:
    registry_path = repo_root / "data" / "sections.json"
    sections = load_sections(registry_path)
    content_root = repo_root / "content"
    validate_sections(sections, content_root, allow_missing_registered_dirs=True)

    for section in sections:
        slug = _require_string(section, "slug")
        section_root = content_root / slug
        section_root.mkdir(parents=True, exist_ok=True)
        (section_root / "_index.md").write_text(
            render_section_index(section),
            encoding="utf-8",
        )

    template_path = repo_root / "static" / "admin" / "config.template.yml"
    template = template_path.read_text(encoding="utf-8")
    rendered_config = render_admin_config(sections, template)
    (repo_root / "static" / "admin" / "config.yml").write_text(
        rendered_config,
        encoding="utf-8",
    )


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


def _render_article_collection(section: dict[str, object]) -> str:
    slug = _require_string(section, "slug")
    title = _yaml_quote(_require_string(section, "name"))
    math_default = _yaml_bool(_require_math(section))
    return (
        f'  - name: "{slug}"\n'
        f"    label: {title}\n"
        f'    folder: "content/{slug}"\n'
        "    create: true\n"
        "    fields:\n"
        '      - {label: "文章标题", name: "title", widget: "string"}\n'
        '      - {label: "发布日期", name: "date", widget: "datetime", format: "YYYY-MM-DDTHH:mm:ss", date_format: "YYYY-MM-DD", time_format: "HH:mm:ss"}\n'
        f'      - {{label: "是否开启公式(LaTeX)", name: "math", widget: "boolean", default: {math_default}}}\n'
        '      - {label: "是否为草稿", name: "draft", widget: "boolean", default: false}\n'
        '      - {label: "是否开启评论", name: "comments", widget: "boolean", default: true}\n'
        '      - label: "文章封面 (Cover)"\n'
        '        name: "cover"\n'
        '        widget: "object"\n'
        "        required: false\n"
        "        collapsed: true\n"
        "        fields:\n"
        '          - {label: "上传图片", name: "image", widget: "image", required: false}\n'
        '          - {label: "图片替代文字(Alt)", name: "alt", widget: "string", required: false}\n'
        '          - {label: "使用相对路径", name: "relative", widget: "boolean", default: true, required: false}\n'
        '      - {label: "正文内容", name: "body", widget: "markdown"}\n'
    )


def _require_math(section: dict[str, object]) -> bool:
    value = section.get("math")
    if not isinstance(value, bool):
        raise ValueError(f"{_section_location(section, -1)}: math: expected boolean")
    return value


def _yaml_bool(value: bool) -> str:
    return "true" if value else "false"
