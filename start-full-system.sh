#!/bin/bash

# Exit on error
set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

infoln() { echo -e "${BLUE}==> $1${NC}"; }
successln() { echo -e "${GREEN}==> $1${NC}"; }
errorln() { echo -e "${RED}==> $1${NC}"; }

# Check if running from project root
if [ ! -d "blockchain-network" ]; then
    errorln "Error: Please run this script from the project root directory."
    exit 1
fi

infoln "1. Cleaning up previous network state..."

# First, bring down the backend services that use the fabric_test network
cd backend
sudo docker-compose -f docker-compose-decentralized.yaml down -v --remove-orphans || true
cd ../blockchain-network/prod-network

sudo docker-compose -f docker-compose-net.yaml -f docker-compose-ca.yaml down -v --remove-orphans
sudo rm -rf organizations channel-artifacts
successln "Cleanup complete."

infoln "2. Starting Certificate Authorities (CA)..."
sudo docker-compose -f docker-compose-ca.yaml up -d
sleep 5 # Wait for CAs to initialize
successln "CAs are up."

infoln "3. Registering and Enrolling identities..."
chmod +x registerEnroll.sh
sudo ./registerEnroll.sh
successln "Identities enrolled."

infoln "4. Starting Peers, Orderer, and CouchDB..."
sudo docker-compose -f docker-compose-net.yaml up -d
sleep 10 # Wait for peers to start
successln "Network nodes are up."

infoln "5. Creating Channel and Setting Anchor Peers..."
chmod +x createChannel.sh
sudo ./createChannel.sh
successln "Channel ready with Anchor Peers configured."

infoln "6. Deploying Chaincode (this may take a minute)..."
chmod +x deployCC.sh
sudo ./deployCC.sh
successln "Chaincode deployed successfully."

infoln "7. Syncing certificates to Backend..."
cd ../../backend
chmod +x sync-certs.sh
sudo ./sync-certs.sh

# Use SUDO_USER if running under sudo, otherwise use USER
FIX_USER=${SUDO_USER:-$USER}
infoln "Fixing wallet ownership for user: $FIX_USER"
sudo chown -R $FIX_USER:$FIX_USER ./wallet
successln "Backend wallet updated."

infoln "8. Starting Decentralized Backend Services (4 Nodes)..."
sudo docker-compose -f docker-compose-decentralized.yaml up -d --build
successln "Decentralized backends and databases are starting."

echo "----------------------------------------------------------------"
successln "ALL STEPS COMPLETED SUCCESSFULLY! FULL SYSTEM IS UP."
echo "----------------------------------------------------------------"
echo "Organizations are available at:"
echo -e "  Manufacturer (Vyrobca): http://localhost:3001"
echo -e "  Pharmacy A (Lekarena): http://localhost:3002"
echo -e "  Pharmacy B (LekarenB): http://localhost:3003"
echo -e "  Regulator (SUKL):      http://localhost:3004"
echo ""
echo -e "  Database UI:           http://localhost:8080"
echo ""
echo -e "  Frontend:"
echo -e "  cd frontend && npm run dev"
echo "----------------------------------------------------------------"
