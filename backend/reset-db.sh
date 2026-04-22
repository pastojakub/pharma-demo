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

# Check if running from backend root
if [ ! -f "package.json" ]; then
    errorln "Error: Please run this script from the backend directory."
    exit 1
fi

infoln "1. Resetting database and syncing schema..."
npx prisma db push --force-reset

infoln "2. Seeding initial users and data..."
npx prisma db seed

successln "Database has been re-initialized and seeded!"
