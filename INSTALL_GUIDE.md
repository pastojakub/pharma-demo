# Inštalačná príručka: Pharma-Demo (Decentralizovaný Režim)

Tento dokument popisuje sprevádzkovanie systému v **plne decentralizovanej architektúre**, kde každá organizácia prevádzkuje vlastnú infraštruktúru (Sovereign Stack).

## 1. Systémové požiadavky
*   **Operačný systém:** Ubuntu 22.04 LTS alebo 24.04 LTS.
*   **Hardvér:** Minimálne **16 GB RAM** (každá organizácia má vlastnú DB a Backend kontajner).

---

## 2. Prerekvizity

Nainštalujte potrebné nástroje v tomto poradí:

### 2.1 Docker, Node.js a Go
```bash
# Docker a Docker Compose
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git make jq build-essential docker.io docker-compose
sudo usermod -aG docker $USER

# Node.js 20 a Golang
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs golang-go

# POZOR: Odhláste sa a znova prihláste pre uplatnenie práv k Dockeru.
```

---

## 3. Inicializácia Blockchain Siete

Blockchain sieť je spoločná pre všetky organizácie. Spustite hlavný skript na jej vybudovanie:

```bash
chmod +x *.sh
./start-full-system.sh
```
*Tento skript vygeneruje certifikáty, spustí 5 peerov, vytvorí kanál a nasadí smart kontrakt.*

---

## 4. Spustenie Decentralizovaných Stackov

Namiesto jedného backendu spustíme **4 izolované databázy a 4 backendy** pomocou špeciálnej konfigurácie:

### 4.1 Spustenie infraštruktúry
```bash
cd backend
# Spustenie 4x MySQL, 4x Backend API a phpMyAdmin
docker-compose -f docker-compose-decentralized.yaml up -d --build
```

### 4.2 Prehľad portov organizácií
Po spustení sú backendy dostupné na týchto adresách:

| Organizácia | API URL | Databáza (v rámci Dockeru) |
| :--- | :--- | :--- |
| **Výrobca** | `http://localhost:3001` | `pharma_db_vyrobca` |
| **Lekáreň A** | `http://localhost:3002` | `pharma_db_lekarena` |
| **Lekáreň B** | `http://localhost:3003` | `pharma_db_lekarenb` |
| **ŠÚKL (Regulátor)** | `http://localhost:3004` | `pharma_db_sukl` |

---

## 5. Spustenie Frontendu

Frontend je jeden, ale umožňuje vám vybrať si, do ktorej infraštruktúry sa chcete prihlásiť.

```bash
cd ../frontend
npm install
npm run dev
```
Dostupné na: `http://localhost:3000`

---

## 6. Práca v decentralizovanom režime

1.  Otvorte `http://localhost:3000`.
2.  V prihlasovacej obrazovke nájdete výber **"Infraštruktúra Organizácie"**.
3.  Vyberte si portál (napr. Výrobca) a prihláste sa.
4.  **Tip:** Ak chcete sledovať tok liekov v reálnom čase (napr. transfer z Výrobcu do Lekárne), otvorte druhý portál v **Inkognito okne** prehliadača. Tým zabránite prepisovaniu cookies medzi rôznymi API portmi.

---

## 7. Správa a Monitoring

### phpMyAdmin (Všetky databázy na jednom mieste)
*   **URL:** `http://localhost:8080`
*   **Prihlásenie:** Vyberte server (napr. `db-vyrobca`), meno: `root`, heslo: `root`.

### Sledovanie synchronizácie (Sync Logs)
Ak chcete vidieť, ako konkrétna organizácia sťahuje dáta z blockchainu:
```bash
docker logs -f backend-vyrobca
# alebo
docker logs -f backend-lekarena
```

### Úplný reset systému
Pre vymazanie všetkých blockchain dát aj všetkých 4 databáz:
```bash
./down-system.sh
cd backend
docker-compose -f docker-compose-decentralized.yaml down -v
```
