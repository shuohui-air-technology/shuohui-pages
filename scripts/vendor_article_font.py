"""Snapshot the approved provider's CSS; do not copy or alter proprietary app fonts."""
import argparse
import hashlib
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PROVIDER = 'https://fontsapi.zeoseven.com/293/main/'


def vendor(source: Path, license_path: Path) -> None:
    raw = source.read_bytes()
    css = raw.decode('utf-8')
    if 'LXGW WenKai Mono:Version 1.522' not in css:
        raise ValueError('expected LXGW WenKai Mono 1.522')
    urls = re.findall(r'url\("(\./[a-f0-9]{16}\.woff2)"\)', css)
    if not urls or len(urls) != css.count('url('):
        raise ValueError('unexpected font URL; review upstream before updating')
    if css.count('font-display:swap') != css.count('@font-face'):
        raise ValueError('every subset must allow immediate fallback text')
    css = css.replace('url("./', 'url("' + PROVIDER)
    dest = ROOT / 'assets/css/fonts/lxgw-wenkai-mono-1.522.css'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(css, encoding='utf-8')
    notice = ROOT / 'static/fonts/lxgw-wenkai-mono/OFL.txt'
    notice.parent.mkdir(parents=True, exist_ok=True)
    notice.write_bytes(license_path.read_bytes())
    print({'version': '1.522', 'subsets': len(urls), 'sourceSha256': hashlib.sha256(raw).hexdigest()})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('css', type=Path)
    parser.add_argument('license', type=Path)
    args = parser.parse_args()
    vendor(args.css, args.license)
