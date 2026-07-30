"""Fail safely when publishable repository files contain likely credentials."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIPPED_PARTS = {
    ".git",
    ".next",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    ".vinext",
    ".wrangler",
    "build",
    "dist",
    "node_modules",
}
TEXT_SUFFIXES = {
    "",
    ".css",
    ".env",
    ".example",
    ".html",
    ".ini",
    ".ipynb",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mjs",
    ".py",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}
SECRET_PATTERNS = {
    "Google API key": re.compile(r"\bAIza[0-9A-Za-z_-]{30,}\b"),
    "GitHub token": re.compile(
        r"\b(?:gh[opurs]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,})\b"
    ),
    "Hugging Face token": re.compile(r"\bhf_[0-9A-Za-z]{30,}\b"),
    "OpenAI-style key": re.compile(r"\bsk-[0-9A-Za-z_-]{20,}\b"),
    "private key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "bearer credential": re.compile(
        r"(?i)\bauthorization\s*[:=]\s*[\"']?bearer\s+[0-9A-Za-z._~-]{20,}"
    ),
}


def is_publishable(path: Path) -> bool:
    """Exclude generated/private paths while retaining `.env.example`."""

    if any(part in SKIPPED_PARTS for part in path.parts):
        return False
    if path.name == ".env":
        return False
    return not (
        path.name.startswith(".env.") and path.name != ".env.example"
    )


def repository_files() -> list[Path]:
    """Return publishable files in a Git checkout or clean source export."""

    try:
        result = subprocess.run(
            [
                "git",
                "ls-files",
                "--cached",
                "--others",
                "--exclude-standard",
                "-z",
            ],
            cwd=ROOT,
            check=False,
            capture_output=True,
        )
    except OSError:
        result = None

    if result is not None and result.returncode == 0:
        relative_paths = result.stdout.decode(
            "utf-8", errors="surrogateescape"
        ).split("\0")
        return [
            ROOT / relative
            for relative in relative_paths
            if relative and is_publishable(Path(relative))
        ]

    return [
        path
        for path in ROOT.rglob("*")
        if path.is_file() and is_publishable(path.relative_to(ROOT))
    ]


def scan_file(path: Path) -> set[str]:
    """Return secret categories found in a likely-text file without values."""

    if path.suffix.lower() not in TEXT_SUFFIXES or not path.is_file():
        return set()
    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return set()
    return {
        label for label, pattern in SECRET_PATTERNS.items() if pattern.search(content)
    }


def main() -> int:
    """Print file paths and categories only, never candidate secret values."""

    findings = [
        (path.relative_to(ROOT), sorted(scan_file(path)))
        for path in repository_files()
    ]
    findings = [(path, labels) for path, labels in findings if labels]

    if findings:
        print("Potential credentials found:")
        for path, labels in findings:
            print(f"- {path}: {', '.join(labels)}")
        print("Remove the value and rotate it if it was ever shared or committed.")
        return 1

    print("No likely credential values found in publishable repository files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
