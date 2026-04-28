# Operations Guide: Decentralized Sovereign Architecture

This guide explains how to run and manage the fully decentralized version of the PharmaChain system, where every organization runs its own isolated infrastructure.

## 1. Prerequisites
*   Hyperledger Fabric network must be running (5 peers: Vyrobca, LekarenaA, LekarenaB, SUKL, Public).
*   Docker and Docker Compose installed.
*   Node.js 18+ installed.

---

## 2. Launching the Multi-Org Network

### Step 1: Start the Fabric Network
From the project root:
```bash
./start-full-system.sh
```
### Step 2: Start the 4 Sovereign Stacks
This will launch 4 isolated MySQL databases, 4 Backend APIs, and a phpMyAdmin dashboard.
```bash
cd backend
docker-compose -f docker-compose-decentralized.yaml up -d --build
```

| Organization | API Port | Database Port | Local Database Name |
| :--- | :--- | :--- | :--- |
| **Manufacturer (Vyrobca)** | `3001` | `3306` | `pharma_db_vyrobca` |
| **Lekáreň A** | `3002` | `3307` | `pharma_db_lekarena` |
| **Lekáreň B** | `3003` | `3308` | `pharma_db_lekarenb` |
| **Regulátor (ŠÚKL)** | `3004` | `3309` | `pharma_db_sukl` |

---

## 3. Database Management (phpMyAdmin)

You can view the data inside each organization's private database using the integrated dashboard:
*   **URL**: `http://localhost:8080`
*   **Server Selection**: In the login screen, select the server you want to inspect (e.g., `db-vyrobca`).
*   **Credentials**: 
    *   **User**: `root`
    *   **Password**: `root`

---

## 4. Using the Decentralized Portals

cd ../frontend
npm run dev
```
Accessible at: `http://localhost:3000`

---

## 3. Using the Decentralized Portals

### The "Sovereign Login" Flow
1.  Open `http://localhost:3000`.
2.  In the **"Infraštruktúra Organizácie"** dropdown, select the portal you want to enter (e.g., **Portál Výrobcu**).
3.  Enter the credentials for that organization.
4.  **Important**: If you want to use two organizations at once (e.g., to see a transfer happen), open the second one in an **Incognito/Private window**. This ensures their local storage (API URL and Cookies) don't conflict.

### Testing the Background Sync (`SyncService`)
1.  Log into **Manufacturer Portal** (Port 3001).
2.  Create a new drug in the Catalog.
3.  The backend writes this ONLY to the blockchain.
4.  Log into **Pharmacy A Portal** (Port 3002).
5.  Wait a few seconds or click the **"Sync Katalóg"** button.
6.  The drug will appear in the Pharmacy's view. 
    *   *Note: It traveled from the Manufacturer's computer to the Blockchain, and then was downloaded by the Pharmacy's computer into their private database.*

---

## 4. Decentralized Media (IPFS)

To enable decentralized storage for drug photos and PDFs, add your Pinata keys to the environment:

1.  Create/Edit `backend/.env`.
2.  Add your keys:
    ```env
    PINATA_JWT=your_token_here
    PINATA_GATEWAY=your_subdomain.mypinata.cloud
    ```
3.  Restart the backends: `docker-compose -f docker-compose-decentralized.yaml restart`.

---

## 5. Maintenance & Reset

### View Sync Logs
To see how a specific organization is syncing with the ledger:
```bash
docker logs -f backend-lekarena
```

### Full System Wipe
To delete all isolated databases and start from a clean state:
```bash
docker-compose -f docker-compose-decentralized.yaml down -v
```
