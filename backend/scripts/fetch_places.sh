#!/usr/bin/env bash
set -e

API_URL="https://cloud.gmapsextractor.com/api/v2/search"

if [ -z "$FETCH_KEY" ]; then
  echo " FETCH_KEY not set"
  echo "Run: export FETCH_KEY=your_api_token"
  exit 1
fi

LL='@36.1716,-115.1381,14z'   # Vegas (note the negative longitude)
HL="en"
GL="us"
PAGE=1
EXTRA=true

fetch() {
  local q="$1"
  local out="$2"

  echo "Fetching: $q -> $out"

  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FETCH_KEY" \
    -d "{
      \"q\": \"$q\",
      \"page\": $PAGE,
      \"ll\": \"$LL\",
      \"hl\": \"$HL\",
      \"gl\": \"$GL\",
      \"extra\": $EXTRA
    }" \
    > "$out"
}

fetch "liquor" "out_liquor.json"
fetch "smoke shop"   "out_smoke.json"
fetch "night club"   "out_club.json"

echo "Done."
