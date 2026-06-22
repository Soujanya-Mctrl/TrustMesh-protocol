import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_SummaryBot;
const privateKey = (process.env.SUMMARY_BOT_PRIVATE_KEY || "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba") as `0x${string}`;

const systemInstruction = 
  "You are SummaryBot, a concise summarization engine. " +
  "Condense governance proposals, voter comments, draft newsletters, and format reports in clean markdown.";

export async function executeSummaryBot(taskId: bigint, prompt?: string): Promise<string> {
  return executeAgentTask(profile, taskId, prompt);
}

export const profile = {
  agentId: 5,
  key: "summaryBot",
  name: "SummaryBot",
  port: 3006,
  capabilities: ["summarize_text", "write_newsletter", "extract_entities", "format_markdown"],
  contractName: "TaskAgent_SummaryBot",
  trustScore: 64,
  tier: 1 as const,
  serviceUrl: "http://localhost:3006/request-service",
  correctDeliverable: true,
  walletAddress: "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc" as `0x${string}`,
  serviceFee: "1200000000000000", // 0.0012 AVAX
  contractAddress,
  privateKey,
  systemInstruction,
  llmConfig: {
    provider: "gemini" as const,
    model: "gemini-2.5-flash",
  },
  execute: executeSummaryBot,
};
