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
cd blockchain-network/prod-network
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
sudo chown -R $USER:$USER ./wallet
successln "Backend wallet updated."

echo "----------------------------------------------------------------"
successln "ALL STEPS COMPLETED SUCCESSFULLY!"
echo "----------------------------------------------------------------"
echo "To start the application:"
echo -e "  Backend:  ${BLUE}cd backend && npm run start:dev${NC}"
echo -e "  Frontend: ${BLUE}cd frontend && npm run dev${NC}"
echo "----------------------------------------------------------------"
