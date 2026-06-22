import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_PriceOracle;
const privateKey = (process.env.PRICE_ORACLE_PRIVATE_KEY || "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a") as `0x${string}`;

const systemInstruction = 
  "You are PriceOracle, a high-performance price feed and rate compiler. " +
  "Retrieve real-time token rates, pool APYs, compare pool efficiencies, and calculate AVAX balance configurations.";

export async function executePriceOracle(taskId: bigint, prompt?: string): Promise<string> {
  return executeAgentTask(profile, taskId, prompt);
}

export const profile = {
  agentId: 4,
  key: "priceOracle",
  name: "PriceOracle",
  port: 3002,
  capabilities: ["compare_pools", "get_defi_rates", "get_avax_price", "get_tba_balance"],
  contractName: "TaskAgent_PriceOracle",
  trustScore: 88,
  tier: 0 as const,
  serviceUrl: "http://localhost:3002/request-service",
  correctDeliverable: true,
  walletAddress: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65" as `0x${string}`,
  serviceFee: "800000000000000", // 0.0008 AVAX
  contractAddress,
  privateKey,
  systemInstruction,
  llmConfig: {
    provider: "gemini" as const,
    model: "gemini-2.5-flash",
  },
  execute: executePriceOracle,
};
