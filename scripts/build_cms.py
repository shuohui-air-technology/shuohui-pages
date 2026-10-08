"""Build a pinned, minimally patched Sveltia; never modify the upstream checkout.

pnpm's frozen upstream lockfile controls dependencies. Files are staged in a
temporary directory and verified before existing published assets are replaced.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def verify_sources(source: Path, manifest: dict) -> None:
    for name, expected in manifest['files'].items():
        path = source / name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'upstream checksum mismatch: {name}')


def run(args, cwd, env=None):
    subprocess.run(args, cwd=cwd, env=env, check=True)


def copy_dependencies(source: Path, destination: Path) -> None:
    # Svelte hashes component filenames relative to the build root. Linking
    # this whole directory to another checkout changes dependency CSS scope
    # hashes compared with a clean CI install. Preserve pnpm's internal
    # relative links, but keep their targets inside this staged checkout.
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, destination, symlinks=True)


def build(output: Path, source: Path | None = None, check: bool = False) -> None:
    manifest = json.loads((ROOT / 'vendor/sveltia/manifest.json').read_text())
    with tempfile.TemporaryDirectory(prefix='shuohui-cms-') as tmp:
        checkout = Path(tmp) / 'source'
        if source:
            # Reuse dependencies only; verify an unmodified source tree first.
            actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=source, text=True).strip()
            if actual != manifest['commit']:
                raise ValueError('upstream commit mismatch')
            run(['git', 'diff', '--exit-code', 'HEAD', '--'], source)
            verify_sources(source, manifest)
            shutil.copytree(source, checkout, ignore=shutil.ignore_patterns('node_modules', 'package', '.git'))
            if (source / 'node_modules').is_dir():
                copy_dependencies(source / 'node_modules', checkout / 'node_modules')
        else:
            run(['git', 'clone', '--depth', '1', '--branch', manifest['tag'], manifest['repository'], str(checkout)], ROOT)
            actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=checkout, text=True).strip()
            if actual != manifest['commit']:
                raise ValueError('upstream commit mismatch')
            verify_sources(checkout, manifest)
        run(['git', 'apply', str(ROOT / 'vendor/sveltia/lossless-markdown.patch')], checkout)
        node = ROOT / 'editor/node_modules/node/bin/node'
        pnpm = ROOT / 'editor/node_modules/pnpm/bin/pnpm.mjs'
        env = {**os.environ, 'PATH': os.pathsep.join([str(node.parent), str(checkout / 'node_modules/.bin'), os.environ.get('PATH', '')]), 'CI': 'true'}
        if not (checkout / 'node_modules').is_dir():
            run([str(node), str(pnpm), 'install', '--frozen-lockfile'], checkout, env)
        run([str(node), '--test', str(ROOT / 'editor/test/unit/cms-boundary.test.mjs')], ROOT, {**env, 'CMS_SOURCE_ROOT': str(checkout)})
        # The pinned package build command is `vite build`. Calling it directly
        # avoids pnpm 12's pre-run dependency reinstall of a reused node_modules.
        run([str(node), str(checkout / 'node_modules/vite/bin/vite.js'), 'build'], checkout, env)
        generated = checkout / 'package/dist'
        assets = {'sveltia-cms.js': (generated / 'sveltia-cms.js').read_bytes()}
        for path in (generated / 'chunks').rglob('*.js'):
            assets[str(path.relative_to(generated))] = path.read_bytes()
        assets['LICENSE'] = (ROOT / 'vendor/sveltia/LICENSE').read_bytes()
        # Locale/chunk resolution derives the package base from script.src.
        for path in (checkout / 'package/locales').glob('*.json'):
            assets[f'locales/{path.name}'] = path.read_bytes()
        hashes = {name: hashlib.sha256(value).hexdigest() for name, value in sorted(assets.items())}
        assets['build-manifest.json'] = (json.dumps({'commit': manifest['commit'], 'files': hashes}, indent=2) + '\n').encode()
        for name, content in assets.items():
            target = output.parent / name
            if check:
                if not target.is_file() or target.read_bytes() != content:
                    raise ValueError(f'CMS generated asset drift: {name}')
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'static/admin/vendor/sveltia-cms.js')
    parser.add_argument('--source', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    build(args.output.resolve(), args.source.resolve() if args.source else None, args.check)
