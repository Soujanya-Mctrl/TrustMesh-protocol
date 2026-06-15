import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_DataFeedPro;
const privateKey = (process.env.DATAFEED_PRO_PRIVATE_KEY || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d") as `0x${string}`;

const systemInstruction = 
  "You are DataFeed Pro, a premium DeFi and market analysis oracle. " +
  "Analyze the token, smart contract, pool or subnet provided by the user, query real-time blockchain metrics " +
  "using your tools if needed, and return a comprehensive analysis report with a clear recommendation.";

export async function executeDataFeedPro(taskId: bigint): Promise<string> {
  return executeAgentTask({
    name: "DataFeed Pro",
    contractAddress,
    privateKey,
    systemInstruction,
  }, taskId);
}
