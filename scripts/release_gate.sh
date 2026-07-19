#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running release gate checks..."

missing=()
required_files=(
  "docs/RELEASE_CHECKLIST.md"
  "docs/GITHUB_SECRETS_CHECKLIST.md"
  "docs/PRODUCT_DATA_VERIFICATION_TEMPLATE.md"
  ".github/workflows/release.yml"
)

for file in "${required_files[@]}"; do
  [[ ! -f "$file" ]] && missing+=("$file")
done

if (( ${#missing[@]} > 0 )); then
  echo "ERROR: Missing required release files: ${missing[*]}"
  exit 1
fi

echo "- File checks passed"

if ! grep -q "Ready for release: YES" docs/PRODUCT_DATA_VERIFICATION_TEMPLATE.md; then
  echo "ERROR: Product verification is not signed off yet (expected 'Ready for release: YES')."
  exit 1
fi

if grep -Eq "\|[[:space:]]*(BLOCKED|PENDING)[[:space:]]*\|" docs/PRODUCT_DATA_VERIFICATION_TEMPLATE.md; then
  echo "ERROR: Product verification still has BLOCKED/PENDING items."
  exit 1
fi

echo "- Product data verification passed"

if [[ -z "${EAS_TOKEN:-}" ]]; then
  echo "ERROR: EAS_TOKEN is required for release gate"
  exit 1
fi

echo "- Secret precheck passed"

npm run lint
npm test -- --runInBand
npm run test:e2e

echo "Release gate passed"
