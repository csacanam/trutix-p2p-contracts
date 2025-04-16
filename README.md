# Trutix P2P – Contracts

**Smart contract infrastructure for secure, trustless P2P ticket trades using USDC.**

Trutix P2P is a decentralized protocol that enables buyers and sellers to trade event tickets directly, without intermediaries. This repository contains the core smart contract logic for handling escrow, disputes, expirations, and fee distribution.

---

## ✨ Features

- ⛓️ **USDC-based escrow:** Safe, stable, and predictable payments.
- 🤝 **Trustless trade flow:** Funds are locked until both parties confirm the transaction.
- ⏱️ **Auto-expiration logic:** Ensures trades can't stall indefinitely.
- ⚖️ **Dispute resolution:** Buyers can open disputes; admins resolve them on-chain.
- 📤 **Fee mechanics:** Protocol fees are split between buyers and sellers and claimable by the owner.
- 🔐 **Reentrancy protection:** Hardened against typical smart contract vulnerabilities.

---

## ⚙️ Smart Contract Overview

```solidity
contract TradeEscrow is ReentrancyGuard
```

### Key Struct

```solidity
struct Trade {
  address seller;
  address buyer;
  uint256 amount;
  uint256 sellerFee;
  uint256 buyerFee;
  uint256 createdAt;
  uint256 paidAt;
  uint256 sentAt;
  TradeStatus status;
}
```

### Status Lifecycle

- `Created` → `Paid` → `Sent` → `Completed`
- or → `Expired` / `Refunded` / `Dispute`

---

## 🚀 Trade Flow

1. **Seller creates a trade**, defining price and generating a shareable link.
2. **Buyer pays** via USDC (+fee), and funds are held in escrow.
3. **Seller marks as "Sent"** when tickets are transferred off-chain.
4. **Buyer confirms** reception → seller is paid.
5. If no response in 12h → auto-complete.
6. If buyer didn't receive tickets → can open **Dispute**, frozen until admin resolves.

---

## 🧾 Fees

- Seller fee and buyer fee (default: 5% each) are configurable.
- Platform accumulates fees and owner can withdraw them via `withdrawFees()`.

---

## 🔐 Security

- Uses `ReentrancyGuard` from OpenZeppelin to prevent attack vectors.
- Expiration and payout functions are permissionless but time-gated.
- Disputed trades cannot be manipulated until manually resolved.

---

## 📦 Installation

To test locally with [Hardhat](https://hardhat.org):

```bash
git clone https://github.com/csacanam/trutix-p2p-contracts
cd trutix-p2p-contracts
npm install
npx hardhat compile
```

---

## 📁 File Structure

- `/contracts/TradeEscrow.sol` – main contract
- `/scripts/` – deploy scripts (optional)
- `/test/` – test suite (WIP)

---

## 📜 License

MIT © [Trutix LLC](https://trutix.io)

---

## 🤝 Contact

For questions, disputes or collaboration opportunities, reach out via [@camilosaka](https://twitter.com/camilosaka)
