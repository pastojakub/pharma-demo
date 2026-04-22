#!/bin/bash

# Configuration
API_URL="http://localhost:3001"
EMAIL="vyrobca@pharma.sk"
PASSWORD="heslo123"

echo "----------------------------------------------------------------"
echo "DEMO 2: AUTHENTICATION GUARDS & ACCESS CONTROL"
echo "----------------------------------------------------------------"

# 0. Prep: Get a real ID for testing
echo "0. Fetching a real Batch ID for realistic testing..."
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}")
TOKEN=$(echo $LOGIN_RES | jq -r '.access_token')
REAL_ID=$(curl -s -X GET "$API_URL/drugs/all" -H "Authorization: Bearer $TOKEN" | jq -r '.[0].batchID')

if [ "$REAL_ID" == "null" ] || [ -z "$REAL_ID" ]; then
    REAL_ID="B-REQUIRED-ID"
    echo "   [INFO] No batches found, using fallback: $REAL_ID"
else
    echo "   > Found real Batch ID: $REAL_ID"
fi

# 1. No Token
echo -e "\n1. Attempting to access data WITHOUT a token..."
RES1=$(curl -s -X GET "$API_URL/drugs/$REAL_ID/history")

echo "   > Server Response: $RES1"
echo "   [INFO] Status should be 401 Unauthorized (No auth token)."

# 2. Invalid Token
echo -e "\n2. Attempting to access data with an INVALID token..."
RES2=$(curl -s -X GET "$API_URL/drugs/$REAL_ID/history" \
     -H "Authorization: Bearer definitely-not-a-valid-jwt")

echo "   > Server Response: $RES2"
echo "   [INFO] Status should be 401 Unauthorized (jwt malformed)."

# 3. Expired Token (Authentic Demonstration)
echo -e "\n3. Attempting to access data with EXPIRED credentials..."

# Generate a real token signed with the secret but in the past
if ! command -v node &> /dev/null; then
    EXPIRED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjF9.expired"
else
    EXPIRED_TOKEN=$(node ../backend/generate-expired-token.js)
fi

RES3=$(curl -s -X GET "$API_URL/drugs/$REAL_ID/history" \
     -H "Authorization: Bearer $EXPIRED_TOKEN")

echo "   > Server Response: $RES3"
echo "   [INFO] Status should be 401 Unauthorized (jwt expired)."

echo -e "\n----------------------------------------------------------------"
echo "DEMO 2 COMPLETE"
echo "----------------------------------------------------------------"

