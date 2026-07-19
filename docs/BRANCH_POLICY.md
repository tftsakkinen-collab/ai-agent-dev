# Branch Policy (Phase 0)

Policy status: LOCKED

## Purpose
- Keep one stable production path for Oulu SUP pilot releases.
- Prevent accidental deploys from unfinished branches.

## Allowed Branches
- main: production-ready code only.
- feature/complete-release: release candidate mirror of main.

## Deployment Rules
- Vercel production deploy source branch: main.
- feature/complete-release is allowed for preview and emergency mirror only.
- Any hotfix must be merged to main first, then fast-forwarded to feature/complete-release.

## Required Gates Before Merge to main
- npm run lint
- npm run build:web
- npm run test:e2e
- npm run smoke:deploy

## Operational Checklist Lock
- Every release must follow docs/RELEASE_CHECKLIST.md.
- If this policy changes, update this file and remove LOCKED status until reviewed.
