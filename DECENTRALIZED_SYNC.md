# Decentralized Multi-Database Architecture

This document outlines the strategy for moving towards a more decentralized architecture where local databases (off-chain) are updated **exclusively** via blockchain events. This pattern ensures that the database is a pure "Read Model" of the Ledger (Single Source of Truth).

## 1. Architectural Shift: From Sync to Event-Driven

### Current State (Double-Write)
1. Backend receives API request.
2. Backend submits transaction to Hyperledger Fabric.
3. Backend (upon success) updates local MySQL via Prisma.
*Risk: If the DB update fails but the BC succeeds, the data is out of sync (Data Drift).*

### Target State (Event-Mirroring)
1. Backend receives API request.
2. Backend submits transaction to Hyperledger Fabric and **returns only the TxID**.
3. A dedicated **Sync Service** (per organization) listens for Blockchain events.
4. When a block is committed, the Sync Service parses the data and updates the local MySQL.
*Benefit: The DB is guaranteed to reflect the Ledger. If the DB is wiped, it can be fully reconstructed from the Blockchain.*

---

## 2. Multi-Organization Setup (Total Isolation)

In a truly decentralized pharmaceutical network, **no organization shares a database**. Each MSP (Manufacturer, Pharmacy A, Pharmacy B) operates its own independent infrastructure stack.

### The Per-Org Stack
Each organization deploys:
*   **Fabric Peer**: Their gateway to the network.
*   **Local MySQL**: Their private "Fast Search" index.
*   **Sync Listener**: The bridge between the Peer and MySQL.
*   **Backend API**: Serves their specific frontend users.

### Peer Affinity
The Backend API for "LekarenA" **only** talks to `peer0.lekarena.com`. It never connects to the Manufacturer's database. This ensures that even if the Manufacturer's IT system goes offline, the Pharmacy can still verify their own stock and view their own history.

---

## 3. The "Ledger Replay" (Initial Sync)

If a new pharmacy joins or a database is lost, the system uses a **Replay Mechanism** to sync data that exists **only on the blockchain** into the local DB.

### How Bootstrapping Works:
1.  **Check Height**: The Sync Service asks the Peer for the current ledger height (e.g., 5000 blocks).
2.  **Iterative Crawl**: Starting from Block 0, the service calls `getBlockByNumber(i)`.
3.  **Transaction Parsing**:
    *   Find transactions belonging to the `drug-contract`.
    *   Extract the `Writeset` (the data changes).
    *   Update the local MySQL using the same logic as the live listener.
4.  **Catch-up**: Once it reaches the current height, it switches to "Live Listener" mode.

---

## 4. Syncing Large Data & Media (Photos, PDFs, Catalog Info)

Large assets like **Dosage Instructions**, **Composition text**, **Photos**, and **PDF Leaflets** should be synchronized using the **"Anchor & Pull"** pattern.

### Step 1: On-Chain Metadata (The Anchor)
When a manufacturer adds a new drug to the Catalog, they write the **dosage and composition** directly to the blockchain (as text). For files, they write the **IPFS Content Identifier (CID)**.
```json
{
  "drugID": "DRUG-123",
  "dosage": "1 tablet every 8 hours",
  "leafletCID": "QmXoyp... (Hash of the PDF)",
  "galleryCIDs": ["QmZ4t...", "QmR9u..."]
}
```

### Step 2: Content-Addressed Storage (IPFS)
Instead of storing files on a central server, they are uploaded to **IPFS**.
*   **IPFS** creates a unique fingerprint (Hash) for every file.
*   If the file content changes even by 1 byte, the hash changes.
*   This makes it impossible for someone to "secretly" swap a photo or edit a PDF leaflet.

### Step 3: The Sync Pull
When a Pharmacy's Sync Listener detects a `NewDrugAdded` event:
1.  It saves the **Dosage/Composition** text directly into its local MySQL.
2.  It sees the `leafletCID`.
3.  It calls its local **IPFS Node** to "Pin" (Download) that hash.
4.  The file is now physically stored on the Pharmacy's server, ready to be served to their local users.

*Benefit: Even if the Manufacturer deletes the original photo, the Pharmacy still has their own copy because they pinned the CID.*

---

## 5. Syncing Data ONLY in Local Databases (Off-Chain Sync)

If data is **not** on the blockchain (e.g., draft orders, internal notes, notifications), it cannot be recovered via "Ledger Replay." You have three strategies to keep these in sync:

### Strategy A: Private Data Collections (Hybrid)
**Best for: Sensitive data that MUST be shared and audited (e.g., Prices).**
*   Fabric's internal **Gossip Protocol** automatically synchronizes this "off-chain" state between the databases of authorized peers.

### Strategy B: Direct P2P API (Side-Channel)
**Best for: Transient negotiation or real-time updates (e.g., Chat, Drafts).**
1.  Vyrobca's Backend calls `POST https://api.lekarena.com/sync/draft-offer`.
2.  LekarenA's Backend validates the signature and saves it to their local DB.

---

## 6. Technical Implementation Requirements

### A. Chaincode Event Emission
```typescript
// chaincode/drug-contract.ts
ctx.stub.setEvent('BatchUpdated', Buffer.from(JSON.stringify(payload)));
```

### B. Checkpointing (Reliability)
To ensure no events are missed:
1.  Table `SyncStatus`: `last_block_processed: 1250`.
2.  On restart: `network.getEvents(startBlock: 1251)`.

### C. Conflict Resolution (Idempotency)
*   Always use `Prisma.upsert`.
*   Compare `block_number` and `tx_index`. Only update the DB if the incoming event is "newer" than what is currently stored.

---

## 7. Security & Trust Model

*   **The Database is Disposable**: You should treat your local MySQL as a temporary cache. If you suspect data tampering, you simply drop the tables and trigger a "Ledger Replay".
*   **Auditability**: The `DECENTRALIZED_SYNC` pattern allows the Regulator (SUKL) to run their own Sync Service that aggregates data from **all** public and authorized private collections into a massive audit database.
