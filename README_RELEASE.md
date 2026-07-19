# README_RELEASE

Quick guide for running Gearspot release flow.

## 1) Local pre-check

Run this in the project root:

```bash
EAS_TOKEN=your_real_eas_token npm run release:easy
```

What this does:
- installs dependencies if needed
- runs release gate checks
- runs lint, unit tests, and e2e tests
- prints next steps

## 2) Push latest code

```bash
git checkout main
git pull
```

If you are releasing from a feature branch, make sure it is pushed:

```bash
git push -u origin <your-branch>
```

## 3) Required GitHub secret

Minimum required secret for current workflow:
- EAS_TOKEN

Path in GitHub:
- Repository -> Settings -> Secrets and variables -> Actions -> New repository secret

## 4) Run release workflow in GitHub

Path:
- Repository -> Actions -> Release

Then:
1. Click Run workflow
2. Select branch (main or your target branch)
3. Click Run workflow

## 5) Success criteria

Release is considered successful when:
- Release workflow status is green (Success)
- No failed jobs inside the run

## 6) If workflow fails

1. Open the failed run
2. Open the failed job (usually release)
3. Copy last 30 lines from the failing step log
4. Fix and re-run workflow

## 7) Optional tagging release

```bash
git tag v0.1.1
git push origin v0.1.1
```

This will also trigger Release workflow because tags v* are enabled.
