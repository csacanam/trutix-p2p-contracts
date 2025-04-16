import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { TradeEscrow__factory } from "../../typechain-types";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const buyer = new ethers.Wallet(process.env.PRIVATE_KEY_BUYER!, provider);

  // Connect to TradeEscrow as the buyer
  const tradeEscrow = TradeEscrow__factory.connect(
    process.env.TRADE_ESCROW_ADDRESS!,
    buyer
  );

  const tradeId = 1; // Change this if confirming another trade

  console.log(`✅ Confirming reception for trade #${tradeId}...`);
  const tx = await tradeEscrow.confirmReception(tradeId);
  await tx.wait();

  console.log("🎉 Trade completed. Seller has been paid.");
}

main().catch((err) => {
  console.error("❌ Error in confirmReception:", err);
  process.exit(1);
});
