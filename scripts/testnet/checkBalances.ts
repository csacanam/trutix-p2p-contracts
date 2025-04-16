import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { TradeEscrow__factory, MockUSDC__factory } from "../../typechain-types";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const owner = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const buyer = new ethers.Wallet(process.env.PRIVATE_KEY_BUYER!, provider);
  const seller = new ethers.Wallet(process.env.PRIVATE_KEY_SELLER!, provider);

  const usdc = MockUSDC__factory.connect(process.env.USDC_ADDRESS!, provider);
  const tradeEscrow = TradeEscrow__factory.connect(process.env.TRADE_ESCROW_ADDRESS!, provider);

  const [buyerBalance, sellerBalance, contractBalance, feeBalance] = await Promise.all([
    usdc.balanceOf(buyer.address),
    usdc.balanceOf(seller.address),
    usdc.balanceOf(tradeEscrow.getAddress()),
    tradeEscrow.feeBalance(),
  ]);

  console.log(`📊 Buyer Balance:    ${ethers.formatUnits(buyerBalance, 6)} USDC`);
  console.log(`📊 Seller Balance:   ${ethers.formatUnits(sellerBalance, 6)} USDC`);
  console.log(`🏛️ Contract Balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);
  console.log(`💰 Fee Balance:      ${ethers.formatUnits(feeBalance, 6)} USDC`);
}

main().catch((err) => {
  console.error("❌ Error in checkBalances:", err);
  process.exit(1);
});
