from __future__ import annotations

import argparse
import json
import posixpath
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse


def _normalize_relative_path(path: str) -> str:
    return Path(path).as_posix()


def _validate_relative_path(path: str) -> str | None:
    normalized_path = _normalize_relative_path(path)
    candidate = Path(normalized_path)
    if candidate.is_absolute() or ".." in candidate.parts:
        return f"invalid output path: {normalized_path}"
    return None


HTML_VOID_TAGS = frozenset(
    {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    }
)


class _MenuLinkParser(HTMLParser):
    def __init__(self, page_path: str) -> None:
        super().__init__(convert_charrefs=True)
        self._page_path = page_path
        self._tag_stack: list[str] = []
        self._menu_root_depth: int | None = None
        self._current_href: str | None = None
        self._current_text: list[str] = []
        self.links: set[tuple[str, str]] = set()

    @property
    def _in_menu(self) -> bool:
        return (
            self._menu_root_depth is not None
            and len(self._tag_stack) >= self._menu_root_depth
        )

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized_tag = tag.lower()
        attributes = dict(attrs)

        in_menu = self._in_menu
        if normalized_tag not in HTML_VOID_TAGS:
            self._tag_stack.append(normalized_tag)
        if (
            self._menu_root_depth is None
            and normalized_tag == "ul"
            and attributes.get("id") == "menu"
        ):
            self._menu_root_depth = len(self._tag_stack)
        elif in_menu and normalized_tag == "a" and self._current_href is None:
            self._current_href = attributes.get("href")
            self._current_text = []

    def handle_startendtag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() not in HTML_VOID_TAGS:
            self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if self._current_href is not None:
            self._current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        normalized_tag = tag.lower()
        if normalized_tag == "a" and self._current_href is not None:
            href = self._current_href
            base_url = f"https://shuohui.invalid/{self._page_path.lstrip('/')}"
            path = posixpath.normpath(
                urlparse(urljoin(base_url, href)).path or "/"
            )
            if not path.startswith("/"):
                path = f"/{path}"
            if path != "/" and not path.endswith("/"):
                path = f"{path}/"
            text = "".join(self._current_text).strip()
            self.links.add((text, path))
            self._current_href = None
            self._current_text = []

        for index in range(len(self._tag_stack) - 1, -1, -1):
            if self._tag_stack[index] == normalized_tag:
                del self._tag_stack[index:]
                break
        if (
            self._menu_root_depth is not None
            and len(self._tag_stack) < self._menu_root_depth
        ):
            self._menu_root_depth = None


class _RedirectMetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.has_refresh_meta = False
        self.has_menu = False

    def _inspect(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {name.lower(): value or "" for name, value in attrs}
        if tag.lower() == "meta":
            self.has_refresh_meta |= attributes.get("http-equiv", "").lower() == "refresh"
        if tag.lower() == "ul":
            self.has_menu |= attributes.get("id") == "menu"

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._inspect(tag, attrs)

    def handle_startendtag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        self._inspect(tag, attrs)


def _is_redirect_stub(path: Path) -> bool:
    parser = _RedirectMetaParser()
    parser.feed(path.read_text(encoding="utf-8"))
    parser.close()
    return parser.has_refresh_meta and not parser.has_menu


def _discover_navigation_pages(public_dir: Path) -> list[str]:
    pages: list[str] = []
    for path in public_dir.rglob("*.html"):
        relative_path = path.relative_to(public_dir)
        if relative_path.parts[:1] == ("admin",):
            continue
        if _is_redirect_stub(path):
            continue
        pages.append(relative_path.as_posix())
    return sorted(pages)


def check_build(
    public_dir: Path,
    required: Iterable[str],
    forbidden: Iterable[str],
    sections: Iterable[dict[str, object]] | None = None,
    navigation_pages: Iterable[str] | None = None,
) -> list[str]:
    errors: list[str] = []

    for relative_path in required:
        normalized_path = _normalize_relative_path(relative_path)
        invalid_path_error = _validate_relative_path(relative_path)
        if invalid_path_error is not None:
            errors.append(invalid_path_error)
            continue
        if not (public_dir / normalized_path).is_file():
            errors.append(f"missing required output: {normalized_path}")

    for relative_path in forbidden:
        normalized_path = _normalize_relative_path(relative_path)
        invalid_path_error = _validate_relative_path(relative_path)
        if invalid_path_error is not None:
            errors.append(invalid_path_error)
            continue
        if (public_dir / normalized_path).is_file():
            errors.append(f"forbidden output exists: {normalized_path}")

    if sections is not None:
        registered_sections = list(sections)
        for section in registered_sections:
            section_path = f"{section['slug']}/index.html"
            if not (public_dir / section_path).is_file():
                errors.append(f"missing section index: {section_path}")
        pages = (
            list(navigation_pages)
            if navigation_pages is not None
            else _discover_navigation_pages(public_dir)
        )
        for relative_path in pages:
            normalized_path = _normalize_relative_path(relative_path)
            invalid_path_error = _validate_relative_path(relative_path)
            if invalid_path_error is not None:
                errors.append(invalid_path_error)
                continue

            output_path = public_dir / normalized_path
            if not output_path.is_file():
                errors.append(f"missing navigation output: {normalized_path}")
                continue

            parser = _MenuLinkParser(normalized_path)
            parser.feed(output_path.read_text(encoding="utf-8"))
            parser.close()
            for section in registered_sections:
                name = str(section["name"])
                path = f"/{section['slug']}/"
                if (name, path) not in parser.links:
                    errors.append(
                        f"missing section navigation: {normalized_path}: "
                        f"{name} -> {path}"
                    )

    return errors


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="check_build.py")
    parser.add_argument("--public", type=Path, required=True)
    parser.add_argument("--required", action="append", default=[])
    parser.add_argument("--forbidden", action="append", default=[])
    parser.add_argument("--sections", type=Path)
    return parser


def _load_sections_registry(path: Path) -> list[dict[str, object]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"{path}: file not found") from exc
    except OSError as exc:
        raise ValueError(f"{path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path}: invalid JSON: {exc.msg}") from exc

    if not isinstance(payload, dict) or not isinstance(payload.get("sections"), list):
        raise ValueError(f"{path}: expected an object with a sections list")
    if not all(isinstance(section, dict) for section in payload["sections"]):
        raise ValueError(f"{path}: sections must contain objects")

    sections: list[dict[str, object]] = []
    for index, raw_section in enumerate(payload["sections"]):
        section = dict(raw_section)
        name = section.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(
                f"{path}: sections[{index}].name: required non-empty string"
            )
        slug = section.get("slug")
        if not isinstance(slug, str) or not slug.strip():
            raise ValueError(
                f"{path}: sections[{index}].slug: required non-empty string"
            )
        sections.append(section)
    return sections


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    sections = None
    if args.sections is not None:
        try:
            sections = _load_sections_registry(args.sections)
        except ValueError as error:
            print(f"failed to read sections registry: {error}", file=sys.stderr)
            return 2
    errors = check_build(
        args.public,
        args.required,
        args.forbidden,
        sections=sections,
    )
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
