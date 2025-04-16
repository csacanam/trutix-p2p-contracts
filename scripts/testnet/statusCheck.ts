import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { TradeEscrow__factory } from "../../typechain-types";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const tradeEscrow = TradeEscrow__factory.connect(
    process.env.TRADE_ESCROW_ADDRESS!,
    signer
  );

  const tradeId = 4; 
  const trade = await tradeEscrow.getTrade(tradeId);

  const statusMap: Record<number, string> = {
    0: "Created",
    1: "Paid",
    2: "Sent",
    3: "Completed",
    4: "Expired",
    5: "Refunded",
    6: "Dispute",
  };

  console.log(`📄 Trade #${tradeId} Info:`);
  console.log(`- Seller:     ${trade.seller}`);
  console.log(`- Buyer:      ${trade.buyer}`);
  console.log(`- Amount:     ${ethers.formatUnits(trade.amount, 6)} USDC`);
  console.log(`- Created At: ${new Date(Number(trade.createdAt) * 1000).toLocaleString()}`);
  console.log(`- Paid At:    ${trade.paidAt > 0 ? new Date(Number(trade.paidAt) * 1000).toLocaleString() : "Not paid"}`);
  console.log(`- Sent At:    ${trade.sentAt > 0 ? new Date(Number(trade.sentAt) * 1000).toLocaleString() : "Not sent"}`);
  console.log(`- Status:     ${statusMap[Number(trade.status)] ?? "Unknown"}`);
}

main().catch((err) => {
  console.error("❌ Error in statusCheck:", err);
  process.exit(1);
});
