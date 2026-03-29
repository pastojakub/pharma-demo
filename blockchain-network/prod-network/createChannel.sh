#!/bin/bash

# Configuration
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}
CHANNEL_NAME="mychannel"
DELAY="3"
MAX_RETRY="5"

. scripts/utils.sh

# 1. Create channel-artifacts directory
mkdir -p channel-artifacts

# 2. Generate Channel Genesis Block
infoln "Generating channel genesis block '${CHANNEL_NAME}.block'..."
set -x
configtxgen -profile ChannelUsingRaft -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block -channelID ${CHANNEL_NAME}
res=$?
{ set +x; } 2>/dev/null
if [ $res -ne 0 ]; then
  fatalln "Failed to generate channel configuration block..."
fi

# 3. Create Channel (Join Orderer to Channel)
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
  fatalln "Channel creation failed..."
fi

# 4. Function to Join a Peer to the Channel
function joinPeer() {
  ORG_NAME=$1
  MSP_ID=$2
  PORT=$3
  DOMAIN=$4

  infoln "Joining ${ORG_NAME} peer to the channel..."
  
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
  if [ $rc -ne 0 ]; then
    fatalln "After $MAX_RETRY attempts, ${ORG_NAME} has failed to join channel '${CHANNEL_NAME}'"
  fi
}

# 5. Function to set Anchor Peer (Required for Cross-Org Discovery)
function setAnchorPeer() {
  ORG_NAME=$1
  MSP_ID=$2
  PORT=$3
  DOMAIN=$4

  infoln "Setting anchor peer for ${ORG_NAME}..."
  
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="${MSP_ID}"
  export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/${DOMAIN}/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp
  export CORE_PEER_ADDRESS=localhost:${PORT}
  export FABRIC_CFG_PATH=${PWD}/peercfg

  # Fetch the latest config
  peer channel fetch config ./channel-artifacts/config_block.pb -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME --tls --cafile organizations/ordererOrganizations/example.com/tls/ca.crt
  
  # Decode and update
  configtxlator proto_decode --input ./channel-artifacts/config_block.pb --type common.Block --output ./channel-artifacts/config_block.json
  jq ".data.data[0].payload.data.config" ./channel-artifacts/config_block.json > ./channel-artifacts/config.json
  
  # Inject Anchor Peer (pointing to the internal Docker DNS name)
  jq ".channel_group.groups.Application.groups.${MSP_ID}.values += {\"AnchorPeers\":{\"mod_policy\": \"Admins\",\"value\":{\"anchor_peers\": [{\"host\": \"peer0.${DOMAIN}\",\"port\": 7051}]},\"version\": \"0\"}}" ./channel-artifacts/config.json > ./channel-artifacts/config_updated.json
  
  # Encode and compute update
  configtxlator proto_encode --input ./channel-artifacts/config.json --type common.Config --output ./channel-artifacts/config.pb
  configtxlator proto_encode --input ./channel-artifacts/config_updated.json --type common.Config --output ./channel-artifacts/config_updated.pb
  configtxlator compute_update --channel_id $CHANNEL_NAME --original ./channel-artifacts/config.pb --updated ./channel-artifacts/config_updated.pb --output ./channel-artifacts/config_update.pb
  
  # Wrap in envelope
  configtxlator proto_decode --input ./channel-artifacts/config_update.pb --type common.ConfigUpdate --output ./channel-artifacts/config_update.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL_NAME'", "type":2}},"data":{"config_update":'$(cat ./channel-artifacts/config_update.json)'}}}' | jq . > ./channel-artifacts/config_update_in_envelope.json
  configtxlator proto_encode --input ./channel-artifacts/config_update_in_envelope.json --type common.Envelope --output ./channel-artifacts/config_update_in_envelope.pb
  
  # Update channel
  peer channel update -f ./channel-artifacts/config_update_in_envelope.pb -c $CHANNEL_NAME -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile organizations/ordererOrganizations/example.com/tls/ca.crt
}

# 6. Join all peers
joinPeer "Vyrobca" "VyrobcaMSP" 7051 "vyrobca.example.com"
joinPeer "LekarenA" "LekarenAMSP" 9051 "lekarena.example.com"
joinPeer "LekarenB" "LekarenBMSP" 11051 "lekarenb.example.com"
joinPeer "SUKL" "SUKLMSP" 13051 "sukl.example.com"

# 7. Set Anchor Peers
setAnchorPeer "Vyrobca" "VyrobcaMSP" 7051 "vyrobca.example.com"
setAnchorPeer "LekarenA" "LekarenAMSP" 9051 "lekarena.example.com"
setAnchorPeer "LekarenB" "LekarenBMSP" 11051 "lekarenb.example.com"
setAnchorPeer "SUKL" "SUKLMSP" 13051 "sukl.example.com"

successln "Channel '${CHANNEL_NAME}' created, peers joined and anchor peers set successfully!"
