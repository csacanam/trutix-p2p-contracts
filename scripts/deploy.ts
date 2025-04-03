import { ethers } from "hardhat";

async function main() {
  const TradeEscrow = await ethers.getContractFactory("TradeEscrow");
  const contract = await TradeEscrow.deploy();

  await contract.deployed();

  console.log(`✅ TradeEscrow deployed at: ${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

