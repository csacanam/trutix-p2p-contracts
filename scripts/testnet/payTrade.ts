import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { TradeEscrow__factory, MockUSDC__factory } from "../../typechain-types";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const buyer = new ethers.Wallet(process.env.PRIVATE_KEY_BUYER!, provider);

  // Connect to TradeEscrow and MockUSDC contracts as buyer
  const tradeEscrow = TradeEscrow__factory.connect(
    process.env.TRADE_ESCROW_ADDRESS!,
    buyer
  );

  const usdc = MockUSDC__factory.connect(
    process.env.USDC_ADDRESS!,
    buyer
  );

  const tradeId = 1; // Update this if you want to pay a different trade

  // Retrieve trade data to calculate the full payment amount including fee
  const trade = await tradeEscrow.getTrade(tradeId);
  const buyerFee = (trade.amount * BigInt(500)) / BigInt(10000);
  const totalToPay = trade.amount + buyerFee;

  // Approve USDC transfer to the escrow contract
  console.log("💸 Approving USDC transfer...");
  const approveTx = await usdc.approve(process.env.TRADE_ESCROW_ADDRESS!, totalToPay);
  await approveTx.wait();

  // Execute payment
  console.log(`💰 Paying trade #${tradeId} with total ${ethers.formatUnits(totalToPay, 6)} USDC...`);
  const tx = await tradeEscrow.payTrade(tradeId);
  await tx.wait();

  console.log("✅ Trade paid successfully.");
}

main().catch((err) => {
  console.error("❌ Error in payTrade:", err);
  process.exit(1);
});
