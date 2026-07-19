#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Gearspot Easy Release ==="
echo

if [[ -z "${EAS_TOKEN:-}" ]]; then
  echo "ERROR: EAS_TOKEN puuttuu."
  echo "Aja: EAS_TOKEN=your_token npm run release:easy"
  exit 1
fi

if [[ ! -x "node_modules/.bin/eslint" || ! -x "node_modules/.bin/jest" ]]; then
  echo "0) Riippuvuudet puuttuvat, ajetaan npm ci..."
  npm ci
fi

echo "1) Ajetaan release-gate..."
npm run release:gate

echo
echo "2) Gate meni lapi. Seuraavat askeleet:"

if git remote get-url origin >/dev/null 2>&1; then
  echo "- Git remote origin loytyi: $(git remote get-url origin)"
else
  echo "- Git remote origin PUUTTUU. Lisaa se ensin:"
  echo "  git remote add origin <your-github-repo-url>"
fi

echo "- Varmista GitHub Secretit tiedoston docs/GITHUB_SECRETS_CHECKLIST.md mukaan."
echo "- Aja GitHubissa workflow: .github/workflows/release.yml (workflow_dispatch)."
echo "- Vaihtoehto tagilla: git tag v0.1.0 && git push origin v0.1.0"

echo
echo "Lisatuki: katso docs/RELEASE_ONE_PAGE.md"
