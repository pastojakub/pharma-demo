#!/bin/bash

# --- Configuration (Decentralized Setup Ports) ---
API_VYROBCA="http://localhost:3001"
API_LEKARENA="http://localhost:3002"
API_LEKARENB="http://localhost:3003"
API_SUKL="http://localhost:3004"

EMAIL_VYROBCA="vyrobca@pharma.sk"
EMAIL_LEKARENA="lekaren@pharma.sk"
EMAIL_LEKARENB="lekarenb@pharma.sk"
EMAIL_SUKL="sukl@pharma.sk"
PASSWORD="heslo123"

# Synchronization Delay (s) - allow ledger events to reach local DB
SYNC_DELAY=5

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}PHARMA-BLOCKCHAIN: SYSTEM-WIDE COMPLEX VALIDATION TEST (v4)${NC}"
echo -e "${BLUE}================================================================${NC}"

# Robust API Validation Function
# Args: 1:Method, 2:URL, 3:Token, 4:Data/File, 5:ExpStatus, 6:Desc, 7:CheckPath, 8:ExpVal
validate_api() {
    local method=$1
    local url=$2
    local token=$3
    local data_or_file=$4
    local exp_status=$5
    local desc=$6
    local check_path=$7
    local exp_val=$8

    echo -e "\n${BLUE}[TEST] $desc${NC}"
    echo -e "${MAGENTA}  Endpoint: $method $url${NC}"
    
    local response
    local status
    local body

    if [ "$method" == "POST_FILE" ]; then
        # Handle file upload via multipart/form-data
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Authorization: Bearer $token" \
            -F "file=@$data_or_file")
    else
        # Handle standard JSON requests
        if [ -z "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$data_or_file")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data_or_file")
        fi
    fi

    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    # Extraction decision
    echo -e "  HTTP Status: ${CYAN}$status${NC} (Expected: $exp_status)"
    
    # Show body clearly
    echo -ne "  Response Body: "
    if [ -z "$body" ]; then
        echo -e "${YELLOW}(empty)${NC}"
    else
        echo "$body" | jq . 2>/dev/null || echo "$body"
    fi

    # Inner status code check (NestJS specific)
    local inner_status=$(echo "$body" | jq -r '.statusCode' 2>/dev/null)
    if [ "$inner_status" != "null" ] && [ ! -z "$inner_status" ]; then
        echo -e "  Internal JSON Code: ${YELLOW}$inner_status${NC}"
    fi

    # Check for success
    local failed=0
    if [ "$status" -ne "$exp_status" ]; then
        echo -e "  Result: ${RED}FAIL (HTTP Status Mismatch)${NC}"
        failed=1
    fi

    # Optional Value Validation
    if [ ! -z "$check_path" ]; then
        local actual_val=$(echo "$body" | jq -r "$check_path" 2>/dev/null)
        if [ "$actual_val" == "$exp_val" ]; then
            echo -e "  Validation [${YELLOW}$check_path${NC}]: ${GREEN}MATCH${NC} ($actual_val)"
        else
            echo -e "  Validation [${YELLOW}$check_path${NC}]: ${RED}MISMATCH${NC} (Got: $actual_val, Expected: $exp_val)"
            failed=1
        fi
    fi

    if [ $failed -eq 0 ]; then
        echo -e "  Result: ${GREEN}PASS${NC}"
    fi
    
    LAST_BODY=$body
    LAST_STATUS=$status
}

# --- 1. AUTHENTICATION & ROLE VALIDATION ---
echo -e "\n${YELLOW}--- PHASE 1: Access Control & Authorization ---${NC}"

# Note: Using .user.org because 'org' is nested in successful login response
validate_api "POST" "$API_VYROBCA/auth/login" "" "{\"email\":\"$EMAIL_VYROBCA\", \"password\":\"$PASSWORD\"}" 201 "Login Vyrobca" ".user.org" "VyrobcaMSP"
TOKEN_VYROBCA=$(echo $LAST_BODY | jq -r '.access_token')

validate_api "POST" "$API_LEKARENA/auth/login" "" "{\"email\":\"$EMAIL_LEKARENA\", \"password\":\"$PASSWORD\"}" 201 "Login Lekarena A" ".user.org" "LekarenAMSP"
TOKEN_LEKARENA=$(echo $LAST_BODY | jq -r '.access_token')

validate_api "POST" "$API_LEKARENB/auth/login" "" "{\"email\":\"$EMAIL_LEKARENB\", \"password\":\"$PASSWORD\"}" 201 "Login Lekarena B" ".user.org" "LekarenBMSP"
TOKEN_LEKARENB=$(echo $LAST_BODY | jq -r '.access_token')

validate_api "POST" "$API_VYROBCA/drugs/sell" "$TOKEN_VYROBCA" "{\"id\":\"X\", \"quantity\":1}" 403 "RBAC Check: Manufacturer forbidden from Selling"

# --- 2. IPFS & DRUG CATALOG ---
echo -e "\n${YELLOW}--- PHASE 2: IPFS Protocol & Drug Catalog Integration ---${NC}"

echo "Creating leaflet file..."
echo "Medical leaflet content for ValidationDrug" > leaflet.pdf
validate_api "POST_FILE" "$API_VYROBCA/upload/file" "$TOKEN_VYROBCA" "leaflet.pdf" 201 "Upload Leaflet to IPFS"
LEAFLET_CID=$(echo $LAST_BODY | jq -r '.cid')
LEAFLET_URL=$(echo $LAST_BODY | jq -r '.url')
rm leaflet.pdf

if [ "$LEAFLET_CID" == "null" ] || [ -z "$LEAFLET_CID" ]; then
    echo -e "  ${RED}[CRITICAL] IPFS Upload failed to return CID. Using mock CID for next steps.${NC}"
    LEAFLET_CID="QmPlaceholder$(date +%s)"
fi

validate_api "POST" "$API_VYROBCA/drug-catalog" "$TOKEN_VYROBCA" "{
    \"name\": \"ValidationDrug-$(date +%s)\",
    \"composition\": \"Testing ingredients\",
    \"recommendedDosage\": \"1 unit daily\",
    \"intakeInfo\": \"Take with water\",
    \"files\": [
        { \"cid\": \"$LEAFLET_CID\", \"url\": \"$LEAFLET_URL\", \"name\": \"leaflet.pdf\", \"type\": \"application/pdf\", \"size\": 100, \"category\": \"LEAFLET\" }
    ]
}" 201 "Register Drug in Global Catalog"

# --- 3. BATCH REGISTRATION & DB SYNC ---
echo -e "\n${YELLOW}--- PHASE 3: Ledger Registration & Sync Logic ---${NC}"

BATCH_ID="VAL-$(date +%s)"
validate_api "POST" "$API_VYROBCA/drugs" "$TOKEN_VYROBCA" "{
    \"id\": \"$BATCH_ID\",
    \"drugID\": \"D-VAL\",
    \"name\": \"ValidationDrug\",
    \"manufacturer\": \"VyrobcaMSP\",
    \"expiryDate\": \"2028-12-12T00:00:00.000Z\",
    \"quantity\": 500,
    \"unit\": \"ks\",
    \"price\": 12.50
}" 201 "Registering Batch on Blockchain"

echo -e "Waiting $SYNC_DELAY s for Event-Driven Synchronization to Database..."
sleep $SYNC_DELAY

validate_api "GET" "$API_VYROBCA/drugs/$BATCH_ID" "$TOKEN_VYROBCA" "" 200 "Verify Data Synchronized to Local DB" ".quantity" "500"

# --- 4. OWNERSHIP TRANSFER & DATA ISOLATION ---
echo -e "\n${YELLOW}--- PHASE 4: Ownership Flow & Private Data Isolation ---${NC}"

REQ_ID="REQ-VAL-$(date +%s)"
validate_api "POST" "$API_LEKARENA/drugs/request" "$TOKEN_LEKARENA" "{
    \"requestID\": \"$REQ_ID\",
    \"drugID\": \"D-VAL\",
    \"name\": \"ValidationDrug\",
    \"manufacturerOrg\": \"VyrobcaMSP\",
    \"quantity\": 100,
    \"unit\": \"ks\"
}" 201 "Create Private Order Request"

sleep $SYNC_DELAY
validate_api "POST" "$API_VYROBCA/drugs/offer" "$TOKEN_VYROBCA" "{\"requestID\": \"$REQ_ID\", \"price\": 10.0, \"pharmacyOrg\": \"LekarenAMSP\"}" 201 "Submit Private Price Offer"
sleep $SYNC_DELAY

# Isolation Test: Competitor should not see private data
validate_api "GET" "$API_LEKARENB/drugs/orders/$REQ_ID/private" "$TOKEN_LEKARENB" "" 200 "Isolation Test: Lekaren B reading Lekaren A's order"
IS_DENIED=$(echo $LAST_BODY | jq -r '.error')
if [ "$IS_DENIED" == "Data not available" ] || [ "$IS_DENIED" == "Požiadavka neexistuje." ] || [ "$LAST_BODY" == "" ] || [ "$LAST_BODY" == "null" ]; then
    echo -e "  Isolation: ${GREEN}VERIFIED${NC} (Access Denied to competitor's data as expected)"
else
    echo -e "  Isolation: ${RED}FAILED${NC} (Competitor can see private data!)"
fi

# --- 5. FULFILLMENT & RECURSIVE HISTORY ---
echo -e "\n${YELLOW}--- PHASE 5: Fulfillment & History Audit Trail ---${NC}"

validate_api "GET" "$API_LEKARENA/drugs/offers/$REQ_ID" "$TOKEN_LEKARENA" "" 200 "Fetching Price Offers"
OFFER_ID=$(echo $LAST_BODY | jq -r '.[0].id')

if [ "$OFFER_ID" == "null" ]; then
    echo -e "  ${RED}[ERROR] No offers found to approve. Skipping phase 5 & 6.${NC}"
else
    validate_api "POST" "$API_LEKARENA/drugs/approve-offer" "$TOKEN_LEKARENA" "{\"requestID\":\"$REQ_ID\", \"offerID\":$OFFER_ID}" 201 "Pharmacy Approving Agreement"
    sleep $SYNC_DELAY

    validate_api "POST" "$API_VYROBCA/drugs/fulfill-order" "$TOKEN_VYROBCA" "{
        \"requestId\": \"$REQ_ID\",
        \"batches\": [ { \"batchID\": \"$BATCH_ID\", \"quantity\": 100 } ]
    }" 201 "Executing Fulfillment (Ledger Split)"
    sleep $SYNC_DELAY

    validate_api "GET" "$API_VYROBCA/drugs/orders/$REQ_ID/fulfillments" "$TOKEN_VYROBCA" "" 200 "Retrieving Split Batch ID"
    NEW_BATCH_ID=$(echo $LAST_BODY | jq -r '.[0].batchID')
    echo -e "New Split Batch: $NEW_BATCH_ID"

    validate_api "GET" "$API_LEKARENA/drugs/$NEW_BATCH_ID/history" "$TOKEN_LEKARENA" "" 200 "Recursive History Audit Check"
    HISTORY_LEN=$(echo $LAST_BODY | jq '. | length')
    if [ "$HISTORY_LEN" -gt 1 ]; then
        echo -e "  History Logic: ${GREEN}PASS${NC} (Recursive trace verified)"
    else
        echo -e "  History Logic: ${RED}FAIL${NC} (History disconnected from parent)"
    fi

    # --- 6. FINAL SALE & STATE CLEARING ---
    echo -e "\n${YELLOW}--- PHASE 6: Sale to Consumer & State Finalization ---${NC}"

    validate_api "POST" "$API_LEKARENA/drugs/receive" "$TOKEN_LEKARENA" "{\"id\": \"$NEW_BATCH_ID\"}" 201 "Pharmacy Confirming Receipt"
    sleep $SYNC_DELAY

    validate_api "POST" "$API_LEKARENA/drugs/sell" "$TOKEN_LEKARENA" "{\"id\": \"$NEW_BATCH_ID\", \"quantity\": 100}" 201 "Full Sale to Consumer"
    sleep $SYNC_DELAY

    validate_api "GET" "$API_LEKARENA/drugs/all" "$TOKEN_LEKARENA" "" 200 "Inventory Verification (Sale Cleanup)"
    IN_INV=$(echo $LAST_BODY | jq -r ".[] | select(.batchID == \"$NEW_BATCH_ID\")")
    if [ -z "$IN_INV" ]; then
        echo -e "  Inventory State: ${GREEN}CLEARED${NC} (Sold item hidden)"
    else
        echo -e "  Inventory State: ${RED}VISIBLE${NC} (Sold item still in stock view!)"
    fi
fi

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}COMPLEX SYSTEM VALIDATION COMPLETE${NC}"
echo -e "${BLUE}================================================================${NC}"
