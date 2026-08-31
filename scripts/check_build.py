from __future__ import annotations

import argparse
import csv
import json
import posixpath
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import unquote, urljoin, urlparse

try:
    from scripts.content_tools import parse_front_matter
except ModuleNotFoundError:  # Direct execution: python3 scripts/check_build.py
    from content_tools import parse_front_matter


MATHJAX_CONFIG_PATH = "/js/mathjax-config.js"
MATHJAX_RUNTIME_URL = (
    "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js"
)
HUGO_INVENTORY_COLUMNS = {"path", "draft", "permalink", "kind", "section"}
SECTION_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _normalize_relative_path(path: str) -> str:
    return Path(path).as_posix()


def _validate_relative_path(path: str) -> str | None:
    normalized_path = _normalize_relative_path(path)
    candidate = Path(normalized_path)
    if candidate.is_absolute() or ".." in candidate.parts:
        return f"invalid output path: {normalized_path}"
    return None


def _normalized_url_path(url: str, page_path: str = "index.html") -> str:
    base_url = f"https://shuohui.invalid/{page_path.lstrip('/')}"
    raw_path = unquote(urlparse(urljoin(base_url, url)).path or "/")
    path = posixpath.normpath(raw_path)
    if not path.startswith("/"):
        path = f"/{path}"
    if path != "/" and not path.endswith("/"):
        path = f"{path}/"
    return path


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
            path = _normalized_url_path(href, self._page_path)
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


class _SourceAttributeParser(HTMLParser):
    RESOURCE_TAGS = frozenset(
        {
            "audio",
            "embed",
            "iframe",
            "img",
            "input",
            "script",
            "source",
            "track",
            "video",
        }
    )

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.sources: list[str] = []

    def _inspect(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() not in self.RESOURCE_TAGS:
            return
        source = dict(attrs).get("src")
        if source:
            self.sources.append(source)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._inspect(tag, attrs)

    def handle_startendtag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        self._inspect(tag, attrs)


class _ScriptSourceParser(HTMLParser):
    EXECUTABLE_TYPES = frozenset(
        {"", "application/javascript", "module", "text/javascript"}
    )

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.sources: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "script":
            return
        attributes = {name.lower(): value or "" for name, value in attrs}
        source = attributes.get("src")
        script_type = attributes.get("type", "").strip().lower()
        if source and script_type in self.EXECUTABLE_TYPES:
            self.sources.append(source)


class _PageLinkParser(HTMLParser):
    def __init__(self, page_path: str) -> None:
        super().__init__(convert_charrefs=True)
        self._page_path = page_path
        self.paths: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.paths.add(_normalized_url_path(href, self._page_path))


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


def _check_root_relative_assets(public_dir: Path) -> list[str]:
    errors: list[str] = []
    for html_path in sorted(public_dir.rglob("*.html")):
        relative_html_path = html_path.relative_to(public_dir).as_posix()
        source = html_path.read_text(encoding="utf-8")
        parser = _SourceAttributeParser()
        parser.feed(source)
        parser.close()
        for source_url in parser.sources:
            parsed = urlparse(source_url)
            if parsed.scheme or parsed.netloc or not parsed.path.startswith("/"):
                continue
            asset_path = Path(unquote(parsed.path.lstrip("/")))
            if asset_path.is_absolute() or ".." in asset_path.parts:
                errors.append(
                    f"invalid static asset: {relative_html_path} -> {parsed.path}"
                )
                continue
            if not (public_dir / asset_path).is_file():
                errors.append(
                    f"missing static asset: {relative_html_path} -> {parsed.path}"
                )
    return errors


def _load_hugo_inventory(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    try:
        with path.open(encoding="utf-8", newline="") as stream:
            reader = csv.DictReader(stream)
            missing_columns = HUGO_INVENTORY_COLUMNS - set(reader.fieldnames or [])
            if missing_columns:
                return [], [
                    "Hugo content inventory missing columns: "
                    + ", ".join(sorted(missing_columns))
                ]
            return list(reader), []
    except FileNotFoundError:
        return [], [f"Hugo content inventory not found: {path}"]
    except (OSError, csv.Error) as error:
        return [], [f"failed to read Hugo content inventory: {path}: {error}"]


def _output_path_from_permalink(permalink: str) -> Path:
    raw_path = unquote(urlparse(permalink).path or "/")
    had_trailing_slash = raw_path.endswith("/")
    path = posixpath.normpath(f"/{raw_path.lstrip('/')}").lstrip("/")
    if not path:
        return Path("index.html")
    if had_trailing_slash:
        path = f"{path}/index.html"
    return Path(path)


def _inventory_source_path(content_dir: Path, inventory_path: str) -> Path | None:
    raw_path = Path(inventory_path)
    candidates = (
        raw_path if raw_path.is_absolute() else content_dir.parent / raw_path,
        content_dir / raw_path,
    )
    content_root = content_dir.resolve()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            resolved.relative_to(content_root)
        except (OSError, ValueError):
            continue
        if resolved.is_file():
            return resolved
    return None


def _published_section_has_math(
    public_dir: Path,
    content_dir: Path,
    slug: str,
    section_path: str,
    section_source: str,
    inventory: Iterable[dict[str, str]],
) -> tuple[bool, list[str]]:
    parser = _PageLinkParser(section_path)
    parser.feed(section_source)
    parser.close()
    errors: list[str] = []

    for row in inventory:
        if row.get("kind") != "page" or row.get("section") != slug:
            continue
        if row.get("draft", "").strip().lower() == "true":
            continue
        permalink = row.get("permalink", "")
        if not permalink or _normalized_url_path(permalink) not in parser.paths:
            continue
        if not (public_dir / _output_path_from_permalink(permalink)).is_file():
            continue
        source_path = _inventory_source_path(content_dir, row.get("path", ""))
        if source_path is None:
            errors.append(f"missing Hugo inventory source: {row.get('path', '')}")
            continue
        front_matter = parse_front_matter(source_path.read_text(encoding="utf-8"))
        if front_matter.get("math") is True:
            return True, errors
    return False, errors


def _mathjax_assets(source: str) -> tuple[bool, bool]:
    parser = _ScriptSourceParser()
    parser.feed(source)
    parser.close()
    expected_runtime = urlparse(MATHJAX_RUNTIME_URL)
    has_config = False
    has_runtime = False

    for source_url in parser.sources:
        parsed = urlparse(source_url)
        if (
            not parsed.scheme
            and not parsed.netloc
            and unquote(parsed.path) == MATHJAX_CONFIG_PATH
        ):
            has_config = True
        if (
            parsed.scheme == expected_runtime.scheme
            and parsed.netloc == expected_runtime.netloc
            and parsed.path == expected_runtime.path
        ):
            has_runtime = True
    return has_config, has_runtime


def _check_math_loading_scope(
    public_dir: Path,
    sections: Iterable[dict[str, object]],
    content_dir: Path,
    hugo_list: Path,
) -> list[str]:
    errors: list[str] = []
    inventory, inventory_errors = _load_hugo_inventory(hugo_list)
    if inventory_errors:
        return inventory_errors
    for section in sections:
        relative_path = f"{section['slug']}/index.html"
        output_path = public_dir / relative_path
        if not output_path.is_file():
            continue
        source = output_path.read_text(encoding="utf-8")
        needs_math = section.get("math") is True
        if not needs_math:
            needs_math, source_errors = _published_section_has_math(
                public_dir,
                content_dir,
                str(section["slug"]),
                relative_path,
                source,
                inventory,
            )
            errors.extend(source_errors)
        has_config, has_runtime = _mathjax_assets(source)
        if needs_math and not has_config:
            errors.append(f"missing MathJax config: {relative_path}")
        if needs_math and not has_runtime:
            errors.append(f"missing MathJax runtime: {relative_path}")
        if not needs_math and has_config:
            errors.append(f"unexpected MathJax config: {relative_path}")
        if not needs_math and has_runtime:
            errors.append(f"unexpected MathJax runtime: {relative_path}")
    return errors


def check_build(
    public_dir: Path,
    required: Iterable[str],
    forbidden: Iterable[str],
    sections: Iterable[dict[str, object]] | None = None,
    navigation_pages: Iterable[str] | None = None,
    content_dir: Path | None = None,
    hugo_list: Path | None = None,
) -> list[str]:
    errors: list[str] = []

    if content_dir is not None and sections is None:
        errors.append("content scope requires sections")
    if hugo_list is not None and content_dir is None:
        errors.append("Hugo content inventory requires content directory")

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

    errors.extend(_check_root_relative_assets(public_dir))

    if sections is not None:
        registered_sections = list(sections)
        content_scope_valid = False
        for section in registered_sections:
            section_path = f"{section['slug']}/index.html"
            if not (public_dir / section_path).is_file():
                errors.append(f"missing section index: {section_path}")
        if content_dir is not None and not content_dir.is_dir():
            errors.append(f"invalid content directory: {content_dir}")
        elif content_dir is not None:
            missing_content_sections: list[str] = []
            for section in registered_sections:
                slug = str(section["slug"])
                if not (content_dir / slug).is_dir():
                    missing_content_sections.append(slug)
            errors.extend(
                f"missing content section: {slug}"
                for slug in missing_content_sections
            )
            content_scope_valid = not missing_content_sections
        if content_scope_valid and hugo_list is None:
            errors.append("missing Hugo content inventory")
        elif content_scope_valid and content_dir is not None and hugo_list is not None:
            errors.extend(
                _check_math_loading_scope(
                    public_dir,
                    registered_sections,
                    content_dir,
                    hugo_list,
                )
            )
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
    parser.add_argument("--content", type=Path)
    parser.add_argument("--hugo-list", type=Path)
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
    seen_slugs: set[str] = set()
    for index, raw_section in enumerate(payload["sections"]):
        section = dict(raw_section)
        name = section.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(
                f"{path}: sections[{index}].name: required non-empty string"
            )
        slug = section.get("slug")
        if not isinstance(slug, str) or not SECTION_SLUG_RE.fullmatch(slug):
            raise ValueError(
                f"{path}: sections[{index}].slug: invalid value {slug!r}"
            )
        if slug == "admin":
            raise ValueError(
                f"{path}: sections[{index}].slug: reserved value 'admin'"
            )
        if slug in seen_slugs:
            raise ValueError(
                f"{path}: sections[{index}].slug: duplicate value {slug!r}"
            )
        seen_slugs.add(slug)
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
    if args.content is not None and sections is None:
        print("--content requires --sections", file=sys.stderr)
        return 2
    if args.hugo_list is not None and args.content is None:
        print("--hugo-list requires --content", file=sys.stderr)
        return 2
    if args.content is not None and not args.content.is_dir():
        print(f"invalid content directory: {args.content}", file=sys.stderr)
        return 2
    if args.content is not None and args.hugo_list is None:
        print("--content requires --hugo-list", file=sys.stderr)
        return 2
    if args.hugo_list is not None and not args.hugo_list.is_file():
        print(f"invalid Hugo content inventory: {args.hugo_list}", file=sys.stderr)
        return 2
    if args.content is not None and sections is not None:
        missing_sections = [
            str(section["slug"])
            for section in sections
            if not (args.content / str(section["slug"])).is_dir()
        ]
        if missing_sections:
            print(
                "content directory missing registered sections: "
                + ", ".join(missing_sections),
                file=sys.stderr,
            )
            return 2
    errors = check_build(
        args.public,
        args.required,
        args.forbidden,
        sections=sections,
        content_dir=args.content,
        hugo_list=args.hugo_list,
    )
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
