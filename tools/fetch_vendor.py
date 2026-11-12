# This file was generated with the assistance of an AI coding tool.
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Fetch the third-party libraries in vendor/vendor.json into vendor/ and write vendor/README.md.

Run from the repository root: ``python -I -X utf8 tools/fetch_vendor.py``. Each package is downloaded from the npm
registry at its pinned version, refused unless its tarball matches the pinned ``integrity`` (SHA-512), and only the
listed files are written, unchanged, to ``vendor/<package>/``. The README lists every file with its SHA-256.
``--check`` writes nothing and fails if a file in vendor/ differs from its tarball.
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import sys
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor"
REGISTRY = "https://registry.npmjs.org"
MAX_BYTES = 50 * 1024 * 1024


def tarball(name: str, version: str, integrity: str) -> bytes:
    url = f"{REGISTRY}/{name}/-/{name}-{version}.tgz"
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise SystemExit(f"{url} is larger than {MAX_BYTES} bytes")
    algorithm, _, expected = integrity.partition("-")
    if algorithm != "sha512" or base64.b64encode(hashlib.sha512(data).digest()).decode() != expected:
        raise SystemExit(f"{url} does not match its pinned integrity")
    return data


def members(data: bytes, wanted: dict[str, str]) -> dict[str, bytes]:
    found = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        for member in archive.getmembers():
            if member.name in wanted and member.isfile():
                found[wanted[member.name]] = archive.extractfile(member).read()
    missing = sorted(set(wanted.values()) - set(found))
    if missing:
        raise SystemExit(f"missing in tarball: {', '.join(missing)}")
    return found


def readme(rows: list[tuple[str, dict, str, str]]) -> str:
    lines = [
        "# Third-party libraries",
        "",
        "Each library is kept unchanged under its own licence, next to its licence file. The files are fetched from the",
        "npm registry at a pinned version and checked against the tarball's SHA-512 by `tools/fetch_vendor.py`, which",
        "also writes this file; do not edit the files by hand.",
        "",
        "elkjs is offered under EPL-2.0 OR GPL-3.0-or-later and is used here under GPL-3.0-or-later, which combines with",
        "this project's AGPL-3.0-or-later.",
        "",
        "| Package | Version | Licence | File | SHA-256 |",
        "|---|---|---|---|---|",
    ]
    for name, spec, path, sha in rows:
        link = f"[{name}]({spec['homepage']})"
        lines.append(f"| {link} | {spec['version']} | {spec['license']} | `{path}` | `{sha}` |")
    lines += ["", "Sources: `https://registry.npmjs.org/<package>/-/<package>-<version>.tgz`.", ""]
    return "\n".join(lines)


def main() -> None:
    check = "--check" in sys.argv[1:]
    specs = json.loads((VENDOR / "vendor.json").read_text(encoding="utf-8"))
    rows = []
    differ = []
    for name, spec in specs.items():
        files = members(tarball(name, spec["version"], spec["integrity"]), spec["files"])
        for target, content in sorted(files.items()):
            path = VENDOR / name / target
            rel = path.relative_to(ROOT).as_posix()
            if check:
                if not path.is_file() or path.read_bytes() != content:
                    differ.append(rel)
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content)
            rows.append((name, spec, rel, hashlib.sha256(content).hexdigest()))
    if check:
        if differ:
            raise SystemExit("differs from its tarball: " + ", ".join(differ))
        print(f"vendor/ matches {len(rows)} files")
        return
    (VENDOR / "README.md").write_bytes(readme(rows).encode("utf-8"))
    print(f"wrote {len(rows)} files and vendor/README.md")


if __name__ == "__main__":
    main()
