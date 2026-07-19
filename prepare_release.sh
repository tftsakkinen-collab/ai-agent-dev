#!/usr/bin/env bash
set -euo pipefail

# prepare_release.sh — helper to run local validation and production builds (template)
# Usage: API_BASE_URL=http://localhost:3000 EAS_TOKEN=... VERCEL_TOKEN=... ./prepare_release.sh

echo "1) Install dependencies"
npm ci

echo "2) Start mock API in background"
node server/index.js &
API_PID=$!
echo "Mock API PID=$API_PID"

echo "3) Wait for API to become available"
for i in {1..10}; do
  if curl -sSf http://localhost:3000/api/products > /dev/null; then
    echo "API ready"
    break
  fi
  sleep 1
done

echo "4) Run unit tests"
npm test || (echo "Unit tests failed"; kill $API_PID; exit 1)

echo "5) Run Playwright E2E checks"
npx playwright test || echo "Playwright tests failed or skipped"

echo "6) Build web (expo)"
# Use export commands in CI/release flows; `expo start --web` is a long-running dev server.
npx expo export --platform web --clear || npx expo export:web || echo "Expo web build skipped"

if [ -n "${EAS_TOKEN-}" ]; then
  echo "7) Trigger EAS Android build"
  npx eas-cli build --platform android --non-interactive --profile production || echo "EAS Android build failed"
  echo "8) Trigger EAS iOS build"
  npx eas-cli build --platform ios --non-interactive --profile production || echo "EAS iOS build failed"
else
  echo "EAS_TOKEN not set — skipping EAS builds"
fi

echo "Cleaning up"
kill $API_PID || true

echo "Done. Check outputs and build logs."
