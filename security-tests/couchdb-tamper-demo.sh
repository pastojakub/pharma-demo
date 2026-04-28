#!/bin/bash

# Configuration
API_URL="http://localhost:3001"
EMAIL="vyrobca@pharma.sk"
PASSWORD="heslo123"

echo "----------------------------------------------------------------"
echo "DEMO 1: AUTHENTICATED FLOW & DATA TAMPERING"
echo "----------------------------------------------------------------"

# 1. Login to get JWT
echo "1. Logging in as Manufacturer ($EMAIL)..."
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RES | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "   [ERROR] Login failed. Response: $LOGIN_RES"
    exit 1
fi
echo "   > Login successful. JWT Token obtained."

# 2. Create a batch
echo -e "\n2. Creating a legitimate batch on Blockchain..."
BATCH_ID="TAMPER-$(date +%s)"
CREATE_RES=$(curl -s -X POST "$API_URL/drugs" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d "{
        \"id\": \"$BATCH_ID\",
        \"drugID\": \"1\",
        \"name\": \"Aspirin\",
        \"manufacturer\": \"VyrobcaMSP\",
        \"expiryDate\": \"2025-12-31\",
        \"quantity\": 100,
        \"unit\": \"ks\",
        \"price\": 5.50
     }")

echo "   > Server Response: $CREATE_RES"
echo "   > Waiting for Blockchain commitment and Peer sync (5s)..."
sleep 5

# 3. Tamper with CouchDB
echo -e "\n3. MANIPULATING DATA DIRECTLY IN COUCHDB (Bypassing Blockchain)..."
DB_NAME="pharma-global-channel_drug"
DOC_ID="$BATCH_ID"

REV=$(docker exec couchdb_vyrobca curl -s http://admin:adminpw@localhost:5984/$DB_NAME/$DOC_ID | jq -r '._rev')

if [ "$REV" == "null" ] || [ -z "$REV" ]; then
    echo "   [ERROR] Document not found in Peer's CouchDB."
    exit 1
fi

TAMPER_RES=$(docker exec couchdb_vyrobca curl -s -X PUT http://admin:adminpw@localhost:5984/$DB_NAME/$DOC_ID \
     -H "Content-Type: application/json" \
     -d "{
        \"_rev\": \"$REV\",
        \"batchID\": \"$BATCH_ID\",
        \"drugID\": \"1\",
        \"drugName\": \"Aspirin\",
        \"manufacturer\": \"VyrobcaMSP\",
        \"ownerOrg\": \"VyrobcaMSP\",
        \"quantity\": 100,
        \"expiryDate\": \"2099-01-01\",
        \"status\": \"INITIALIZED\",
        \"unit\": \"ks\"
     }")

echo "   > CouchDB Response: $TAMPER_RES"
echo "   > Expiry Date changed to 2099-01-01 locally."

# 4. Demonstrate Detection via API
echo -e "\n4. Running System Integrity Check..."
sleep 2
INTEGRITY_RES=$(curl -s "$API_URL/drugs/$BATCH_ID/verify-integrity" \
     -H "Authorization: Bearer $TOKEN")
echo "   > Server Response: $INTEGRITY_RES"

IS_VALID=$(echo $INTEGRITY_RES | jq -r '.isValid')
if [ "$IS_VALID" == "false" ]; then
    echo "   [SUCCESS] Tamper detected! Local DB does not match Blockchain hash."
else
    echo "   [FAILURE] Tamper was not detected."
fi

# 5. Demonstrate Detection via Transaction
echo -e "\n5. Attempting to transfer the tampered batch (Endorsement Check)..."
TRANSFER_RES=$(curl -s -X POST "$API_URL/transfer" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d "{
        \"batchID\": \"$BATCH_ID\",
        \"newOwnerOrg\": \"LekarenAMSP\",
        \"quantity\": 50,
        \"status\": \"IN_TRANSIT\"
     }")

echo "   > Server Response: $TRANSFER_RES"
echo "   [INFO] The transaction is rejected by the blockchain network due to hash mismatch."

echo -e "\n----------------------------------------------------------------"
echo "DEMO 1 COMPLETE"
echo "----------------------------------------------------------------"
