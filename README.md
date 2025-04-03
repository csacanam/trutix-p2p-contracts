# Trutix P2P – Smart Contracts

**Trustless P2P Ticket Trading**  
Smart contracts for escrowed ticket sales using USDC on the Base network.

---

## 📦 Stack

- [Hardhat](https://hardhat.org/)
- Solidity `^0.8.20`
- Ethers.js / Viem
- Base (Testnet + Mainnet)

---

## 📁 Project Structure

```
trutix-contracts/
│
├── contracts/           # Smart contracts (e.g. TradeEscrow.sol)
├── deploy/              # Deployment scripts (optional)
├── scripts/             # Interaction/testing scripts
├── test/                # Unit and flow tests
├── hardhat.config.ts    # Hardhat config
└── .env                 # Environment variables (not committed)
```

---

## 🚀 Setup

1. Clone the repo

```bash
git clone https://github.com/csacanam/trutix-p2p-contracts.git
cd trutix-contracts
```

2. Install dependencies

```bash
yarn
```

3. Create `.env` file

```bash
cp .env.example .env
```

Fill in the following:

```dotenv
PRIVATE_KEY=your_wallet_private_key
BASE_RPC_URL=https://base-goerli.blockpi.network/v1/rpc/public
ETHERSCAN_API_KEY=your_key_if_needed
```

---

## 📜 Scripts

### Compile contracts

```bash
npx hardhat compile
```

### Run local tests

```bash
npx hardhat test
```

### Deploy to Base Goerli

```bash
npx hardhat run scripts/deploy.ts --network baseGoerli
```

---

## 📡 Network Config (example)

In `hardhat.config.ts`:

```ts
networks: {
  baseGoerli: {
    url: process.env.BASE_RPC_URL,
    accounts: [process.env.PRIVATE_KEY!]
  }
},
```

---

## 🔐 Contracts

### `TradeEscrow.sol`

Main escrow contract that holds buyer funds until ticket delivery is confirmed.

Functions include:

- `createTrade()`
- `pay()`
- `markSent()`
- `markReceived()`
- `pauseTrade()` (admin)

---

## ✅ TODO

- [ ] Finalize `Trade` struct and enums
- [ ] Implement and test all contract functions
- [ ] Add events and emit in each flow
- [ ] Add timeout/dispute logic
- [ ] Mainnet deployment script

---

## 🛠 Author

- Backend & Smart Contracts: [Camilo Sacanamboy](https://github.com/csacanam)

---

## 📝 License

MIT
