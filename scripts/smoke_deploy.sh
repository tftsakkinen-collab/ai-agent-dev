#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BASE_URL="${SMOKE_BASE_URL:-http://localhost:3000}"
START_LOCAL="${SMOKE_START_LOCAL:-false}"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill -9 "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ "$START_LOCAL" == "true" ]]; then
  lsof -ti :3000 | xargs -r kill -9 || true
  node server/index.js >/tmp/gearspot-smoke-server.log 2>&1 &
  SERVER_PID=$!

  for _ in {1..10}; do
    if curl -sf "$BASE_URL/api/products" >/dev/null; then
      break
    fi
    sleep 1
  done
fi

echo "Smoke checks against $BASE_URL"

PRODUCTS_JSON="$(curl -fsS "$BASE_URL/api/products")"
PRODUCTS_COUNT="$(printf '%s' "$PRODUCTS_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(Array.isArray(d)?d.length:0);")"
if [[ "$PRODUCTS_COUNT" -lt 1 ]]; then
  echo "ERROR: products endpoint returned no products"
  exit 1
fi

echo "- products ok ($PRODUCTS_COUNT)"

UNAUTH_HEADERS_FILE="$(mktemp)"
UNAUTH_BODY="$(curl -sS -D "$UNAUTH_HEADERS_FILE" "$BASE_URL/api/bookings")"
UNAUTH_STATUS="$(awk 'NR==1 {print $2}' "$UNAUTH_HEADERS_FILE")"
if [[ "$UNAUTH_STATUS" != "401" ]]; then
  echo "ERROR: expected 401 from /api/bookings without token, got $UNAUTH_STATUS"
  exit 1
fi
UNAUTH_REQUEST_ID="$(grep -i '^x-request-id:' "$UNAUTH_HEADERS_FILE" | awk '{print $2}' | tr -d '\r')"
if [[ -z "$UNAUTH_REQUEST_ID" ]]; then
  echo "ERROR: missing x-request-id header in unauthorized response"
  exit 1
fi
UNAUTH_ERROR="$(printf '%s' "$UNAUTH_BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.error || '');")"
UNAUTH_BODY_REQUEST_ID="$(printf '%s' "$UNAUTH_BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.requestId || '');")"
if [[ "$UNAUTH_ERROR" != "Unauthorized" || -z "$UNAUTH_BODY_REQUEST_ID" ]]; then
  echo "ERROR: unauthorized response payload missing expected fields"
  exit 1
fi

echo "- auth guard and requestId ok"

LOGIN_RES="$(curl -fsS -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"smoke@example.com"}')"
TOKEN="$(printf '%s' "$LOGIN_RES" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.token || '');")"
if [[ -z "$TOKEN" ]]; then
  echo "ERROR: login token missing"
  exit 1
fi

PRODUCT_ID="$(printf '%s' "$PRODUCTS_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((d[0] && d[0].id) || '');")"
BOOKING_RES="$(curl -fsS -X POST "$BASE_URL/api/bookings" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"productId\":\"$PRODUCT_ID\",\"name\":\"Smoke User\",\"paymentMethod\":\"visa\",\"cardLast4\":\"4242\"}")"
BOOKING_ID="$(printf '%s' "$BOOKING_RES" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.id || '');")"
if [[ -z "$BOOKING_ID" ]]; then
  echo "ERROR: booking creation failed"
  exit 1
fi

echo "- booking create ok ($BOOKING_ID)"

FEEDBACK_CREATE="$(curl -fsS -X POST "$BASE_URL/api/feedback-reports" -H 'Content-Type: application/json' -d '{"message":"smoke-check","routeName":"Smoke","context":"smoke"}')"
FEEDBACK_ID="$(printf '%s' "$FEEDBACK_CREATE" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.id || '');")"
if [[ -z "$FEEDBACK_ID" ]]; then
  echo "ERROR: feedback create failed"
  exit 1
fi

curl -fsS -X PATCH "$BASE_URL/api/feedback-reports/$FEEDBACK_ID" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' >/dev/null
curl -fsS "$BASE_URL/api/feedback-reports" >/dev/null

echo "- feedback flow ok"

echo "Smoke checks passed"
