import { ethers } from "hardhat";

async function main() {
  const TradeEscrow = await ethers.getContractFactory("TradeEscrow");
  const contract = await TradeEscrow.deploy(); // espera automáticamente

  console.log(`✅ TradeEscrow deployed at: ${contract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
