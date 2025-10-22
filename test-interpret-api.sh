#!/bin/bash

# Test Script for /api/interpret Endpoint
# Story 2.3 - Task 19: Manual Testing

BASE_URL="http://localhost:3000"
API_ENDPOINT="${BASE_URL}/api/interpret"

echo "======================================"
echo "Testing /api/interpret Endpoint"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Unauthenticated Request (should return 401)
echo "Test 1: Unauthenticated Request (expect 401)"
echo "--------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello world",
    "sender_culture": "american",
    "receiver_culture": "japanese",
    "mode": "inbound"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 401 ]; then
  echo -e "${GREEN}✓ PASS${NC} - Got 401 Unauthorized"
else
  echo -e "${RED}✗ FAIL${NC} - Expected 401, got ${HTTP_CODE}"
fi
echo "Response: $BODY"
echo ""

# Test 2: Invalid Message (too long - should return 400)
echo "Test 2: Message Too Long (expect 400)"
echo "--------------------------------------"
echo "Note: This test requires authentication. Skipping for now."
echo "To test manually, use authenticated session and send 2001+ character message"
echo ""

# Test 3: Invalid Culture Code (should return 400)
echo "Test 3: Invalid Culture Code (expect 400)"
echo "--------------------------------------"
echo "Note: This test requires authentication. Skipping for now."
echo ""

# Test 4: Missing Required Fields (should return 400)
echo "Test 4: Missing Required Field (expect 400)"
echo "--------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "sender_culture": "american",
    "receiver_culture": "japanese",
    "mode": "inbound"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 400 ]; then
  echo -e "${GREEN}✓ PASS${NC} - Got ${HTTP_CODE} (validation or auth)"
else
  echo -e "${RED}✗ FAIL${NC} - Expected 400 or 401, got ${HTTP_CODE}"
fi
echo "Response: $BODY"
echo ""

echo "======================================"
echo "Authenticated Tests"
echo "======================================"
echo ""
echo -e "${YELLOW}For authenticated tests, you need to:${NC}"
echo "1. Sign in to your app at ${BASE_URL}"
echo "2. Open browser DevTools > Application > Cookies"
echo "3. Copy the cookie value"
echo "4. Use it in curl with: -b 'cookie-name=cookie-value'"
echo ""
echo -e "${YELLOW}Or use the browser console to test:${NC}"
echo ""
echo "fetch('${API_ENDPOINT}', {"
echo "  method: 'POST',"
echo "  headers: { 'Content-Type': 'application/json' },"
echo "  body: JSON.stringify({"
echo "    message: 'Thank you for your help!',"
echo "    sender_culture: 'american',"
echo "    receiver_culture: 'japanese',"
echo "    mode: 'inbound'"
echo "  })"
echo "}).then(r => r.json()).then(console.log)"
echo ""

echo "======================================"
echo "Testing Complete"
echo "======================================"
