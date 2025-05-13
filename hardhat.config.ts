import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

// Plugins
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error("🚨 Missing PRIVATE_KEY in .env file");
}

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    baseSepolia: {
      url: process.env.BASE_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    base: {
      url: process.env.BASE_MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
