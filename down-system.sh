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

infoln "1. Stopping Backend Services (MariaDB)..."
cd backend
sudo docker-compose stop
successln "Backend database stopped."

infoln "2. Stopping Blockchain Network Services..."
cd ../blockchain-network/prod-network
sudo docker-compose -f docker-compose-net.yaml -f docker-compose-ca.yaml stop

successln "All services stopped successfully. Data has been preserved."
