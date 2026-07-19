# Booking State Machine Spec (Oulu SUP Pilot)

Version: 2026-07-19

## States
- approved
- awaiting_handoff
- in_use
- awaiting_return
- returned
- completed
- disputed

## Allowed Transitions
- approved -> awaiting_handoff | disputed
- awaiting_handoff -> in_use | disputed
- in_use -> awaiting_return | disputed
- awaiting_return -> returned | disputed
- returned -> completed | disputed
- disputed -> completed
- completed -> (terminal)

## Guard Rules
- Booking creation requires:
  - authenticated user
  - termsAccepted = true
  - safetyChecklistAccepted = true
- Lockbox code visibility:
  - hidden before in_use
  - visible in in_use, awaiting_return, returned, completed
- Review submission:
  - only when bookingStage = completed
- Refund operation:
  - only for booking owner

## Operational Events
- handoff/setup: sets handoff method and moves approved -> awaiting_handoff
- handoff/confirm(owner|renter): once both confirmed, awaiting_handoff -> in_use
- return/request: in_use -> awaiting_return
- return/confirm: awaiting_return -> returned
- complete: returned|disputed -> completed
- dispute: opens dispute and moves to disputed (except completed)

## Safety and Compliance Metadata
- consentVersion: 2026-07-sup-oulu-v1
- termsAcceptedAt
- safetyChecklistAcceptedAt

## Visibility and Moderation Notes
- Owner-created SUP listings are hidden from public feed until moderationStatus = approved.
- Owner listing edits reset moderationStatus to pending.
