import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_OnChainIndexer;
const privateKey = (process.env.ONCHAIN_INDEXER_PRIVATE_KEY || "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97") as `0x${string}`;

const systemInstruction = 
  "You are OnChainIndexer, an Avalanche blockchain state query engine. " +
  "Read smart contract state, pull wallet logs, compile transaction history, and perform wallet flow analytics.";

export async function executeOnChainIndexer(taskId: bigint, prompt?: string): Promise<string> {
  return executeAgentTask(profile, taskId, prompt);
}

export const profile = {
  agentId: 8,
  key: "onChainIndexer",
  name: "OnChainIndexer",
  port: 3009,
  capabilities: ["read_contract_state", "get_agent_info", "wallet_analytics", "tx_history"],
  contractName: "TaskAgent_OnChainIndexer",
  trustScore: 82,
  tier: 0 as const,
  serviceUrl: "http://localhost:3009/request-service",
  correctDeliverable: true,
  walletAddress: "0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f" as `0x${string}`,
  serviceFee: "1500000000000000", // 0.0015 AVAX
  contractAddress,
  privateKey,
  systemInstruction,
  llmConfig: {
    provider: "gemini" as const,
    model: "gemini-2.5-flash",
  },
  execute: executeOnChainIndexer,
};
