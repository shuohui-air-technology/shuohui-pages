import json
import subprocess
import sys
import tempfile
import unittest
from html import escape
from pathlib import Path

from scripts.check_build import check_build


MATHJAX_CONFIG_TAG = '<script src="/js/mathjax-config.js?v=lazy-1"></script>'
MATHJAX_RUNTIME_TAG = (
    '<script src="https://cdn.jsdelivr.net/npm/'
    'mathjax@3.2.2/es5/tex-mml-chtml.js"></script>'
)


def _render_hugo_menu(
    sections: list[dict[str, object]], wrong_section: dict[str, object] | None = None
) -> str:
    links = []
    for index, section in enumerate(sections):
        href = f"https://shuohui.uk/{section['slug']}/"
        href_attribute = f'"{href}"' if index % 2 == 0 else href
        label = "错误板块" if section is wrong_section else str(section["name"])
        links.append(f"<li><a href={href_attribute}>{escape(label)}</a></li>")
    return f'<ul id="menu">{"".join(links)}</ul>'


def _write_html(public: Path, relative_path: str, content: str) -> None:
    output_path = public / relative_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")


def _write_math_page(
    public: Path,
    relative_path: str,
    *,
    config: bool,
    runtime: bool,
) -> None:
    scripts = (MATHJAX_CONFIG_TAG if config else "") + (
        MATHJAX_RUNTIME_TAG if runtime else ""
    )
    _write_html(public, relative_path, f"<html><head>{scripts}</head></html>")
    if config:
        config_path = public / "js" / "mathjax-config.js"
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text("window.MathJax = {};", encoding="utf-8")


class BuildCheckTests(unittest.TestCase):
    def test_math_section_requires_mathjax_assets(self):
        sections = [
            {"name": "Math", "slug": "math", "weight": 10, "math": True}
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            content = root / "content"
            public.mkdir()
            content.mkdir()
            _write_math_page(
                public, "math/index.html", config=False, runtime=False
            )
            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=[],
                content_dir=content,
            )
        self.assertEqual(
            errors,
            [
                "missing MathJax config: math/index.html",
                "missing MathJax runtime: math/index.html",
            ],
        )

    def test_non_math_section_rejects_unnecessary_mathjax_assets(self):
        sections = [
            {"name": "Essays", "slug": "acgn", "weight": 20, "math": False}
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            content = root / "content"
            public.mkdir()
            content.mkdir()
            _write_math_page(
                public, "acgn/index.html", config=False, runtime=True
            )
            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=[],
                content_dir=content,
            )
        self.assertEqual(
            errors,
            ["unexpected MathJax runtime: acgn/index.html"],
        )

    def test_mixed_section_allows_mathjax_when_a_published_child_enables_math(self):
        sections = [
            {"name": "Mixed", "slug": "mixed", "weight": 30, "math": False}
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            content = root / "content"
            public.mkdir()
            article = content / "mixed" / "formula.md"
            article.parent.mkdir(parents=True)
            article.write_text(
                '---\n'
                'title: "Formula"\n'
                'draft: false\n'
                'math: true\n'
                '---\n\n$x$\n',
                encoding="utf-8",
            )
            _write_math_page(
                public, "mixed/index.html", config=True, runtime=True
            )
            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=[],
                content_dir=content,
            )
        self.assertEqual(errors, [])

    def test_draft_math_child_does_not_enable_a_non_math_section(self):
        sections = [
            {"name": "Mixed", "slug": "mixed", "weight": 30, "math": False}
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            content = root / "content"
            public.mkdir()
            article = content / "mixed" / "draft.md"
            article.parent.mkdir(parents=True)
            article.write_text(
                '---\ntitle: "Draft"\ndraft: true\nmath: true\n---\n',
                encoding="utf-8",
            )
            _write_math_page(
                public, "mixed/index.html", config=True, runtime=True
            )
            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=[],
                content_dir=content,
            )
        self.assertEqual(
            errors,
            [
                "unexpected MathJax config: mixed/index.html",
                "unexpected MathJax runtime: mixed/index.html",
            ],
        )

    def test_registered_sections_navigation_is_checked_on_all_primary_pages(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        page_paths = [
            "index.html",
            *(f"{section['slug']}/index.html" for section in sections),
            f"{sections[0]['slug']}/example/index.html",
        ]
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            for page_path in page_paths:
                _write_html(public, page_path, _render_hugo_menu(sections))

            try:
                errors = check_build(
                    public,
                    required=[],
                    forbidden=[],
                    sections=sections,
                    navigation_pages=page_paths,
                )
            except TypeError as error:
                self.fail(f"check_build does not support section navigation checks: {error}")

            self.assertEqual(errors, [])

    def test_missing_or_wrong_section_navigation_is_reported(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        page_paths = [
            "index.html",
            *(f"{section['slug']}/index.html" for section in sections),
            f"{sections[0]['slug']}/example/index.html",
        ]
        broken_page = f"{sections[-1]['slug']}/index.html"
        broken_section = sections[-1]

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            for page_path in page_paths:
                wrong_section = broken_section if page_path == broken_page else None
                _write_html(public, page_path, _render_hugo_menu(sections, wrong_section))

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=page_paths,
            )

            self.assertEqual(
                errors,
                [
                    f"missing section navigation: {broken_page}: "
                    f"{broken_section['name']} -> /{broken_section['slug']}/"
                ],
            )

    def test_menu_parser_ignores_body_links_after_void_tags(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        menu_with_body_link = (
            '<ul id="menu">'
            '<li><a href="/math/">学术推导与笔记</a></li>'
            '<meta charset=utf-8><link rel=stylesheet href=/style.css>'
            '<img src=/logo.svg>'
            '</ul>'
            '<p><a href="/acgn/">随笔</a></p>'
        )

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            _write_registered_section_indexes(public, sections)
            (public / "style.css").write_text("", encoding="utf-8")
            (public / "logo.svg").write_text("<svg></svg>", encoding="utf-8")
            _write_html(public, "index.html", menu_with_body_link)

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=["index.html"],
            )

            self.assertEqual(
                errors,
                ["missing section navigation: index.html: 随笔 -> /acgn/"],
            )

    def test_nested_page_relative_menu_links_resolve_from_page_path(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        nested_page = "acgn/page/1/index.html"
        relative_menu = (
            '<ul id="menu">'
            '<li><a href=../../../math/>学术推导与笔记</a></li>'
            '<li><a href="../../../acgn/">&#x968f;&#x7b14;</a></li>'
            "</ul>"
        )

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            _write_registered_section_indexes(public, sections)
            _write_html(public, nested_page, relative_menu)

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=[nested_page],
            )

            self.assertEqual(errors, [])

    def test_nested_relative_menu_link_without_trailing_slash_matches_section(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        nested_page = "acgn/page/1/index.html"
        relative_menu = (
            '<ul id="menu">'
            '<li><a href=../../../math>学术推导与笔记</a></li>'
            '<li><a href="../../../acgn/">随笔</a></li>'
            "</ul>"
        )

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            _write_registered_section_indexes(public, sections)
            _write_html(public, nested_page, relative_menu)

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=[nested_page],
            )

            self.assertEqual(errors, [])

    def test_registered_section_index_output_is_required(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        new_section = {
            "name": "旅行",
            "slug": "travel",
            "weight": 30,
            "math": False,
        }
        sections = [*sections, new_section]
        page_paths = [
            "index.html",
            *(f"{section['slug']}/index.html" for section in sections[:-1]),
        ]

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            for page_path in page_paths:
                _write_html(public, page_path, _render_hugo_menu(sections))

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
                navigation_pages=page_paths,
            )

            self.assertIn("missing section index: travel/index.html", errors)

    def test_sections_without_navigation_pages_auto_discovers_html_and_excludes_admin(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        page_paths = [
            "index.html",
            *(f"{section['slug']}/index.html" for section in sections),
            f"{sections[0]['slug']}/example/index.html",
        ]
        broken_page = f"{sections[0]['slug']}/example/index.html"
        broken_section = sections[0]

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            for page_path in page_paths:
                wrong_section = broken_section if page_path == broken_page else None
                _write_html(public, page_path, _render_hugo_menu(sections, wrong_section))
            _write_html(public, "admin/index.html", "not a public navigation page")

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
            )

            self.assertEqual(
                errors,
                [
                    f"missing section navigation: {broken_page}: "
                    f"{broken_section['name']} -> /{broken_section['slug']}/"
                ],
            )

    def test_auto_discovery_only_excludes_top_level_admin(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        nested_admin_page = "acgn/admin/example/index.html"
        incomplete_menu = '<ul id="menu"><a href="/math/">学术推导与笔记</a></ul>'

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            _write_registered_section_indexes(public, sections)
            _write_html(public, nested_admin_page, incomplete_menu)

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
            )

            self.assertEqual(
                errors,
                [
                    f"missing section navigation: {nested_admin_page}: "
                    "随笔 -> /acgn/"
                ],
            )

    def test_auto_discovery_excludes_hugo_alias_redirect_stubs(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            _write_registered_section_indexes(public, sections)
            _write_html(public, "index.html", _render_hugo_menu(sections))
            _write_html(
                public,
                "acgn/page/1/index.html",
                '<meta http-equiv=refresh content="0; url=https://shuohui.uk/acgn/">',
            )

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
            )

            self.assertEqual(errors, [])

    def test_refresh_meta_page_with_real_menu_is_not_skipped(self):
        registry_path = Path(__file__).resolve().parents[1] / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        page_with_menu = (
            '<meta http-equiv=refresh content="0; url=https://shuohui.uk/acgn/">'
            '<ul id="menu"><a href="/math/">学术推导与笔记</a></ul>'
        )

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            _write_registered_section_indexes(public, sections)
            _write_html(public, "index.html", page_with_menu)

            errors = check_build(
                public,
                required=[],
                forbidden=[],
                sections=sections,
            )

            self.assertEqual(
                errors,
                ["missing section navigation: index.html: 随笔 -> /acgn/"],
            )

    def test_cli_sections_argument_checks_discovered_navigation(self):
        repository_root = Path(__file__).resolve().parents[1]
        registry_path = repository_root / "data" / "sections.json"
        sections = json.loads(registry_path.read_text(encoding="utf-8"))["sections"]
        script_path = repository_root / "scripts" / "check_build.py"

        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            _write_registered_section_indexes(public, sections)
            _write_html(public, "index.html", _render_hugo_menu(sections))
            result = subprocess.run(
                [
                    sys.executable,
                    str(script_path),
                    "--public",
                    str(public),
                    "--sections",
                    str(registry_path),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)

    def test_cli_reports_sections_registry_read_errors(self):
        repository_root = Path(__file__).resolve().parents[1]
        script_path = repository_root / "scripts" / "check_build.py"

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            public.mkdir()
            registry_path = root / "broken-sections.json"
            registry_path.write_text("{not valid json", encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(script_path),
                    "--public",
                    str(public),
                    "--sections",
                    str(registry_path),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 2)
            self.assertIn("failed to read sections registry", result.stderr)

    def test_cli_rejects_sections_without_name_or_slug(self):
        repository_root = Path(__file__).resolve().parents[1]
        script_path = repository_root / "scripts" / "check_build.py"
        malformed_sections = [
            {
                "name": "",
                "slug": "math",
                "weight": 10,
                "math": True,
            },
            {
                "name": "随笔",
                "weight": 20,
                "math": False,
            },
        ]

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / "public"
            public.mkdir()
            for index, section in enumerate(malformed_sections):
                registry_path = root / f"broken-sections-{index}.json"
                registry_path.write_text(
                    json.dumps({"sections": [section]}, ensure_ascii=False),
                    encoding="utf-8",
                )
                result = subprocess.run(
                    [
                        sys.executable,
                        str(script_path),
                        "--public",
                        str(public),
                        "--sections",
                        str(registry_path),
                    ],
                    capture_output=True,
                    text=True,
                    check=False,
                )

                self.assertEqual(result.returncode, 2)
                self.assertIn("failed to read sections registry", result.stderr)
                self.assertIn(
                    "name" if index == 0 else "slug",
                    result.stderr,
                )

    def test_required_and_forbidden_paths_are_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            (public / "acgn").mkdir()
            (public / "acgn/index.html").write_text("ok", encoding="utf-8")
            errors = check_build(
                public,
                required=["acgn/index.html"],
                forbidden=["acgn/draft/index.html"],
            )
            self.assertEqual(errors, [])

    def test_missing_required_path_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            errors = check_build(Path(directory), ["sitemap.xml"], [])
            self.assertEqual(errors, ["missing required output: sitemap.xml"])

    def test_present_forbidden_path_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            (public / "draft/index.html").parent.mkdir()
            (public / "draft/index.html").write_text("draft", encoding="utf-8")
            errors = check_build(public, [], ["draft/index.html"])
            self.assertEqual(errors, ["forbidden output exists: draft/index.html"])

    def test_missing_root_relative_static_asset_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            _write_html(
                public,
                "admin/index.html",
                '<script src="/admin/missing.js?v=build-1"></script>',
            )

            errors = check_build(public, [], [])

            self.assertEqual(
                errors,
                ["missing static asset: admin/index.html -> /admin/missing.js"],
            )

    def test_url_encoded_root_relative_static_asset_is_resolved(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            image = public / "images" / "截图.png"
            image.parent.mkdir(parents=True)
            image.write_bytes(b"image")
            _write_html(
                public,
                "math/index.html",
                '<img src="/images/%E6%88%AA%E5%9B%BE.png">',
            )

            self.assertEqual(check_build(public, [], []), [])

    def test_absolute_and_traversal_paths_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            errors = check_build(public, ["/etc/hosts"], ["../escape.txt"])
            self.assertEqual(
                errors,
                [
                    "invalid output path: /etc/hosts",
                    "invalid output path: ../escape.txt",
                ],
            )

def _write_registered_section_indexes(
    public: Path, sections: list[dict[str, object]]
) -> None:
    for section in sections:
        _write_html(
            public,
            f"{section['slug']}/index.html",
            _render_hugo_menu(sections),
        )


if __name__ == "__main__":
    unittest.main()
