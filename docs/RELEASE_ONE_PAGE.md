# Release One Page

Tee julkaisu minimaalisilla vaiheilla.

## 1) Aja paikallinen gate

```bash
EAS_TOKEN=your_token_here npm run release:easy
```

Tama ajaa kaikki portit (lint, unit, e2e, release-gate) ja kertoo seuraavat askeleet.

## 2) Varmista GitHub-valmistelut

- Luo GitHub repository, jos sita ei ole.
- Lisaa remote:

```bash
git remote add origin <your-github-repo-url>
```

- Pushaa branch:

```bash
git push -u origin feature/complete-release
```

## 3) Lisaa GitHub Secretit

Noudata tiedostoa `docs/GITHUB_SECRETS_CHECKLIST.md`.

Pakolliset:
- `EAS_TOKEN`
- `ANDROID_KEYSTORE_JSON`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `APPLE_CREDENTIALS`

## 4) Kaynnista release

Vaihtoehto A (suositus): GitHub UI -> Actions -> Release -> Run workflow.

Vaihtoehto B (tagilla):

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 5) Hyvaksy release

Release on onnistunut, kun:
- `.github/workflows/release.yml` job on vihrea.
- EAS buildit ovat kaynnistyneet onnistuneesti.
