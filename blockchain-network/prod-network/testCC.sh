#!/bin/bash

# Configuration
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/peercfg
CHANNEL_NAME="mychannel"
CC_NAME="drug"

# Set the correct path to the Orderer TLS CA
# Note: Verified path for standard Fabric test-network style artifacts
ORDERER_CA="${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt"

# Function to set environment for an Org
setGlobals() {
  ORG=$1
  export CORE_PEER_TLS_ENABLED=true
  if [ $ORG -eq 1 ]; then
    export CORE_PEER_LOCALMSPID="VyrobcaMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/vyrobca.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/vyrobca.example.com/users/Admin@vyrobca.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
  elif [ $ORG -eq 2 ]; then
    export CORE_PEER_LOCALMSPID="LekarenAMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/lekarena.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/lekarena.example.com/users/Admin@lekarena.example.com/msp
    export CORE_PEER_ADDRESS=localhost:9051
  # ... (Orgs 3 and 4 remain the same)
  fi
}

# 1. Create a drug batch
echo "1. Creating a drug batch 'batch123' as Vyrobca..."
setGlobals 1
set -x
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA" -C $CHANNEL_NAME -n $CC_NAME \
  --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/vyrobca.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/lekarena.example.com/tls/ca.crt" \
  --peerAddresses localhost:11051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/lekarenb.example.com/tls/ca.crt" \
  -c '{"function":"CreateDrugBatch","Args":["batch123","Paralen","VyrobcaOrg","1000","2027-12-31"]}'
res=$?
{ set +x; } 2>/dev/null

if [ $res -ne 0 ]; then echo "Failed to create drug batch"; exit 1; fi

# --- THE FIX: WAIT FOR COMMIT ---
echo "Waiting 3 seconds for the ledger to update..."
sleep 3

# 2. Query the state
echo "2. Querying 'batch123' as LekarenA..."
setGlobals 2
set -x
peer chaincode query -C $CHANNEL_NAME -n $CC_NAME -c '{"function":"GetDrugHistory","Args":["batch123"]}'
res=$?
{ set +x; } 2>/dev/null

echo "Chaincode testing completed!"