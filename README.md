# Pharma-Demo: Decentralized Pharma Supply Chain

Pharma-Demo is a sophisticated pharmaceutical supply chain management system built on a decentralized architecture. It leverages **Hyperledger Fabric** for a tamper-proof blockchain ledger, **NestJS** for robust backend APIs, and **Next.js (React)** for an intuitive frontend interface.

## 🚀 Key Features

- **Decentralized Infrastructure**: Each organization (Manufacturer, Pharmacy A, Pharmacy B, Regulator) runs its own sovereign stack.
- **Blockchain Traceability**: Full drug lifecycle tracking from production to sale using Hyperledger Fabric.
- **Automated Synchronization**: Seamless data sync between the blockchain ledger and local SQL databases (Prisma/MySQL).
- **Private Data Collections**: Secure handling of sensitive pricing and contract information.
- **Audit Trails**: Complete transparency for regulatory compliance (ŠÚKL).

## 🏗 System Architecture

The project is divided into several key components:

- **`blockchain-network/`**: Hyperledger Fabric configuration, certificates, and network scripts.
- **`chaincode/`**: Smart contracts written in TypeScript that define the business logic for the supply chain.
- **`backend/`**: NestJS application acting as a gateway between the frontend and the blockchain, managing local state and synchronization.
- **`frontend/`**: A modern Next.js dashboard for interacting with the supply chain.

## 🛠 Prerequisites

- **OS**: Ubuntu 22.04 LTS or newer recommended.
- **Memory**: Minimum 16GB RAM for full decentralized mode.
- **Tools**: Docker, Docker Compose, Node.js (v20+), Go (v1.20+).

## 🏁 Quick Start

1.  **Configure Environment Variables**:
    - Copy `.env.example` to `.env` in `blockchain-network/prod-network/` and `backend/`.
    - Set up a Pinata IPFS account, and update `PINATA_GATEWAY` and `PINATA_JWT` in the backend `.env`. **Important:** The Pinata API key must have "Write" permissions for files, and at least "Read" permissions for other endpoints.
    - See `INSTALL.txt` for more details.

2.  **Initialize the Blockchain Network and decentralized setup**:

    ```bash
    chmod +x *.sh
    ./start-full-system.sh
    ```

2.  **Launch the Frontend**:

    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```

The frontend will be available at `http://localhost:3000`.

## 🏢 Organization Infrastructure

In decentralized mode, each organization has its own API endpoint:

| Organization         | API URL                 |
| :------------------- | :---------------------- |
| **Manufacturer**     | `http://localhost:3001` |
| **Pharmacy A**       | `http://localhost:3002` |
| **Pharmacy B**       | `http://localhost:3003` |
| **Regulator (ŠÚKL)** | `http://localhost:3004` |

---

Developed as a demonstration of blockchain technology in the pharmaceutical industry.
