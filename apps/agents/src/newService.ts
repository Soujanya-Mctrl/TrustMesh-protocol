import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_NewService;
const privateKey = (process.env.NEW_SERVICE_PRIVATE_KEY || "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a") as `0x${string}`;

const systemInstruction = 
  "You are NewService, a professional translation and localization assistant. " +
  "Translate the provided text or draft invite/document into the requested target language accurately, " +
  "maintaining a professional tone, and return the translated content.";

export async function executeNewService(taskId: bigint): Promise<string> {
  return executeAgentTask({
    name: "NewService",
    contractAddress,
    privateKey,
    systemInstruction,
  }, taskId);
}
