import { ethers } from "ethers";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Load contract ABI
const abiPath = path.join(__dirname, "../../abi/TradeEscrow.json");
const abi = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

// Load environment variables
const PRIVATE_KEY_SELLER = process.env.PRIVATE_KEY_SELLER as string;
const BASE_RPC_URL = process.env.BASE_RPC_URL as string;
const TRADE_ESCROW_ADDRESS = process.env.TRADE_ESCROW_ADDRESS as string;

// Safety checks
if (!PRIVATE_KEY_SELLER || !BASE_RPC_URL || !TRADE_ESCROW_ADDRESS) {
  throw new Error("❌ Missing environment variables");
}

async function main() {
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY_SELLER, provider);

  // Attach to deployed contract
  const contract = new ethers.Contract(TRADE_ESCROW_ADDRESS, abi, signer);

  // Set trade amount (100 USDC = 100e6)
  const amount = ethers.parseUnits("100", 6); // 6 decimals

  console.log("📤 Creating trade with amount:", amount.toString());

  const tx = await contract.createTrade(amount);
  const receipt = await tx.wait();

  const tradeCreatedEvent = receipt?.logs
    .map((log: any) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed: any) => parsed && parsed.name === "TradeCreated");

  if (tradeCreatedEvent) {
    console.log("✅ Trade created with ID:", tradeCreatedEvent.args.tradeId.toString());
  } else {
    console.log("✅ Trade created, but event not parsed. Tx hash:", tx.hash);
  }
}

main().catch((err) => {
  console.error("❌ Error creating trade:", err);
  process.exit(1);
});
