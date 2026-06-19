import hre from "hardhat";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  console.log("=== TrustMesh ERC-8004 & Policy Engine Unified Deployment ===\n");

  const net = await hre.network.getOrCreate();
  const { viem } = net;
  const walletClients = await viem.getWalletClients();

  const deployer = walletClients[0];
  const dataFeedProWallet = walletClients[1];
  const newServiceWallet = walletClients[2];
  const suspiciousAgentWallet = walletClients[3];

  // 1. Deploy IdentityRegistry (Standard ERC-8004)
  console.log("1. Deploying IdentityRegistry...");
  const identityRegistry = await viem.deployContract(
    "IdentityRegistry",
    [],
    { client: { wallet: deployer } }
  );
  console.log(`    ✓ IdentityRegistry: ${identityRegistry.address}`);

  // 2. Deploy ReputationRegistry (Standard ERC-8004)
  console.log("2. Deploying ReputationRegistry...");
  const reputationRegistry = await viem.deployContract(
    "ReputationRegistry",
    [identityRegistry.address],
    { client: { wallet: deployer } }
  );
  console.log(`    ✓ ReputationRegistry: ${reputationRegistry.address}`);

  // 3. Deploy ValidationRegistry (Standard ERC-8004)
  console.log("3. Deploying ValidationRegistry...");
  const validationRegistry = await viem.deployContract(
    "ValidationRegistry",
    [identityRegistry.address],
    { client: { wallet: deployer } }
  );
  console.log(`    ✓ ValidationRegistry: ${validationRegistry.address}`);

  // 4. Deploy AgentMetricsRegistry
  console.log("4. Deploying AgentMetricsRegistry...");
  const metricsRegistry = await viem.deployContract("AgentMetricsRegistry", [
    "0x0000000000000000000000000000000000000000", // no price oracle for demo
    0n,
  ]);
  console.log(`    ✓ AgentMetricsRegistry: ${metricsRegistry.address}`);

  // 5. Deploy TrustRegistry (wired to standard registries)
  console.log("5. Deploying TrustRegistry...");
  const trustRegistry = await viem.deployContract("TrustRegistry", [
    identityRegistry.address,
    reputationRegistry.address,
    metricsRegistry.address,
  ]);
  console.log(`    ✓ TrustRegistry: ${trustRegistry.address}`);

  // 6. Deploy EscrowVault
  console.log("6. Deploying EscrowVault...");
  const escrowVault = await viem.deployContract("EscrowVault", [
    metricsRegistry.address,
  ]);
  console.log(`    ✓ EscrowVault: ${escrowVault.address}`);

  // 7. Deploy PolicyEngine (wired to standard ValidationRegistry)
  console.log("7. Deploying PolicyEngine...");
  const policyEngine = await viem.deployContract("PolicyEngine", [
    metricsRegistry.address,
    trustRegistry.address,
    validationRegistry.address,
  ]);
  console.log(`    ✓ PolicyEngine: ${policyEngine.address}`);

  // 8. Deploy TaskAgents (Standard ERC-8004 agents)
  console.log("8. Deploying TaskAgent for DataFeed Pro...");
  const taskAgentDataFeedPro = await viem.deployContract(
    "TaskAgent",
    [identityRegistry.address, reputationRegistry.address, validationRegistry.address],
    { client: { wallet: dataFeedProWallet } }
  );
  console.log(`    ✓ TaskAgent (DataFeed Pro): ${taskAgentDataFeedPro.address}`);

  console.log("9. Deploying TaskAgent for NewService...");
  const taskAgentNewService = await viem.deployContract(
    "TaskAgent",
    [identityRegistry.address, reputationRegistry.address, validationRegistry.address],
    { client: { wallet: newServiceWallet } }
  );
  console.log(`    ✓ TaskAgent (NewService): ${taskAgentNewService.address}`);

  console.log("10. Deploying TaskAgent for SuspiciousAgent...");
  const taskAgentSuspiciousAgent = await viem.deployContract(
    "TaskAgent",
    [identityRegistry.address, reputationRegistry.address, validationRegistry.address],
    { client: { wallet: suspiciousAgentWallet } }
  );
  console.log(`    ✓ TaskAgent (SuspiciousAgent): ${taskAgentSuspiciousAgent.address}`);

  // ===== Post-deployment wiring =====
  console.log("\n=== Wiring permissions ===\n");

  // Authorize EscrowVault as a settler on AgentMetricsRegistry
  await metricsRegistry.write.authorizeSettler([escrowVault.address, true]);
  console.log("    ✓ EscrowVault authorized as settler on AgentMetricsRegistry");

  // Authorize PolicyEngine as a settler on AgentMetricsRegistry
  await metricsRegistry.write.authorizeSettler([policyEngine.address, true]);
  console.log("    ✓ PolicyEngine authorized as settler on AgentMetricsRegistry");

  // Authorize PolicyEngine as writer on ValidationRegistry (to resolve validations via humanApprove)
  await validationRegistry.write.setAuthorizedWriter([policyEngine.address, true]);
  console.log("    ✓ PolicyEngine authorized as writer on ValidationRegistry");

  // Authorize deployer as facilitator on PolicyEngine (for direct settlement recording)
  await policyEngine.write.addFacilitator([deployer.account.address]);
  console.log(`    ✓ Deployer (${deployer.account.address}) authorized as facilitator on PolicyEngine`);

  // Write deployed addresses to file
  const addresses = {
    network: net.networkName,
    deployedAt: new Date().toISOString(),
    contracts: {
      AgentIdentityRegistry: identityRegistry.address, // Alias for backward compatibility
      ReputationRegistry: reputationRegistry.address, // Alias for backward compatibility
      ValidationRegistry: validationRegistry.address, // Alias for backward compatibility
      IdentityRegistry8004: identityRegistry.address,
      ReputationRegistry8004: reputationRegistry.address,
      ValidationRegistry8004: validationRegistry.address,
      AgentMetricsRegistry: metricsRegistry.address,
      TrustRegistry: trustRegistry.address,
      EscrowVault: escrowVault.address,
      PolicyEngine: policyEngine.address,
      TaskAgent_DataFeedPro: taskAgentDataFeedPro.address,
      TaskAgent_NewService: taskAgentNewService.address,
      TaskAgent_SuspiciousAgent: taskAgentSuspiciousAgent.address,
    },
  };

  const outputPath = resolve(process.cwd(), "deployed-addresses.json");
  writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log(`\n✓ Addresses written to ${outputPath}`);

  console.log("\n=== Deployment Complete ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
