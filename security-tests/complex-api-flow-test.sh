#!/bin/bash

# --- Configuration ---
API_VYROBCA="http://localhost:3001"
API_LEKARENA="http://localhost:3002"
EMAIL_VYROBCA="vyrobca@pharma.sk"
EMAIL_LEKARENA="lekaren@pharma.sk"
PASSWORD="heslo123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}PHARMA-BLOCKCHAIN: COMPLEX API LIFECYCLE TEST${NC}"
echo -e "${BLUE}================================================================${NC}"

# Helper function for API calls
# Args: 1:Method, 2:URL, 3:Token, 4:Data, 5:ExpectedStatus, 6:Description
call_api() {
    local method=$1
    local url=$2
    local token=$3
    local data=$4
    local expected_status=$5
    local desc=$6

    echo -e "\n${BLUE}ACTION: $desc${NC}"
    echo -e "COMMAND: curl -X $method $url"
    
    local response
    local status
    
    if [ -z "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$data")
    fi

    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo -e "EXPECTED STATUS: $expected_status"
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "ACTUAL STATUS: ${GREEN}$status${NC}"
    else
        echo -e "ACTUAL STATUS: ${RED}$status (FAILED)${NC}"
    fi

    echo "RESPONSE BODY:"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    
    # Export global variables for next steps if needed
    LAST_BODY=$body
    LAST_STATUS=$status
}

# 1. Login Vyrobca
call_api "POST" "$API_VYROBCA/auth/login" "" "{\"email\":\"$EMAIL_VYROBCA\", \"password\":\"$PASSWORD\"}" 201 "Login as Manufacturer"
TOKEN_VYROBCA=$(echo $LAST_BODY | jq -r '.access_token')

# 2. Login Lekarena
call_api "POST" "$API_LEKARENA/auth/login" "" "{\"email\":\"$EMAIL_LEKARENA\", \"password\":\"$PASSWORD\"}" 201 "Login as Pharmacy"
TOKEN_LEKARENA=$(echo $LAST_BODY | jq -r '.access_token')

# 3. Create Batch (Manufacturer)
BATCH_ID="BATCH-$(date +%s)"
call_api "POST" "$API_VYROBCA/drugs" "$TOKEN_VYROBCA" "{
    \"id\": \"$BATCH_ID\",
    \"drugID\": \"D1\",
    \"name\": \"Paracetamol\",
    \"manufacturer\": \"VyrobcaMSP\",
    \"expiryDate\": \"2027-01-01T00:00:00.000Z\",
    \"quantity\": 100,
    \"unit\": \"ks\",
    \"price\": 10.0
}" 201 "Create new Drug Batch"

# Wait for sync
echo -e "\nWaiting for ledger commitment (3s)..."
sleep 3

# 4. Request Drug (Pharmacy)
REQ_ID="REQ-$(date +%s)"
call_api "POST" "$API_LEKARENA/drugs/request" "$TOKEN_LEKARENA" "{
    \"requestID\": \"$REQ_ID\",
    \"drugID\": \"D1\",
    \"name\": \"Paracetamol\",
    \"manufacturerOrg\": \"VyrobcaMSP\",
    \"quantity\": 50,
    \"unit\": \"ks\"
}" 201 "Pharmacy requesting drugs"

# 5. Provide Price Offer (Manufacturer)
call_api "POST" "$API_VYROBCA/drugs/offer" "$TOKEN_VYROBCA" "{
    \"requestID\": \"$REQ_ID\",
    \"price\": 8.5,
    \"pharmacyOrg\": \"LekarenAMSP\"
}" 201 "Manufacturer providing price offer"

# Wait for sync
sleep 2

# 6. Approve Offer (Pharmacy)
# First we need to get the offer ID from the DB/API
call_api "GET" "$API_LEKARENA/drugs/offers/$REQ_ID" "$TOKEN_LEKARENA" "" 200 "Get offers for request"
OFFER_ID=$(echo $LAST_BODY | jq -r '.[0].id')

call_api "POST" "$API_LEKARENA/drugs/approve-offer" "$TOKEN_LEKARENA" "{
    \"requestID\": \"$REQ_ID\",
    \"offerID\": $OFFER_ID
}" 201 "Pharmacy approving price offer"

# 7. Fulfill Order (Manufacturer)
call_api "POST" "$API_VYROBCA/drugs/fulfill-order" "$TOKEN_VYROBCA" "{
    \"requestId\": \"$REQ_ID\",
    \"batches\": [
        { \"batchID\": \"$BATCH_ID\", \"quantity\": 50 }
    ]
}" 201 "Manufacturer fulfilling the order"

# Extract the new batch ID (it might have been split)
# We can check fulfillment list for the request
sleep 3
call_api "GET" "$API_VYROBCA/drugs/orders/$REQ_ID/fulfillments" "$TOKEN_VYROBCA" "" 200 "Get fulfillment batch IDs"
NEW_BATCH_ID=$(echo $LAST_BODY | jq -r '.[0].batchID')
echo -e "NEW BATCH ID (split): ${GREEN}$NEW_BATCH_ID${NC}"

# 8. Receive Batch (Pharmacy)
call_api "POST" "$API_LEKARENA/drugs/receive" "$TOKEN_LEKARENA" "{\"id\": \"$NEW_BATCH_ID\"}" 201 "Pharmacy receiving the batch"

# 9. Sell to Patient (Pharmacy)
call_api "POST" "$API_LEKARENA/drugs/sell" "$TOKEN_LEKARENA" "{
    \"id\": \"$NEW_BATCH_ID\",
    \"quantity\": 10
}" 201 "Pharmacy selling 10 units to patient"

# 10. Check History (Pharmacy)
call_api "GET" "$API_LEKARENA/drugs/$NEW_BATCH_ID/history" "$TOKEN_LEKARENA" "" 200 "Checking audit history (Recursive Trace)"

# 11. Read Public State (Verification)
call_api "GET" "$API_LEKARENA/drugs/$NEW_BATCH_ID" "$TOKEN_LEKARENA" "" 200 "Read final batch state"
FINAL_QTY=$(echo $LAST_BODY | jq -r '.quantity')
echo -e "FINAL QUANTITY: ${GREEN}$FINAL_QTY${NC} (Expected: 40)"

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}COMPLEX TEST COMPLETED${NC}"
echo -e "${BLUE}================================================================${NC}"
