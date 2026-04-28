#!/bin/bash

# Exit on error
set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

infoln() { echo -e "${BLUE}==> $1${NC}"; }
successln() { echo -e "${GREEN}==> $1${NC}"; }
warnln() { echo -e "${YELLOW}==> $1${NC}"; }
errorln() { echo -e "${RED}==> $1${NC}"; }

# Check if running from project root
if [ ! -d "blockchain-network" ]; then
    errorln "Error: Please run this script from the project root directory."
    exit 1
fi

infoln "1. Checking network state..."
if [ ! -d "blockchain-network/prod-network/organizations" ]; then
    warnln "Warning: 'organizations' folder not found. The network might not have been initialized."
    warnln "If this is the first time running the system, please use: ./start-full-system.sh"
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

infoln "2. Starting Blockchain Network Services..."
cd blockchain-network/prod-network

infoln "Starting Certificate Authorities..."
sudo docker-compose -f docker-compose-ca.yaml up -d
sleep 2

infoln "Starting Peers, Orderer, and CouchDB..."
sudo docker-compose -f docker-compose-net.yaml up -d

successln "Blockchain services are starting."

infoln "3. Starting Decentralized Backend Services (4 Nodes)..."
cd ../../backend
sudo docker-compose -f docker-compose-decentralized.yaml up -d

successln "Decentralized backends and databases are starting."

echo "----------------------------------------------------------------"
successln "FULL DECENTRALIZED SYSTEM IS UP!"
echo "----------------------------------------------------------------"
echo "Organizations are available at:"
echo -e "  ${YELLOW}Manufacturer (Vyrobca):${NC} http://localhost:3001"
echo -e "  ${YELLOW}Pharmacy A (Lekarena):${NC} http://localhost:3002"
echo -e "  ${YELLOW}Pharmacy B (LekarenB):${NC} http://localhost:3003"
echo -e "  ${YELLOW}Regulator (SUKL):${NC}      http://localhost:3004"
echo ""
echo -e "  ${YELLOW}Database UI:${NC}           http://localhost:8080"
echo ""
echo -e "  ${YELLOW}Frontend:${NC}"
echo -e "  cd frontend && npm run dev"
echo "----------------------------------------------------------------"
echo "Note: If the blockchain network was previously initialized,"
echo "your data and channel state should be preserved."
echo "----------------------------------------------------------------"
