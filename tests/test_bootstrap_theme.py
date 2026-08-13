import tempfile
import unittest
from pathlib import Path

from scripts.bootstrap_theme import (
    PAPERMOD_COMMIT,
    PAPERMOD_REPOSITORY,
    bootstrap_theme,
)


class BootstrapThemeTests(unittest.TestCase):
    def test_bootstrap_clones_and_checks_out_pinned_papermod_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            repository_root = Path(directory).resolve()
            calls = []

            def fake_run(args, cwd=None):
                calls.append((tuple(args), cwd))
                if args[:2] == ["rev-parse", "HEAD"]:
                    return PAPERMOD_COMMIT
                if args[:2] == ["status", "--porcelain"]:
                    return ""
                return ""

            theme_path = bootstrap_theme(repository_root, run=fake_run)

            self.assertEqual(theme_path, repository_root / "themes/PaperMod")
            self.assertIn(
                (("clone", "--no-checkout", PAPERMOD_REPOSITORY, str(theme_path)), repository_root),
                calls,
            )
            self.assertIn(
                (("fetch", "--depth", "1", "origin", PAPERMOD_COMMIT), theme_path),
                calls,
            )
            self.assertIn((("checkout", "--detach", PAPERMOD_COMMIT), theme_path), calls)

    def test_bootstrap_refuses_to_overwrite_existing_non_git_theme_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            repository_root = Path(directory)
            theme_path = repository_root / "themes/PaperMod"
            theme_path.mkdir(parents=True)
            (theme_path / "README.md").write_text("local files\n", encoding="utf-8")

            with self.assertRaisesRegex(RuntimeError, "not a git checkout"):
                bootstrap_theme(repository_root, run=lambda args, cwd=None: "")

    def test_readme_and_github_workflow_use_shared_bootstrap_script(self):
        repository_root = Path(__file__).resolve().parents[1]
        command = "python3 scripts/bootstrap_theme.py"

        self.assertIn(command, (repository_root / "README.md").read_text(encoding="utf-8"))
        self.assertIn(
            command,
            (repository_root / ".github/workflows/hugo.yml").read_text(encoding="utf-8"),
        )


if __name__ == "__main__":
    unittest.main()
