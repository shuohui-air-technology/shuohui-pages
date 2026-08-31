import json
import importlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sync_sections_module = importlib.import_module("scripts.sync_sections")
load_sections = sync_sections_module.load_sections
render_section_index = sync_sections_module.render_section_index
sync_sections = sync_sections_module.sync_sections
validate_sections = sync_sections_module.validate_sections
check_generated_files = sync_sections_module.check_generated_files


VALID_REGISTRY = {
    "sections": [
        {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": True},
        {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
    ]
}


class SectionRegistryTests(unittest.TestCase):
    def test_sync_script_cli_generates_admin_config(self):
        repository_root = Path(__file__).resolve().parents[1]

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data_root = root / "data"
            data_root.mkdir()
            shutil.copyfile(
                repository_root / "data" / "sections.json",
                data_root / "sections.json",
            )
            self._write_content_layout(root, ["math", "acgn"])
            admin_root = root / "static" / "admin"
            admin_root.mkdir(parents=True)
            shutil.copyfile(
                repository_root / "static" / "admin" / "config.template.yml",
                admin_root / "config.template.yml",
            )

            result = subprocess.run(
                [sys.executable, str(repository_root / "scripts" / "sync_sections.py")],
                cwd=root,
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            generated = (admin_root / "config.yml").read_text(encoding="utf-8")
            self.assertIn("skip_ci: true", generated)

    def test_github_backend_defaults_to_skip_ci_true(self):
        repository_root = Path(__file__).resolve().parents[1]

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data_root = root / "data"
            data_root.mkdir()
            shutil.copyfile(
                repository_root / "data" / "sections.json",
                data_root / "sections.json",
            )
            self._write_content_layout(root, ["math", "acgn"])
            admin_root = root / "static" / "admin"
            admin_root.mkdir(parents=True)
            shutil.copyfile(
                repository_root / "static" / "admin" / "config.template.yml",
                admin_root / "config.template.yml",
            )

            sync_sections(root)

            template = (admin_root / "config.template.yml").read_text(encoding="utf-8")
            generated = (admin_root / "config.yml").read_text(encoding="utf-8")
            self.assertIn("skip_ci: true", template)
            self.assertIn("skip_ci: true", generated)

    def test_load_sections_reads_current_registry_shape(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sections.json"
            path.write_text(
                json.dumps(VALID_REGISTRY, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            self.assertEqual(load_sections(path), VALID_REGISTRY["sections"])

    def test_validate_sections_accepts_current_layout(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])

            validate_sections(VALID_REGISTRY["sections"], root / "content")

    def test_validate_sections_rejects_duplicate_slugs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": True},
                {"name": "随笔", "slug": "math", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, "slug.*math"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_invalid_slug(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {
                    "name": "学术推导与笔记",
                    "slug": "Math Notes",
                    "weight": 10,
                    "math": True,
                },
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, "slug.*Math Notes"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_reserved_admin_slug(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn", "admin"])
            sections = [
                {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": True},
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
                {"name": "后台", "slug": "admin", "weight": 30, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, r"slug.*reserved.*admin"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_non_integer_weight(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {
                    "name": "学术推导与笔记",
                    "slug": "math",
                    "weight": "10",
                    "math": True,
                },
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, "weight.*math"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_missing_name(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {"name": "", "slug": "math", "weight": 10, "math": True},
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(ValueError, "name.*math"):
                validate_sections(sections, root / "content")

    def test_validate_sections_rejects_unregistered_existing_content_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {"name": "学术推导与笔记", "slug": "math-notes", "weight": 10, "math": True},
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(
                ValueError,
                r"^content/math: existing section directory is not registered$",
            ):
                validate_sections(sections, root / "content")

    def test_render_section_index_matches_current_acgn_semantics(self):
        rendered = render_section_index(
            {"name": "随笔", "slug": "acgn", "weight": 20, "math": False}
        )

        self.assertEqual(
            rendered,
            '---\n'
            'title: "随笔"\n'
            "math: false\n"
            "menu:\n"
            "  main:\n"
            '    name: "随笔"\n'
            "    weight: 20\n"
            "---\n",
        )

    def test_render_section_index_propagates_math_rendering_default(self):
        rendered = render_section_index(
            {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": True}
        )

        self.assertEqual(
            rendered,
            '---\n'
            'title: "学术推导与笔记"\n'
            'math: true\n'
            'menu:\n'
            '  main:\n'
            '    name: "学术推导与笔记"\n'
            '    weight: 10\n'
            '---\n',
        )

    def test_render_admin_config_generates_section_collections_from_registry(self):
        render_admin_config = getattr(
            sync_sections_module, "render_admin_config", lambda sections, template: template
        )
        template = (
            "collections:\n"
            "  - name: \"pages\"\n"
            "    label: \"独立页面管理 (Pages)\"\n"
            "    files: []\n"
            "## ARTICLE_COLLECTIONS ##\n"
        )

        generated_config = render_admin_config(VALID_REGISTRY["sections"], template)

        self.assertIn('label: "随笔"', generated_config)
        self.assertIn('folder: "content/acgn"', generated_config)
        self.assertIn('folder: "content/math"', generated_config)
        self.assertIn('name: "title"', generated_config)
        self.assertIn('name: "date"', generated_config)
        self.assertIn('name: "math"', generated_config)
        self.assertIn('name: "draft"', generated_config)
        self.assertIn('name: "comments"', generated_config)
        self.assertIn('name: "cover"', generated_config)
        self.assertIn('name: "body"', generated_config)

    def test_sync_sections_generates_indexes_and_admin_config_from_registry(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            existing_article = root / "content" / "acgn" / "existing-entry.md"
            existing_article.write_text(
                "---\ntitle: \"Existing\"\n---\nBody stays put.\n",
                encoding="utf-8",
            )
            self._write_registry(
                root,
                {
                    "sections": [
                        {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": True},
                        {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
                        {"name": "旅行", "slug": "travel", "weight": 30, "math": False},
                    ]
                },
            )
            self._write_admin_template(root)

            sync_sections(root)
            first_config = (root / "static" / "admin" / "config.yml").read_text(
                encoding="utf-8"
            )
            first_travel_index = (root / "content" / "travel" / "_index.md").read_text(
                encoding="utf-8"
            )

            sync_sections(root)

            self.assertEqual(
                (root / "content" / "acgn" / "_index.md").read_text(encoding="utf-8"),
                '---\n'
                'title: "随笔"\n'
                "math: false\n"
                "menu:\n"
                "  main:\n"
                '    name: "随笔"\n'
                "    weight: 20\n"
                "---\n",
            )
            self.assertIn(
                "math: true",
                (root / "content" / "math" / "_index.md").read_text(encoding="utf-8"),
            )
            self.assertIn(
                'title: "随笔"',
                (root / "content" / "acgn" / "_index.md").read_text(encoding="utf-8"),
            )
            self.assertIn(
                "weight: 20",
                (root / "content" / "acgn" / "_index.md").read_text(encoding="utf-8"),
            )
            self.assertTrue((root / "content" / "travel").is_dir())
            self.assertEqual(
                (root / "content" / "travel" / "_index.md").read_text(encoding="utf-8"),
                '---\n'
                'title: "旅行"\n'
                "math: false\n"
                "menu:\n"
                "  main:\n"
                '    name: "旅行"\n'
                "    weight: 30\n"
                "---\n",
            )
            self.assertEqual(
                existing_article.read_text(encoding="utf-8"),
                "---\ntitle: \"Existing\"\n---\nBody stays put.\n",
            )

            generated_config = (root / "static" / "admin" / "config.yml").read_text(
                encoding="utf-8"
            )
            self.assertEqual(generated_config, first_config)
            self.assertEqual(
                (root / "content" / "travel" / "_index.md").read_text(encoding="utf-8"),
                first_travel_index,
            )
            self.assertIn('name: "travel"', generated_config)
            self.assertIn('folder: "content/travel"', generated_config)
            self.assertIn('name: "title"', generated_config)
            self.assertIn('name: "date"', generated_config)
            self.assertIn('name: "math"', generated_config)
            self.assertIn('name: "draft"', generated_config)
            self.assertIn('name: "comments"', generated_config)
            self.assertIn('name: "cover"', generated_config)
            self.assertIn('name: "body"', generated_config)

    def test_validate_sections_keeps_orphan_guard_when_registered_slug_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            sections = [
                {"name": "学术推导与笔记", "slug": "math-notes", "weight": 10, "math": True},
                {"name": "随笔", "slug": "acgn", "weight": 20, "math": False},
            ]

            with self.assertRaisesRegex(
                ValueError,
                r"^content/math: existing section directory is not registered$",
            ):
                validate_sections(sections, root / "content")

    def test_sync_sections_accepts_current_repository_layout(self):
        repository_root = Path(__file__).resolve().parents[1]
        sync_sections(repository_root)

    def test_check_generated_files_accepts_current_repository_layout(self):
        repository_root = Path(__file__).resolve().parents[1]

        self.assertEqual(check_generated_files(repository_root), [])

    def test_check_generated_files_reports_registry_output_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_content_layout(root, ["math", "acgn"])
            self._write_registry(root, VALID_REGISTRY)
            self._write_admin_template(root)
            sync_sections(root)
            (root / "static" / "admin" / "config.yml").write_text(
                "stale\n", encoding="utf-8"
            )

            errors = check_generated_files(root)

            self.assertEqual(errors, ["static/admin/config.yml: generated content drift"])

    def test_ci_and_readme_sync_sections_before_validation_and_build(self):
        repository_root = Path(__file__).resolve().parents[1]
        workflow = (repository_root / ".github" / "workflows" / "hugo.yml").read_text(
            encoding="utf-8"
        )
        readme = (repository_root / "README.md").read_text(encoding="utf-8")
        command = "python3 scripts/sync_sections.py"
        python_test_command = "python3 -m unittest discover -s tests -v"
        node_test_command = (
            "node --test tests/mathjax-config.test.mjs "
            "tests/mathjax-loader.test.mjs tests/mathjax-preview.test.mjs "
            "tests/markdown-format.test.mjs cloudflare-gateway/index.test.js"
        )

        self.assertIn(command, workflow)
        self.assertIn("python3 scripts/sync_sections.py --check", workflow)
        self.assertIn("--sections data/sections.json", workflow)
        self.assertIn("--content content", workflow)
        self.assertIn("--hugo-list /tmp/shuohui-hugo-list.csv", workflow)
        self.assertIn(python_test_command, workflow)
        self.assertIn(node_test_command, workflow)
        for required_output in (
            "--required admin/index.html",
            "--required admin/config.yml",
            "--required admin/markdown-format.js",
            "--required admin/mathjax-preview.js",
            "--required js/mathjax-config.js",
        ):
            self.assertIn(required_output, workflow)
        workflow_sync = workflow.index(command)
        self.assertLess(
            workflow.index("python3 scripts/bootstrap_theme.py"),
            workflow_sync,
        )
        self.assertLess(
            workflow_sync,
            workflow.index("python3 scripts/content_tools.py validate content"),
        )
        self.assertLess(
            workflow.index(python_test_command), workflow.index("hugo --minify")
        )
        self.assertLess(
            workflow.index(node_test_command), workflow.index("hugo --minify")
        )
        self.assertLess(
            workflow.index("python3 scripts/content_tools.py normalize content"),
            workflow.index(python_test_command),
        )
        self.assertLess(workflow_sync, workflow.index("hugo --minify"))

        normal_block_start = readme.index("```bash")
        normal_block_end = readme.index("```", normal_block_start + len("```bash"))
        normal_block = readme[normal_block_start:normal_block_end]
        release_heading = readme.index("For a release-grade smoke check")
        release_block_start = readme.index("```bash", release_heading)
        release_block_end = readme.index("```", release_block_start + len("```bash"))
        release_block = readme[release_block_start:release_block_end]

        normal_sync = normal_block.index(command)
        for validation_command in (
            "python3 scripts/content_tools.py normalize content",
            "python3 scripts/content_tools.py validate content",
        ):
            self.assertLess(normal_sync, normal_block.index(validation_command))

        for block in (normal_block, release_block):
            self.assertIn(command, block)
            self.assertLess(block.index(command), block.index("hugo --minify"))
            self.assertLess(
                block.index("python3 scripts/content_tools.py normalize content"),
                block.index(python_test_command),
            )
            self.assertLess(
                block.index(python_test_command), block.index("hugo --minify")
            )
            self.assertLess(
                block.index(node_test_command), block.index("hugo --minify")
            )

        self.assertIn("data/sections.json", readme)
        self.assertIn("--sections data/sections.json", release_block)
        self.assertIn("--content content", release_block)
        self.assertIn("--hugo-list /tmp/shuohui-hugo-list.csv", release_block)
        self.assertLess(
            workflow.index("hugo list all"),
            workflow.index("python3 scripts/check_build.py"),
        )
        self.assertIn("single source of truth", readme)
        self.assertIn("change `name` and `weight`", readme)
        self.assertIn("keep existing `slug` values stable", readme)
        self.assertIn("renaming or reordering a section", readme)
        self.assertIn("invalid `slug`", readme)
        self.assertIn("reserved", readme)
        self.assertIn("`admin`", readme)
        self.assertIn("before deployment", readme)

    def test_image_optimizer_is_scoped_and_pinned(self):
        repository_root = Path(__file__).resolve().parents[1]
        workflow = (
            repository_root / ".github" / "workflows" / "image-optimizer.yml"
        ).read_text(encoding="utf-8")

        self.assertIn("paths:", workflow)
        self.assertIn("- 'static/images/**'", workflow)
        self.assertIn("if: github.actor != 'github-actions[bot]'", workflow)
        self.assertIn("uses: actions/checkout@v4", workflow)
        self.assertIn(
            "uses: calibreapp/image-actions@9d037c06280028c110ff61c433ad4dc7d33c3c43",
            workflow,
        )
        self.assertIn("permissions:\n  contents: write", workflow)

    def test_pages_deployment_prefers_the_newest_build(self):
        repository_root = Path(__file__).resolve().parents[1]
        workflow = (repository_root / ".github" / "workflows" / "hugo.yml").read_text(
            encoding="utf-8"
        )

        self.assertIn('cancel-in-progress: true', workflow)

    def _write_content_layout(self, repo_root: Path, section_slugs: list[str]) -> None:
        content_root = repo_root / "content"
        content_root.mkdir()
        (content_root / "_index.md").write_text("---\ntitle: Home\n---\n", encoding="utf-8")
        for slug in section_slugs:
            section_dir = content_root / slug
            section_dir.mkdir()
            (section_dir / "_index.md").write_text(
                f'---\ntitle: "{slug}"\n---\n',
                encoding="utf-8",
            )

    def _write_registry(self, repo_root: Path, registry: dict[str, object]) -> None:
        data_root = repo_root / "data"
        data_root.mkdir()
        (data_root / "sections.json").write_text(
            json.dumps(registry, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _write_admin_template(self, repo_root: Path) -> None:
        admin_root = repo_root / "static" / "admin"
        admin_root.mkdir(parents=True)
        (admin_root / "config.template.yml").write_text(
            "editor:\n"
            "  preview: true\n"
            "\n"
            "backend:\n"
            "  name: github\n"
            "\n"
            "media_folder: \"static/images\"\n"
            "public_folder: \"/images\"\n"
            "\n"
            "collections:\n"
            "  - name: \"pages\"\n"
            "    label: \"独立页面管理 (Pages)\"\n"
            "    files: []\n"
            "## ARTICLE_COLLECTIONS ##\n",
            encoding="utf-8",
        )


if __name__ == "__main__":
    unittest.main()
