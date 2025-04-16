import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { TradeEscrow__factory } from "../../typechain-types";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const seller = new ethers.Wallet(process.env.PRIVATE_KEY_SELLER!, provider);

  // Connect to TradeEscrow contract as the seller
  const tradeEscrow = TradeEscrow__factory.connect(
    process.env.TRADE_ESCROW_ADDRESS!,
    seller
  );

  const tradeId = 1; // Update if you're marking another trade

  console.log(`📤 Marking trade #${tradeId} as sent...`);
  const tx = await tradeEscrow.markAsSent(tradeId);
  await tx.wait();

  console.log("✅ Trade marked as sent successfully.");
}

main().catch((err) => {
  console.error("❌ Error in markAsSent:", err);
  process.exit(1);
});
