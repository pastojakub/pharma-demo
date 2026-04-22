#!/bin/bash

# Configuration
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/peercfg
DELAY="3"
MAX_RETRY="5"

. scripts/utils.sh

# 1. Create channel-artifacts directory
mkdir -p channel-artifacts

# Channels and their profiles
CHANNELS=("pharma-global-channel")
PROFILES=("ChannelUsingRaft")

# 2. Function to generate genesis block and join orderer to channel
function createChannel() {
  local CHANNEL_NAME=$1
  local PROFILE=$2

  infoln "Generating channel genesis block '${CHANNEL_NAME}.block' for profile '${PROFILE}'..."
  set -x
  configtxgen -profile ${PROFILE} -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block -channelID ${CHANNEL_NAME}
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    fatalln "Failed to generate channel configuration block for ${CHANNEL_NAME}..."
  fi

  infoln "Creating channel ${CHANNEL_NAME} via Orderer Admin API..."
  set -x
  osnadmin channel join --channelID ${CHANNEL_NAME} \
    --config-block ./channel-artifacts/${CHANNEL_NAME}.block \
    --orderer-address localhost:7053 \
    --ca-file organizations/ordererOrganizations/example.com/tls/ca.crt \
    --client-cert organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt \
    --client-key organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    fatalln "Channel creation failed for ${CHANNEL_NAME}..."
  fi
}

# 3. Function to Join a Peer to the Channel
function joinPeer() {
  local CHANNEL_NAME=$1
  local ORG_NAME=$2
  local MSP_ID=$3
  local PORT=$4
  local DOMAIN=$5

  infoln "Joining ${ORG_NAME} peer to the channel ${CHANNEL_NAME}..."
  
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="${MSP_ID}"
  export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/${DOMAIN}/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp
  export CORE_PEER_ADDRESS=localhost:${PORT}
  export FABRIC_CFG_PATH=${PWD}/peercfg

  local rc=1
  local COUNTER=0
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    set -x
    peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    let rc=$res
    let COUNTER=$COUNTER+1
  done
  cat log.txt
}

# 4. Function to set Anchor Peer
function setAnchorPeer() {
  local CHANNEL_NAME=$1
  local ORG_NAME=$2
  local MSP_ID=$3
  local PORT=$4
  local DOMAIN=$5

  infoln "Setting anchor peer for ${ORG_NAME} on ${CHANNEL_NAME}..."
  
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="${MSP_ID}"
  export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/${DOMAIN}/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp
  export CORE_PEER_ADDRESS=localhost:${PORT}
  export FABRIC_CFG_PATH=${PWD}/peercfg

  # Fetch the latest config
  peer channel fetch config ./channel-artifacts/${CHANNEL_NAME}_config_block.pb -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/tls/ca.crt
  
  # Decode and update
  configtxlator proto_decode --input ./channel-artifacts/${CHANNEL_NAME}_config_block.pb --type common.Block --output ./channel-artifacts/${CHANNEL_NAME}_config_block.json
  jq ".data.data[0].payload.data.config" ./channel-artifacts/${CHANNEL_NAME}_config_block.json > ./channel-artifacts/${CHANNEL_NAME}_config.json
  
  # Inject Anchor Peer with correct Structure
  jq ".channel_group.groups.Application.groups.${MSP_ID}.values += {\"AnchorPeers\":{\"mod_policy\": \"Admins\",\"value\":{\"anchor_peers\": [{\"host\": \"peer0.${DOMAIN}\",\"port\": 7051}]},\"version\": \"0\"}}" ./channel-artifacts/${CHANNEL_NAME}_config.json > ./channel-artifacts/${CHANNEL_NAME}_config_updated.json
  
  # Encode and compute update
  configtxlator proto_encode --input ./channel-artifacts/${CHANNEL_NAME}_config.json --type common.Config --output ./channel-artifacts/${CHANNEL_NAME}_config.pb
  configtxlator proto_encode --input ./channel-artifacts/${CHANNEL_NAME}_config_updated.json --type common.Config --output ./channel-artifacts/${CHANNEL_NAME}_config_updated.pb
  configtxlator compute_update --channel_id $CHANNEL_NAME --original ./channel-artifacts/${CHANNEL_NAME}_config.pb --updated ./channel-artifacts/${CHANNEL_NAME}_config_updated.pb --output ./channel-artifacts/${CHANNEL_NAME}_config_update.pb
  
  # Wrap in envelope
  configtxlator proto_decode --input ./channel-artifacts/${CHANNEL_NAME}_config_update.pb --type common.ConfigUpdate --output ./channel-artifacts/${CHANNEL_NAME}_config_update.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL_NAME'", "type":2}},"data":{"config_update":'$(cat ./channel-artifacts/${CHANNEL_NAME}_config_update.json)'}}}' | jq . > ./channel-artifacts/${CHANNEL_NAME}_config_update_in_envelope.json
  configtxlator proto_encode --input ./channel-artifacts/${CHANNEL_NAME}_config_update_in_envelope.json --type common.Envelope --output ./channel-artifacts/${CHANNEL_NAME}_config_update_in_envelope.pb
  
  # Update channel
  set -x
  peer channel update -f ./channel-artifacts/${CHANNEL_NAME}_config_update_in_envelope.pb -c $CHANNEL_NAME -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/tls/ca.crt
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    fatalln "Anchor peer update failed for ${ORG_NAME} on ${CHANNEL_NAME}"
  fi
}

# --- Main execution ---

# 1. Create pharma-global-channel
for i in "${!CHANNELS[@]}"; do
  createChannel "${CHANNELS[$i]}" "${PROFILES[$i]}"
done

# 2. Join peers to pharma-global-channel (All Orgs)
for org in "Vyrobca VyrobcaMSP 7051 vyrobca.example.com" \
           "Lekarena LekarenAMSP 9051 lekarena.example.com" \
           "LekarenB LekarenBMSP 11051 lekarenb.example.com" \
           "SUKL SUKLMSP 13051 sukl.example.com" \
           "Public PublicMSP 15051 public.example.com"; do
  joinPeer "pharma-global-channel" $org
  setAnchorPeer "pharma-global-channel" $org
done


successln "Pharma Global Channel created, peers joined and anchor peers set successfully!"
