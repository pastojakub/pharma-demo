#!/bin/bash

# Configuration
NETWORK_ROOT_PATH="../blockchain-network/prod-network/organizations/peerOrganizations"
BACKEND_WALLET_PATH="./wallet"

echo "Syncing ALL Fabric organizational certificates to backend wallet..."

# Function to sync a specific Org
sync_org() {
  ORG_NAME=$1
  DOMAIN=$2
  
  echo "Syncing $ORG_NAME ($DOMAIN)..."
  mkdir -p ${BACKEND_WALLET_PATH}/${ORG_NAME}/admin/msp/keystore
  mkdir -p ${BACKEND_WALLET_PATH}/${ORG_NAME}/admin/msp/signcerts
  
  # Copy Admin Certificate
  cp ${NETWORK_ROOT_PATH}/${DOMAIN}/users/Admin@${DOMAIN}/msp/signcerts/cert.pem ${BACKEND_WALLET_PATH}/${ORG_NAME}/admin/msp/signcerts/cert.pem
  
  # Copy Admin Private Key (find the _sk file)
  KEY_FILE=$(ls ${NETWORK_ROOT_PATH}/${DOMAIN}/users/Admin@${DOMAIN}/msp/keystore/*_sk)
  cp ${KEY_FILE} ${BACKEND_WALLET_PATH}/${ORG_NAME}/admin/msp/keystore/admin.key
  
  # Copy TLS CA cert
  mkdir -p ${BACKEND_WALLET_PATH}/ca
  cp ${NETWORK_ROOT_PATH}/${DOMAIN}/tls/ca.crt ${BACKEND_WALLET_PATH}/ca/${ORG_NAME}-ca.crt
}

# Sync all 4 Orgs
sync_org "vyrobca" "vyrobca.example.com"
sync_org "lekarena" "lekarena.example.com"
sync_org "lekarenb" "lekarenb.example.com"
sync_org "sukl" "sukl.example.com"

# 5. Public (Patient)
mkdir -p ${BACKEND_WALLET_PATH}/public/admin/msp/signcerts
mkdir -p ${BACKEND_WALLET_PATH}/public/admin/msp/keystore
cp ${NETWORK_ROOT_PATH}/public.example.com/msp/tlscacerts/ca.crt ${BACKEND_WALLET_PATH}/ca/public-ca.crt
cp ${NETWORK_ROOT_PATH}/public.example.com/users/Admin@public.example.com/msp/signcerts/cert.pem ${BACKEND_WALLET_PATH}/public/admin/msp/signcerts/cert.pem
# Find and copy the private key (it has a random hash name)
PRIV_KEY=$(ls ${NETWORK_ROOT_PATH}/public.example.com/users/Admin@public.example.com/msp/keystore/*_sk)
cp ${PRIV_KEY} ${BACKEND_WALLET_PATH}/public/admin/msp/keystore/admin.key

# Also sync Orderer CA
cp ../blockchain-network/prod-network/organizations/ordererOrganizations/example.com/tls/ca.crt ${BACKEND_WALLET_PATH}/ca/orderer-ca.crt

# --- Fix Permissions and Ownership ---
echo "Fixing permissions for ${BACKEND_WALLET_PATH}..."

# 1. Set full permissions for owner and read for others on directories
chmod -R 755 ${BACKEND_WALLET_PATH}

# 2. Set read permissions for all files (so they can be opened)
find ${BACKEND_WALLET_PATH} -type f -exec chmod 644 {} +

# 3. Ensure the private keys are readable by the user
find ${BACKEND_WALLET_PATH} -name "*.key" -exec chmod 644 {} +

# 4. If we are running under sudo, chown to the original user
if [ -n "$SUDO_USER" ]; then
    chown -R $SUDO_USER:$SUDO_USER ${BACKEND_WALLET_PATH}
    echo "Ownership changed to user: $SUDO_USER"
fi

echo "Successfully synced all certificates to ${BACKEND_WALLET_PATH}"
