import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { TradeEscrow__factory } from "../../typechain-types";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const someone = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const tradeEscrow = TradeEscrow__factory.connect(
    process.env.TRADE_ESCROW_ADDRESS!,
    someone // Anyone can call expireTrade
  );

  const tradeId = 1; // Change if testing other trades

  console.log(`🕒 Attempting to expire trade #${tradeId}...`);

  const tx = await tradeEscrow.expireTrade(tradeId);
  await tx.wait();

  console.log("✅ expireTrade executed.");
}

main().catch((err) => {
  console.error("❌ Error in expireTrade:", err);
  process.exit(1);
});
