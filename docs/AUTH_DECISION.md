# Auth Decision (2026-07-19)

## Decision
- Target provider: Supabase Auth (email magic link) for production.
- Current default in code: local_code (6-digit OTP) for development and test stability.

## Why This Decision
- Fast production path: Supabase ships hosted email magic link without custom SMTP work.
- Good fit for current stack: simple REST-friendly integration, no vendor lock at app layer.
- Minimal migration cost: current endpoints can keep the same client contract while provider changes behind the API.

## Provider Strategy
- AUTH_PROVIDER=local_code
  - Uses in-app request-code and verify-code flow.
  - Suitable for local development and automated tests.
- AUTH_PROVIDER=supabase
  - Intended production path.
  - Requires SUPABASE_URL and SUPABASE_ANON_KEY.
  - Adapter is scaffolded, but magic-link send handler is not wired yet.

## Security Notes
- Keep AUTH_SECRET set and rotated per environment.
- Disable AUTH_EXPOSE_CODE in production.
- Add ADMIN_API_KEY in production for admin endpoints.

## Rollout Plan
1. Keep local_code as default in non-prod to preserve CI reliability.
2. Implement Supabase magic-link send and verify in adapter.
3. Enable AUTH_PROVIDER=supabase in staging.
4. Run smoke checks and manual sign-in test in staging.
5. Flip production environment after successful staging verification.

## Acceptance Criteria
- Two unique users can sign in via magic link and get isolated bookings.
- request-code dev fallback remains available in local development only.
- Audit logs contain requestId and provider outcome for auth events.
