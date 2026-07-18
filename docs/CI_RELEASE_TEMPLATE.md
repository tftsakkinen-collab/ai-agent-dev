# CI / Release template

This file documents the secrets and steps needed to enable production builds (Android/iOS) using EAS and to deploy the web app.

Required GitHub Secrets (example names):
- `EAS_TOKEN` — Expo EAS access token for building in CI.
- `ANDROID_KEYSTORE_JSON` — Base64-encoded Android keystore or use EAS secrets management.
- `ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `ANDROID_KEY_ALIAS` — keystore alias.
- `ANDROID_KEY_PASSWORD` — key password.
- `APPLE_CREDENTIALS` — Apple signing credentials (use EAS managed workflow recommended).
- `VERCEL_TOKEN` — (optional) token for Vercel deploys for web.

Suggested CI steps (high level):
1. Checkout code and install Node.js.
2. Install deps: `npm ci`.
3. Run lint and unit tests.
4. Start mock server if running E2E tests against it.
5. For Android/iOS: run `eas build --platform android --non-interactive` and `eas build --platform ios --non-interactive` (requires `EAS_TOKEN` and configured credentials).
6. For web: build with Expo web (`npm run web` or `expo build:web`) and deploy to Vercel/Netlify using secrets.

Notes:
- EAS builds require configuration in `eas.json` (not included). Use `eas build` docs to generate `eas.json` and follow credential workflow.
- Do not store private signing keys in the repository. Use GitHub Secrets or EAS secret storage.
