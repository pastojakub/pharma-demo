#!/bin/bash

# Configuration
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/peercfg
CHANNEL_NAME="mychannel"
CC_NAME="drug"
CC_SRC_PATH="../../chaincode"
CC_SRC_LANGUAGE="typescript"
CC_VERSION="1.0"
CC_SEQUENCE="1"
DELAY="3"
MAX_RETRY="5"

. scripts/utils.sh

# 1. Build and Package Chaincode
infoln "Building chaincode..."
pushd ${CC_SRC_PATH}
npm install
npm run build
popd

infoln "Packaging chaincode..."
set -x
peer lifecycle chaincode package ${CC_NAME}.tar.gz --path ${CC_SRC_PATH} --lang node --label ${CC_NAME}_${CC_VERSION}
res=$?
{ set +x; } 2>/dev/null
if [ $res -ne 0 ]; then
  fatalln "Chaincode packaging has failed"
fi
PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid ${CC_NAME}.tar.gz)

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
  elif [ $ORG -eq 3 ]; then
    export CORE_PEER_LOCALMSPID="LekarenBMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/lekarenb.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/lekarenb.example.com/users/Admin@lekarenb.example.com/msp
    export CORE_PEER_ADDRESS=localhost:11051
  elif [ $ORG -eq 4 ]; then
    export CORE_PEER_LOCALMSPID="SUKLMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/sukl.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/sukl.example.com/users/Admin@sukl.example.com/msp
    export CORE_PEER_ADDRESS=localhost:13051
  fi
}

ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/tls/ca.crt

# 2. Install Chaincode on all peers
for org in 1 2 3 4; do
  setGlobals $org
  infoln "Installing chaincode on peer0.org${org}..."
  set -x
  peer lifecycle chaincode install ${CC_NAME}.tar.gz
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then fatalln "Chaincode installation failed on org ${org}"; fi
done

# 3. Approve for all orgs
for org in 1 2 3 4; do
  setGlobals $org
  infoln "Approving chaincode for org${org}..."
  set -x
  peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA" --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} --signature-policy "OR('VyrobcaMSP.member', 'LekarenAMSP.member', 'LekarenBMSP.member', 'SUKLMSP.member')"
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then fatalln "Chaincode approval failed on org ${org}"; fi
done

# 4. Check Commit Readiness
setGlobals 1
infoln "Checking commit readiness..."
peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} --output json

# 5. Commit Definition
infoln "Committing chaincode definition..."
set -x 
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA" --channelID $CHANNEL_NAME --name ${CC_NAME} \
  --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/vyrobca.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/lekarena.example.com/tls/ca.crt \
  --peerAddresses localhost:11051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/lekarenb.example.com/tls/ca.crt \
  --peerAddresses localhost:13051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/sukl.example.com/tls/ca.crt \
  --version ${CC_VERSION} --sequence ${CC_SEQUENCE} --signature-policy "OR('VyrobcaMSP.member', 'LekarenAMSP.member', 'LekarenBMSP.member', 'SUKLMSP.member')"
res=$?
{ set +x; } 2>/dev/null
if [ $res -ne 0 ]; then fatalln "Chaincode definition commit failed"; fi

# 6. Query Committed
infoln "Querying committed chaincode..."
peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name ${CC_NAME}

successln "Chaincode '${CC_NAME}' deployed successfully on channel '${CHANNEL_NAME}'!"
