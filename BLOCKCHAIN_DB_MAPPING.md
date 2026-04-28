# Mapovanie dát: Blockchain (SSoT) vs. Databáza (Mirror)

Tento dokument popisuje prepojenie medzi Hyperledger Fabric ledgerom a MySQL databázou. V tejto architektúre je **blockchain jediným zdrojom pravdy (SSoT)** a databáza slúži ako **optimalizovaný index (cache)** pre rýchle čítanie a vyhľadávanie v UI.

## 1. Kľúčové identifikátory prepojenia

| Biznis entita | Blockchain Entita (Chaincode Class) | Unikátny kľúč v DB (Prisma) | Kľúčové pole (Linking Key) |
| :--- | :--- | :--- | :--- |
| **Katalóg liečiv** | `DrugDefinition` | `DrugCatalog.name` | `name` |
| **Výrobná šarža** | `DrugBatch` | `Drug.batchID` | `batchID` |
| **Súkromná objednávka** | `PrivateOrderData` | `OrderRequest.requestId` | `requestId` |
| **Súbory (IPFS)** | `FileMetadata` | `File.cid` | `cid` |

---

## 2. Detailné mapovanie entít

### 2.1 Katalóg liečiv (Drug Definition)
Definuje statické vlastnosti lieku zdieľané všetkými.
- **Blockchain:** Entita `DrugDefinition` (uložená pod kľúčom `DEF_{id}`).
- **Databáza:** Tabuľka `DrugCatalog` + tabuľka `File`.

| Pole v `DrugDefinition` (BC) | Pole v `DrugCatalog` (DB) | Poznámka |
| :--- | :--- | :--- |
| `name` | `name` | Primárny synchronizačný kľúč |
| `composition` | `composition` | Obsah liečiva |
| `intakeInfo` | `intakeInfo` | Informácie o užívaní |
| `leaflet` (FileMetadata) | `File` (category='LEAFLET') | Zrkadlí sa do tabuľky File |
| `gallery` (FileMetadata[]) | `File` (category='GALLERY') | Zrkadlí sa do tabuľky File |

### 2.2 Výrobné šarže (Drug Batch / Inventory)
Sledovanie fyzických kusov liekov.
- **Blockchain:** Entita `DrugBatch` (Verejný ledger) + `PrivateBatchData` (PDC).
- **Databáza:** Tabuľka `Drug`.

| Pole v BC entitách | Pole v `Drug` (DB) | Zdroj (BC Entity) |
| :--- | :--- | :--- |
| `batchID` | `batchID` | `DrugBatch` (KĽÚČ) |
| `ownerOrg` | `ownerOrg` | `DrugBatch` |
| `expiryDate` | `expiryDate` | `DrugBatch` |
| `quantity` | `quantity` | `PrivateBatchData` (PDC) |
| `price` | `price` | `PrivateBatchData` (PDC) |

### 2.3 Súkromné objednávky (Order Request)
Obchodné prípady medzi lekárňou a výrobcom.
- **Blockchain:** Entita `PrivateOrderData` (uložená v privátnej kolekcii).
- **Databáza:** Tabuľka `OrderRequest`.

| Pole v `PrivateOrderData` (BC) | Pole v `OrderRequest` (DB) | Popis |
| :--- | :--- | :--- |
| `requestId` | `requestId` | **Hlavné prepojenie (KĽÚČ)** |
| `status` | `status` | Aktuálny stav obchodného prípadu |
| `rejectionReason`| `rejectionReason`| Textový dôvod zamietnutia |
| `fileAttachments` (FileMetadata[]) | `File` (category='OTHER') | Prílohy k objednávke (napr. recepty) |

### 2.4 Fulfillment (Vybavenie objednávky)
Záznam o tom, ktoré šarže boli použité na vybavenie objednávky.
- **Blockchain:** Štruktúra `FulfillmentLink` (pole v rámci `PrivateOrderData`).
- **Databáza:** Tabuľka `Fulfillment`.

| Pole v `FulfillmentLink` (BC) | Pole v `Fulfillment` (DB) | Popis |
| :--- | :--- | :--- |
| `batchID` | `batchID` | Prepojenie na konkrétnu šaržu v DB |
| `quantity`| `quantity` | Množstvo zo šarže použité pre objednávku |
| `timestamp`| `createdAt` | Čas priradenia šarže k objednávke |

---

## 3. Prečo sú entity na blockchaine rozdelené?

Architektúra využíva rozdelenie na **Public Ledger** a **Private Data Collections (PDC)**:

1. **`DrugDefinition` & `DrugBatch` (Public):** Sú to verejné certifikáty. Každý v sieti (vrátane regulátora ŠÚKL) musí mať možnosť overiť, že šarža `B-123` je originálna a neexpirovaná.
2. **`PrivateBatchData` & `PrivateOrderData` (Private):** Obsahujú citlivé obchodné údaje. Iba Výrobca a konkrétna Lekáreň vedia, za akú cenu sa liek predal a koľko kusov majú presne na sklade. 

**V MySQL databáze (Mirror) sa tieto dáta spájajú do jedného pohľadu pre danú organizáciu.**
