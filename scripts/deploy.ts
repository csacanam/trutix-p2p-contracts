import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with address:", deployer.address);

  // Deploy MockUSDC
  const usdc = await ethers.deployContract("MockUSDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ MockUSDC deployed at:", usdcAddress);

  // Deploy TradeEscrow with the USDC address
  const escrow = await ethers.deployContract("TradeEscrow", [usdcAddress]);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("✅ TradeEscrow deployed at:", escrowAddress);
}

main().catch((error) => {
  console.error("Deployment failed ❌", error);
  process.exitCode = 1;
});
