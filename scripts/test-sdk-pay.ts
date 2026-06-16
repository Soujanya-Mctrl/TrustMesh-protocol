import hre from "hardhat";
import { TrustMeshClient, ViemRuntime } from "@trustmesh/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEther } from "viem";

async function main() {
  const net = await hre.network.getOrCreate();
  const { viem } = net;
  const walletClients = await viem.getWalletClients();

  if (walletClients.length === 0) {
    console.error("No wallet clients found.");
    return;
  }

  const deployer = walletClients[0];
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  const rpcUrl = process.env.RPC_URL || process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";

  // Read deployed addresses
  const deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));

  // Network chain ID (43113 for Fuji, 31337 for Local)
  const isFuji = rpcUrl.includes("avax-test") || rpcUrl.includes("fuji") || rpcUrl.includes("43113");
  const chainId = isFuji ? 43113 : 31337;

  console.log(`=== Testing SDK payment routing on ${net.networkName} ===`);
  console.log(`Payer: ${deployer.account.address}\n`);

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

  // Listen to SDK events
  client.on("tier_assigned", (data) => {
    console.log(`\n[SDK Event] Tier Assigned: Tier ${data.tier} (Composite Score: ${data.compositeScore})`);
  });
  client.on("payment_settled", (data) => {
    console.log(`[SDK Event] Payment Settled! Tx Hash: ${data.txHash}`);
  });
  client.on("escrow_created", (data) => {
    console.log(`[SDK Event] Escrow Created! Tx Hash: ${data.txHash}, Escrow ID: ${data.escrowId}`);
  });
  client.on("simulation_started", (data) => {
    console.log(`[SDK Event] Simulation Started! Tx Hash: ${data.txHash}`);
    console.log(`[SDK Event] Risk Report: Outcome=${data.riskReport?.outcome}, Flags=${data.riskReport?.anomalyFlags.join(", ")}`);
  });
  client.on("escalation_required", (data) => {
    console.log(`[SDK Event] WARNING: Escalation Required! Human review pending on Validation Registry.`);
  });

  // We can choose which agent to pay:
  // 1. DataFeed Pro (Score: 94) -> Tier 0 (Direct)
  // 2. NewService (Score: 64) -> Tier 1 (Escrow)
  // 3. SuspiciousAgent (Score: 24) -> Tier 2 (Validation/Escalation)
  
  const args = process.argv.slice(2);
  const mode = process.env.MODE || args[0] || "tier1";

  let payeeAddress: string;
  let amount: string;
  let serviceUrl: string;
  let prompt: string;

  if (mode === "tier0") {
    console.log("➡️ Executing Tier 0 Flow (High Trust -> Direct Payment)...");
    payeeAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // DataFeed Pro EOA
    amount = "1000000000000000"; // 0.001 AVAX
    serviceUrl = "http://localhost:3001/request-service";
    prompt = "Write a DeFi sentiment summary.";
  } else if (mode === "tier1") {
    console.log("➡️ Executing Tier 1 Flow (Medium Trust -> Commit-Lock-Reveal Escrow)...");
    payeeAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // NewService EOA
    amount = "2000000000000000"; // 0.002 AVAX
    serviceUrl = "http://localhost:3002/request-service";
    prompt = "Translate 'System Online' to Japanese.";
  } else {
    console.log("➡️ Executing Tier 2 Flow (Low Trust -> Validation Escalation)...");
    payeeAddress = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"; // SuspiciousAgent EOA
    amount = "500000000000000"; // 0.0005 AVAX
    serviceUrl = "http://localhost:3003/request-service";
    prompt = "Arbitrage check for address 0x7099.";
  }

  try {
    const result = await client.pay(payeeAddress, amount, serviceUrl, prompt);
    console.log("\n=== Payment Execution Result ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("\n[Error] Payment failed:", err.message);
    if (err.details) {
      console.error("[Details]:", JSON.stringify(err.details, null, 2));
    }
    if (err.stack) {
      console.error("[Stack]:", err.stack);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
