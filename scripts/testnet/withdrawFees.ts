import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { TradeEscrow__factory, MockUSDC__factory } from "../../typechain-types";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const owner = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const tradeEscrow = TradeEscrow__factory.connect(
    process.env.TRADE_ESCROW_ADDRESS!,
    owner
  );
  const usdc = MockUSDC__factory.connect(process.env.USDC_ADDRESS!, provider);

  const ownerBalanceBefore = await usdc.balanceOf(owner.address);
  const feeBalance = await tradeEscrow.feeBalance();

  console.log(`💰 Fee balance to withdraw: ${ethers.formatUnits(feeBalance, 6)} USDC`);

  if (feeBalance === 0n) {
    console.log("⚠️ No fees to withdraw.");
    return;
  }

  const tx = await tradeEscrow.withdrawFees(owner.address);
  await tx.wait();

  const ownerBalanceAfter = await usdc.balanceOf(owner.address);
  const contractBalance = await usdc.balanceOf(await tradeEscrow.getAddress());

  console.log("✅ Fees withdrawn successfully.");
  console.log(`👤 Owner balance before: ${ethers.formatUnits(ownerBalanceBefore, 6)} USDC`);
  console.log(`👤 Owner balance after:  ${ethers.formatUnits(ownerBalanceAfter, 6)} USDC`);
  console.log(`🏛️ Contract balance now: ${ethers.formatUnits(contractBalance, 6)} USDC`);
}

main().catch((err) => {
  console.error("❌ Error in withdrawFees:", err);
  process.exit(1);
});
