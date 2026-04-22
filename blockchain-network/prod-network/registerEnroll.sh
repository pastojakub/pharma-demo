#!/bin/bash

# Prepend the bin directory to PATH
export PATH=${PWD}/../bin:$PATH

. scripts/utils.sh

# Function to wait for CA to be ready
function waitForCA() {
  CA_NAME=$1
  CA_PORT=$2
  infoln "Waiting for CA ${CA_NAME} at port ${CA_PORT}..."
  # Ensure the directory exists
  mkdir -p organizations/fabric-ca/${CA_NAME}
  while :
  do
    if [ ! -f "organizations/fabric-ca/${CA_NAME}/tls-cert.pem" ]; then
      sleep 1
    else
      break
    fi
  done
}

# Function to create an organization (Enroll CA Admin, Register identities, Enroll MSP & TLS)
function createOrg() {
  ORG_NAME=$1
  DOMAIN=$2
  CA_PORT=$3
  MSP_ID=$4
  PEER_NAME=$5

  infoln "Creating identities for ${ORG_NAME} (${DOMAIN})"
  
  ORG_DIR=${PWD}/organizations/peerOrganizations/${DOMAIN}
  mkdir -p ${ORG_DIR}

  export FABRIC_CA_CLIENT_HOME=${ORG_DIR}

  # 1. Enroll CA Admin (Bootstrap Admin)
  infoln "Enrolling CA Admin for ${ORG_NAME}"
  set -x
  
  # Special case for public organization CA path
  CA_DIR=${ORG_NAME}
  if [ "${ORG_NAME}" == "public" ]; then CA_DIR="publicOrg"; fi
  
  # CA Name correction to match docker-compose (ca_public instead of ca-public)
  CANAME="ca-${ORG_NAME}"
  if [ "${ORG_NAME}" == "public" ]; then CANAME="ca_public"; fi

  fabric-ca-client enroll -u https://admin:adminpw@localhost:${CA_PORT} --caname ${CANAME} --tls.certfiles "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem"
  { set +x; } 2>/dev/null

  # 2. Define NodeOUs
  echo "NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-${CA_PORT}-${CANAME}.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-${CA_PORT}-${CANAME}.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-${CA_PORT}-${CANAME}.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-${CA_PORT}-${CANAME}.pem
    OrganizationalUnitIdentifier: orderer" > "${ORG_DIR}/msp/config.yaml"

  # 3. Setup CA certs for MSP
  mkdir -p "${ORG_DIR}/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem" "${ORG_DIR}/msp/tlscacerts/ca.crt"
  mkdir -p "${ORG_DIR}/tlsca"
  cp "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem" "${ORG_DIR}/tlsca/tlsca.${DOMAIN}-cert.pem"
  mkdir -p "${ORG_DIR}/ca"
  cp "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem" "${ORG_DIR}/ca/ca.${DOMAIN}-cert.pem"

  # 4. Register Identities (Using unique name for org admin)
  infoln "Registering peer, user and admin for ${ORG_NAME}"
  
  # Determine role based on org
  ROLE="user"
  if [ "$ORG_NAME" == "vyrobca" ]; then ROLE="manufacturer"; fi
  if [ "$ORG_NAME" == "sukl" ]; then ROLE="regulator"; fi
  if [[ "$ORG_NAME" == lekaren* ]]; then ROLE="pharmacy"; fi

  set -x
  fabric-ca-client register --caname ${CANAME} --id.name ${PEER_NAME} --id.secret ${PEER_NAME}pw --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem"
  fabric-ca-client register --caname ${CANAME} --id.name ${ORG_NAME}user --id.secret ${ORG_NAME}userpw --id.type client --id.attrs "role=${ROLE}:ecert" --tls.certfiles "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem"
  fabric-ca-client register --caname ${CANAME} --id.name ${ORG_NAME}admin --id.secret ${ORG_NAME}adminpw --id.type admin --id.attrs "role=${ROLE}:ecert" --tls.certfiles "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem"
  { set +x; } 2>/dev/null

  # 5. Enroll Peer MSP & TLS
  infoln "Enrolling Peer MSP and TLS for ${PEER_NAME}"
  set -x
  fabric-ca-client enroll -u https://${PEER_NAME}:${PEER_NAME}pw@localhost:${CA_PORT} --caname ${CANAME} -M "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem"
  fabric-ca-client enroll -u https://${PEER_NAME}:${PEER_NAME}pw@localhost:${CA_PORT} --caname ${CANAME} -M "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls" --enrollment.profile tls --csr.hosts ${PEER_NAME}.${DOMAIN} --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Finalize TLS filenames for the container
  mkdir -p "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls"
  cp "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls/tlscacerts/"* "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls/ca.crt"
  cp "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls/signcerts/"* "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls/server.crt"
  cp "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls/keystore/"* "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls/server.key"
  cp "${ORG_DIR}/msp/config.yaml" "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/msp/config.yaml"
  
  # Also copy CA cert to top-level for createChannel.sh
  mkdir -p "${ORG_DIR}/tls"
  cp "${ORG_DIR}/peers/${PEER_NAME}.${DOMAIN}/tls/ca.crt" "${ORG_DIR}/tls/ca.crt"

  # 6. Enroll Org Admin & User (Using the registered identities)
  infoln "Enrolling Admin and User"
  set -x
  fabric-ca-client enroll -u https://${ORG_NAME}admin:${ORG_NAME}adminpw@localhost:${CA_PORT} --caname ${CANAME} -M "${ORG_DIR}/users/Admin@${DOMAIN}/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem"
  fabric-ca-client enroll -u https://${ORG_NAME}user:${ORG_NAME}userpw@localhost:${CA_PORT} --caname ${CANAME} -M "${ORG_DIR}/users/User1@${DOMAIN}/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem"
  { set +x; } 2>/dev/null
  
  cp "${ORG_DIR}/msp/config.yaml" "${ORG_DIR}/users/Admin@${DOMAIN}/msp/config.yaml"
  cp "${ORG_DIR}/msp/config.yaml" "${ORG_DIR}/users/User1@${DOMAIN}/msp/config.yaml"
  
  # Ensure tlscacerts is present in user MSPs for CLI trust
  mkdir -p "${ORG_DIR}/users/Admin@${DOMAIN}/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/${CA_DIR}/ca-cert.pem" "${ORG_DIR}/users/Admin@${DOMAIN}/msp/tlscacerts/ca.crt"
}

function createOrderer() {
  infoln "Creating Orderer Identities"
  ORG_DIR=${PWD}/organizations/ordererOrganizations/example.com
  mkdir -p ${ORG_DIR}
  export FABRIC_CA_CLIENT_HOME=${ORG_DIR}

  # 1. Enroll CA Bootstrap Admin
  fabric-ca-client enroll -u https://admin:adminpw@localhost:11054 --caname ca-orderer --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
  
  # 2. Define NodeOUs for Orderer Org
  echo "NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: orderer" > "${ORG_DIR}/msp/config.yaml"

  # Register orderer identities
  fabric-ca-client register --caname ca-orderer --id.name orderer --id.secret ordererpw --id.type orderer --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
  fabric-ca-client register --caname ca-orderer --id.name ordereradmin --id.secret ordereradminpw --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"

  # Enroll Orderer MSP & TLS
  fabric-ca-client enroll -u https://orderer:ordererpw@localhost:11054 --caname ca-orderer -M "${ORG_DIR}/orderers/orderer.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
  fabric-ca-client enroll -u https://orderer:ordererpw@localhost:11054 --caname ca-orderer -M "${ORG_DIR}/orderers/orderer.example.com/tls" --enrollment.profile tls --csr.hosts orderer.example.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"

  mkdir -p "${ORG_DIR}/orderers/orderer.example.com/tls"
  cp "${ORG_DIR}/orderers/orderer.example.com/tls/tlscacerts/"* "${ORG_DIR}/orderers/orderer.example.com/tls/ca.crt"
  cp "${ORG_DIR}/orderers/orderer.example.com/tls/signcerts/"* "${ORG_DIR}/orderers/orderer.example.com/tls/server.crt"
  cp "${ORG_DIR}/orderers/orderer.example.com/tls/keystore/"* "${ORG_DIR}/orderers/orderer.example.com/tls/server.key"
  
  # Copy config.yaml to orderer MSP
  cp "${ORG_DIR}/msp/config.yaml" "${ORG_DIR}/orderers/orderer.example.com/msp/config.yaml"

  # 3. CRITICAL: Setup tlscacerts for the OrdererOrg MSP (used by configtxgen)
  mkdir -p "${ORG_DIR}/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem" "${ORG_DIR}/msp/tlscacerts/ca.crt"

  # Copy CA cert to a top-level tls folder for easy access by osnadmin
  mkdir -p "${ORG_DIR}/tls"
  cp "${ORG_DIR}/orderers/orderer.example.com/tls/ca.crt" "${ORG_DIR}/tls/ca.crt"

  # Enroll Orderer Admin
  fabric-ca-client enroll -u https://ordereradmin:ordereradminpw@localhost:11054 --caname ca-orderer -M "${ORG_DIR}/users/Admin@example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
  cp "${ORG_DIR}/msp/config.yaml" "${ORG_DIR}/users/Admin@example.com/msp/config.yaml"
  mkdir -p "${ORG_DIR}/users/Admin@example.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem" "${ORG_DIR}/users/Admin@example.com/msp/tlscacerts/ca.crt"
}

# Main Execution logic
source .env

waitForCA vyrobca ${VYROBCA_CA_PORT}
waitForCA lekarena ${LEKARENA_CA_PORT}
waitForCA lekarenb ${LEKARENB_CA_PORT}
waitForCA sukl ${SUKL_CA_PORT}
waitForCA publicOrg ${PUBLIC_CA_PORT}
waitForCA ordererOrg ${ORDERER_CA_PORT}

createOrg vyrobca ${VYROBCA_DOMAIN} ${VYROBCA_CA_PORT} VyrobcaMSP peer0
createOrg lekarena ${LEKARENA_DOMAIN} ${LEKARENA_CA_PORT} LekarenAMSP peer0
createOrg lekarenb ${LEKARENB_DOMAIN} ${LEKARENB_CA_PORT} LekarenBMSP peer0
createOrg sukl ${SUKL_DOMAIN} ${SUKL_CA_PORT} SUKLMSP peer0
createOrg public ${PUBLIC_DOMAIN} ${PUBLIC_CA_PORT} PublicMSP peer0
createOrderer
