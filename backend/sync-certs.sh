#!/bin/bash

# Configuration
ORG_NAME="vyrobca"
NETWORK_ROOT_PATH="../blockchain-network/prod-network/organizations/peerOrganizations"
BACKEND_WALLET_PATH="./wallet"

echo "Syncing Fabric certificates to backend wallet..."

# Create local wallet structure
mkdir -p ${BACKEND_WALLET_PATH}/ca
mkdir -p ${BACKEND_WALLET_PATH}/admin/msp/keystore
mkdir -p ${BACKEND_WALLET_PATH}/admin/msp/signcerts

# 1. Copy TLS CA certificates for ALL organizations (needed for multi-peer connection)
cp ${NETWORK_ROOT_PATH}/vyrobca.example.com/tls/ca.crt ${BACKEND_WALLET_PATH}/ca/vyrobca-ca.crt
cp ${NETWORK_ROOT_PATH}/lekarena.example.com/tls/ca.crt ${BACKEND_WALLET_PATH}/ca/lekarena-ca.crt
cp ${NETWORK_ROOT_PATH}/lekarenb.example.com/tls/ca.crt ${BACKEND_WALLET_PATH}/ca/lekarenb-ca.crt
cp ${NETWORK_ROOT_PATH}/sukl.example.com/tls/ca.crt ${BACKEND_WALLET_PATH}/ca/sukl-ca.crt
cp ../blockchain-network/prod-network/organizations/ordererOrganizations/example.com/tls/ca.crt ${BACKEND_WALLET_PATH}/ca/tls-ca.crt

# 2. Copy Admin Certificate (Vyrobca)
cp ${NETWORK_ROOT_PATH}/vyrobca.example.com/users/Admin@vyrobca.example.com/msp/signcerts/cert.pem ${BACKEND_WALLET_PATH}/admin/msp/signcerts/cert.pem

# 3. Copy Admin Private Key (Vyrobca)
KEY_FILE=$(ls ${NETWORK_ROOT_PATH}/vyrobca.example.com/users/Admin@vyrobca.example.com/msp/keystore/*_sk)
cp ${KEY_FILE} ${BACKEND_WALLET_PATH}/admin/msp/keystore/admin.key

echo "Successfully synced certificates to ${BACKEND_WALLET_PATH}"
ls -R ${BACKEND_WALLET_PATH}/ca
