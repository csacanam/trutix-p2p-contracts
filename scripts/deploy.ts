import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with address:", deployer.address);
  console.log("Network:", network.name);

  let usdcAddress: string;

  if (network.name === "base") {
    // USDC real en Base mainnet
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("Using real USDC:", usdcAddress);
  } else {
    // Deploy MockUSDC solo para testing/dev
    const usdc = await ethers.deployContract("MockUSDC");
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("✅ MockUSDC deployed at:", usdcAddress);
  }

  // Deploy TradeEscrow
  const escrow = await ethers.deployContract("TradeEscrow", [usdcAddress]);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("✅ TradeEscrow deployed at:", escrowAddress);
}

main().catch((error) => {
  console.error("Deployment failed ❌", error);
  process.exitCode = 1;
});
