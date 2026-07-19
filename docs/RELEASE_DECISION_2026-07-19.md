# Release Decision - 2026-07-19

Decision: NO-GO for production, GO for internal beta/demo.

## Gate run summary

Command:

```bash
npm run release:gate
```

Result:
- File checks: PASS
- Product verification: FAIL
- Reason: `docs/PRODUCT_DATA_VERIFICATION_TEMPLATE.md` still contains `PENDING` / `BLOCKED` statuses.

## What is already ready

- CI quality gates are in place (lint + unit + e2e).
- Release workflow exists: `.github/workflows/release.yml`.
- Release gate script exists: `scripts/release_gate.sh`.
- Secrets checklist exists: `docs/GITHUB_SECRETS_CHECKLIST.md`.

## Final blockers to close (owner action required)

1. Product data verification sign-off
- Fill verified values and sources in `docs/PRODUCT_DATA_VERIFICATION_TEMPLATE.md`.
- Remove all `PENDING` / `BLOCKED` status values.
- Set final line to `Ready for release: YES`.

2. Secrets in GitHub Actions
- Add required secrets listed in `docs/GITHUB_SECRETS_CHECKLIST.md`.
- Minimum required: `EAS_TOKEN`, Android signing secrets, Apple credentials.

3. Run release workflow
- Trigger `.github/workflows/release.yml` manually (workflow_dispatch) or with `v*` tag.
- Confirm workflow is green end-to-end.

## Definition of done for production release

Production release is approved when all conditions below are true:
- `npm run release:gate` exits with code 0.
- `.github/workflows/release.yml` succeeds in GitHub Actions.
- Product data sheet is signed with `Ready for release: YES`.
