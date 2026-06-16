import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TrustMeshClient, ViemRuntime } from "@trustmesh/sdk";
import { parseScenarioFlag, parseGoalFlag, runOrchestrator } from "./index.js";

const args = process.argv.slice(2).map(arg => arg.replace(/\^/g, ""));
const scenario = parseScenarioFlag(args);
const goal = parseGoalFlag(args);

// Read deployed addresses
let addressesPath = resolve(process.cwd(), "deployed-addresses.json");
let deployed: any;
try {
  deployed = JSON.parse(readFileSync(addressesPath, "utf8"));
} catch (e) {
  try {
    addressesPath = resolve(process.cwd(), "../../deployed-addresses.json");
    deployed = JSON.parse(readFileSync(addressesPath, "utf8"));
  } catch (err) {
    console.error("Failed to read deployed-addresses.json. Please deploy first.");
    process.exit(1);
  }
}

const rpcUrl = process.env.RPC_URL || process.env.FUJI_RPC_URL || "http://127.0.0.1:8545";
const deployerPrivateKey = (process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`;

const isFuji = rpcUrl.includes("avax-test") || rpcUrl.includes("fuji") || rpcUrl.includes("43113");
const chainId = isFuji ? 43113 : 31337;

const runtime = new ViemRuntime({
  rpcUrl,
  chainId,
  privateKey: deployerPrivateKey,
  policyEngineAddress: deployed.contracts.PolicyEngine,
  trustRegistryAddress: deployed.contracts.TrustRegistry,
  escrowVaultAddress: deployed.contracts.EscrowVault,
  agentMetricsAddress: deployed.contracts.AgentMetricsRegistry,
});

const client = new TrustMeshClient({
  rpcUrl,
  privateKey: deployerPrivateKey,
  policyEngineAddress: deployed.contracts.PolicyEngine,
  trustRegistryAddress: deployed.contracts.TrustRegistry,
  escrowVaultAddress: deployed.contracts.EscrowVault,
  agentMetricsAddress: deployed.contracts.AgentMetricsRegistry,
  runtime,
});

await runOrchestrator(
  {
    client,
    runtime,
    logger: console,
  },
  goal,
  scenario,
);