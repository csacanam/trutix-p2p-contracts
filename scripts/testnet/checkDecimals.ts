import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const MOCK_USDC_ADDRESS = process.env.USDC_ADDRESS as string;
const BASE_RPC_URL = process.env.BASE_RPC_URL as string;

const erc20Abi = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const contract = new ethers.Contract(MOCK_USDC_ADDRESS, erc20Abi, provider);

  const decimals = await contract.decimals();
  const symbol = await contract.symbol();

  console.log(`🧾 Token: ${symbol}`);
  console.log(`🧮 Decimals: ${decimals}`);
}

main();
