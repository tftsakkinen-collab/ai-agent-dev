# Release checklist — Gearspot

1. Confirm all product data is verified (models, prices, capacities).
2. Verify insurance and legal texts for rentals are present.
3. Test booking flow end-to-end (mobile + web).
4. Create production API endpoints and migrate from mock server.
5. Configure builds for Android and iOS (signing keys, store metadata).
6. Configure web deploy (Vercel/Netlify or static hosting).
7. Run full test suite and performance smoke tests.
8. Run deploy smoke checks (npm run smoke:deploy) against the target URL.
9. Verify API error responses include x-request-id for traceability.
10. Release communications and monitoring (Sentry, logs).
