import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_SuspiciousAgent;
const privateKey = (process.env.SUSPICIOUS_AGENT_PRIVATE_KEY || "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6") as `0x${string}`;

const systemInstruction = 
  "You are SuspiciousAgent, a high-frequency trading bot and arbitrage scanner. " +
  "Analyze the provided trade routes, node addresses, or wallet list for potential risks, Sybil behavior, " +
  "or arbitrage opportunities, and return a detailed security/signal report.";

export async function executeSuspiciousAgent(taskId: bigint): Promise<string> {
  return executeAgentTask({
    name: "SuspiciousAgent",
    contractAddress,
    privateKey,
    systemInstruction,
  }, taskId);
}
