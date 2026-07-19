# Gearspot — Expo + React Native + Web scaffold

This workspace contains a minimal scaffold for Gearspot: an Expo app that runs on Android, iOS and Web, plus a simple mock API server.

Quick start

1. Install dependencies (have Node.js and npm installed):

```bash
npm install
```

2. Start mock API server (port 3000):

```bash
npm run server
```

3. In a new terminal, start the Expo dev server (Metro):

```bash
npm start
# or open web UI
npm run web
```

4. Open the Expo app (Android/iOS emulator or Expo Go) and navigate to the `Home` screen.

Authentication
- Use the `Auth` screen and enter any email. The mock server returns a `mock-token` which is stored in `AsyncStorage` and used for protected endpoints (bookings).

Testing
- Unit tests (Jest):

```bash
npm test
```

- Playwright E2E (requires Playwright installed):

1) Start the mock API server (`npm run server`).
2) Run Playwright tests:

```bash
npx playwright test
```

CI / Release notes
- `.github/workflows/ci.yml` runs lint + unit tests + Playwright checks. It contains placeholders for web builds.
- For production mobile builds, configure Expo Application Services (EAS) and add required secrets (keystore, Apple certs, EAS credentials) to GitHub Secrets. See `docs/CI_RELEASE_TEMPLATE.md` for exact variables and steps.

Local development checklist
- Ensure `server/index.js` is running.
- Start Expo with `npm start` and open the app on the desired platform.
- Use `Auth` to store the mock token, then create a booking via `ProductDetail` → `Varaa`.

Next steps
- Add real backend endpoints and integrate payment/booking confirmations.
- Replace mock-token flow with a real OAuth/JWT flow and secure storage for production.

Vercel preview
- Deployment-ready Vercel config lives in `vercel.json`.
- Setup guide: `docs/VERCEL_SETUP.md`.
- For stable preview data in serverless mode, attach Vercel KV to the project.

Automated release helper
- There's a helper script `prepare_release.sh` that runs unit tests, Playwright checks, builds web assets and triggers EAS builds when `EAS_TOKEN` is set. Example:

```bash
API_BASE_URL=http://localhost:3000 EAS_TOKEN=your_token VERCEL_TOKEN=your_vercel_token ./prepare_release.sh
```

Note: The script is a convenience wrapper — production CI should run builds in isolated runners with secrets stored in GitHub Secrets.

