# GearSpot Roadmap (Web-First)

## Current State (2026-07)
- Production web deployment is running on Vercel.
- Core mock flows exist: search, booking, mock payment/refund, issue reporting, feedback reports.
- API routes are served through serverless function routing.
- Key gap: real user separation (auth), trust and safety primitives, and robust booking lifecycle.

## Product Direction
- Start narrow with a SUP-first pilot and keep data model category-agnostic.
- Optimize for trust and reliability before feature breadth.
- Treat trust and safety as core product, not a later add-on.
- Pilot v1 scope lock: Oulu area + SUP boards only.
- Expansion to e-bikes and other categories starts only after Oulu SUP pilot success criteria are met.

## Priority Order
1. Production stability and QA baseline.
2. Lightweight real authentication.
3. Booking lifecycle and handoff state machine.
4. Deposit/damage handling with evidence workflow.
5. Double-blind two-sided reviews.
6. Pilot rollout and metrics-driven iteration.

## Phase 0: Production Hardening (1 week)
### Goals
- Ensure external testers can use one stable URL.
- Remove obvious operational risks.

### Deliverables
- Vercel production branch policy documented and locked.
- Smoke test checklist for each deploy:
  - Home page loads.
  - API endpoints return JSON.
  - Booking create/list works.
  - Feedback report create/list/update works.
- Logging baseline:
  - Capture API errors in Vercel logs.
  - Add simple request IDs for traceability.

### Exit Criteria
- 3 consecutive successful production deploys.
- No blocking runtime errors in smoke tests.

## Phase 1: Real Auth MVP (1-2 weeks)
### Goals
- Separate users reliably.
- Replace mock bearer token flow.

### Recommended Scope
- Email magic link authentication.
- Session-based or JWT-based identity with verified email.
- Migrate booking ownership and feedback ownership to real user IDs.

### Data Model Additions
- users: id, email, createdAt, verifiedAt.
- bookings: renterUserId, ownerUserId.
- feedbackReports: reporterUserId (nullable for anonymous report mode).

### Exit Criteria
- Two different users can sign in and only see their own bookings in profile.

## Phase 2: Booking State Machine + Handoff (1-2 weeks)
### Goals
- Stop extending bookings ad hoc.
- Move to explicit state transitions and guardrails.

### State Model (MVP)
- approved
- awaiting_handoff
- handed_off
- in_use
- awaiting_return
- returned
- completed
- disputed

### Handoff Fields
- handoffMethod: lockbox_code | in_person
- handoffCode (stored, masked, release-gated)
- handoffConfirmedByOwnerAt
- handoffConfirmedByRenterAt

### Rules
- Do not reveal lockbox code before valid payment + approved booking.
- Start rental window only after both sides confirm handoff.

### Exit Criteria
- All booking actions validated against state transitions.

## Phase 3: Deposit + Damage Evidence (1-2 weeks)
### Goals
- Introduce credible dispute handling.
- Prepare for payment hold model.

### MVP Scope
- depositAmount
- depositStatus: held | released | claimed
- Evidence photos before and after rental:
  - ownerBeforePhotos[]
  - renterAfterPhotos[]
  - timestamps + uploader

### Dispute Basics
- disputedReason
- disputedAt
- resolutionStatus
- resolutionNotes

### Exit Criteria
- Dispute can be opened and reviewed with linked image evidence.

## Phase 4: Two-Sided Double-Blind Reviews (1 week)
### Goals
- Prevent retaliatory review bias.

### MVP Rules
- Reviews allowed only after bookingStatus = completed.
- Renter and owner submit independently.
- Reviews become visible when:
  - both submitted, or
  - reveal deadline reached.

### Data Fields
- reviewWindowEndsAt
- ownerReviewSubmittedAt
- renterReviewSubmittedAt
- reviewVisibility: hidden | visible

### Exit Criteria
- Both sides can review without seeing the other review first.

## Phase 5: SUP Pilot Launch (2-4 weeks)
### Goals
- Validate demand, operations, and trust flow in one constrained market.

### Pilot Scope
- Oulu area only.
- SUP category only.
- Limited inventory and invited testers.

### Metrics
- Listing-to-booking conversion.
- Booking completion rate.
- Dispute rate.
- Average review score.
- Time-to-resolution for disputes.

### Exit Criteria
- Pilot reaches predefined safety and completion thresholds.

## Cross-Cutting Backlog
- Branding polish and final logo rollout in app chrome.
- Feedback report filters and export/copy tools for triage.
- Admin moderation tools (basic).
- Terms, liability notice, and safety checklist UX.

## Completed Tasks (2026-07-19 Batch 1)
- ✅ Supabase magic-link auth adapter and UI (Phase 1)
- ✅ Photo upload endpoint for host listings (Phase 1)
- ✅ Admin throughput metrics dashboard (Phase 5)
- ✅ Host listing edit and moderation reset workflow (Phase 1)
- ✅ Admin listing moderation filters (Phase 5)
- ✅ Feedback triage filters and export tools (Cross-cutting)
- ✅ Booking state machine spec documentation (Phase 2)
- ✅ Handoff confirmation UI and endpoints (Phase 2)
- ✅ Deposit evidence collection UI and endpoint (Phase 3)
- ✅ Double-blind review system (Phase 4)
- ✅ Terms and safety checklist screens (Cross-cutting)
- ✅ Branding polish and logo integration (Cross-cutting)

## Completed Tasks (2026-07-19 Batch 2)
- ✅ Dispute resolution UI with evidence upload (Phase 3)
- ✅ Admin listing moderation queue (Phase 1)
- ✅ Booking disputes API endpoints (Phase 3)
- ✅ Enhanced pilot metrics dashboard with KPI cards (Phase 5)
- ✅ Stripe deposit payment integration (Phase 3)

## Immediate Next 5 Tasks
1. Production auth provider flip and Supabase config validation.
2. Booking deposit hold enforcement and release workflow.
3. Pilot launch preparation: invite codes and access control.
4. Real-time notification system for booking events.
5. Data export and reporting tools for pilot metrics.