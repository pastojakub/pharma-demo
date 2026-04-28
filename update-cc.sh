#!/bin/bash

# Configuration
export PATH=${PWD}/blockchain-network/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/blockchain-network/prod-network/peercfg
CHANNEL_NAME="pharma-global-channel"
CC_NAME="drug"
CC_SRC_PATH="./chaincode"
CC_SRC_LANGUAGE="typescript"

# Increment these for every update
CC_VERSION="1.2"
CC_SEQUENCE="2"

# 1. Build and Package Chaincode
echo "Building chaincode..."
cd ${CC_SRC_PATH}
npm install
npm run build
cd ..

echo "Packaging chaincode..."
cd blockchain-network/prod-network
peer lifecycle chaincode package ${CC_NAME}.tar.gz --path ../../${CC_SRC_PATH} --lang node --label ${CC_NAME}_${CC_VERSION}
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
  elif [ $ORG -eq 5 ]; then
    export CORE_PEER_LOCALMSPID="PublicMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/public.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/public.example.com/users/Admin@public.example.com/msp
    export CORE_PEER_ADDRESS=localhost:15051
  fi
}

ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/tls/ca.crt

# 2. Install Chaincode on all peers
for org in 1 2 3 4 5; do
  setGlobals $org
  echo "Installing chaincode on org ${org}..."
  peer lifecycle chaincode install ${CC_NAME}.tar.gz
done

# 3. Approve for all orgs
for org in 1 2 3 4 5; do
  setGlobals $org
  echo "Approving chaincode for org ${org}..."
  peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA" --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} --signature-policy "OR('VyrobcaMSP.member', 'LekarenAMSP.member', 'LekarenBMSP.member', 'SUKLMSP.member')" --collections-config ../../chaincode/collections_config.json
done

# 4. Commit Definition
setGlobals 1
echo "Committing chaincode definition..."
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA" --channelID $CHANNEL_NAME --name ${CC_NAME} \
  --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/vyrobca.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/lekarena.example.com/tls/ca.crt \
  --peerAddresses localhost:11051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/lekarenb.example.com/tls/ca.crt \
  --peerAddresses localhost:13051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/sukl.example.com/tls/ca.crt \
  --peerAddresses localhost:15051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/public.example.com/tls/ca.crt \
  --version ${CC_VERSION} --sequence ${CC_SEQUENCE} --signature-policy "OR('VyrobcaMSP.member', 'LekarenAMSP.member', 'LekarenBMSP.member', 'SUKLMSP.member')" \
  --collections-config ../../chaincode/collections_config.json

echo "Chaincode updated to version ${CC_VERSION} (sequence ${CC_SEQUENCE}) successfully!"
