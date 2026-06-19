import hre from "hardhat";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEther } from "viem";

async function main() {
  console.log("=== TrustMesh ERC-8004 & Policy Engine Unified Deployment ===\n");

  const net = await hre.network.getOrCreate();
  const { viem } = net;
  const walletClients = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const deployer = walletClients[0];
  const dataFeedProWallet = walletClients[1];
  const newServiceWallet = walletClients[2];
  const suspiciousAgentWallet = walletClients[3];
  const priceOracleWallet = walletClients[4];
  const summaryBotWallet = walletClients[5];
  const riskAssessorWallet = walletClients[6];
  const codeAuditorWallet = walletClients[7];
  const onChainIndexerWallet = walletClients[8];

  // Auto-fund agent wallets from deployer if balance is below 0.1 AVAX
  const agents = [
    { name: "DataFeed Pro", wallet: dataFeedProWallet },
    { name: "NewService", wallet: newServiceWallet },
    { name: "SuspiciousAgent", wallet: suspiciousAgentWallet },
    { name: "PriceOracle", wallet: priceOracleWallet },
    { name: "SummaryBot", wallet: summaryBotWallet },
    { name: "RiskAssessor", wallet: riskAssessorWallet },
    { name: "CodeAuditor", wallet: codeAuditorWallet },
    { name: "OnChainIndexer", wallet: onChainIndexerWallet },
  ];

  console.log("Checking gas balances for agent wallets...");
  for (const agent of agents) {
    const bal = await publicClient.getBalance({ address: agent.wallet.account.address });
    if (bal < parseEther("0.1")) {
      console.log(`  Funding ${agent.name} (${agent.wallet.account.address}) with 0.15 AVAX...`);
      const tx = await deployer.sendTransaction({
        to: agent.wallet.account.address,
        value: parseEther("0.15"),
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
    }
  }
  console.log("✓ Gas balances checked and funded.");


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

  console.log("11. Deploying TaskAgent for PriceOracle...");
  const taskAgentPriceOracle = await viem.deployContract(
    "TaskAgent",
    [identityRegistry.address, reputationRegistry.address, validationRegistry.address],
    { client: { wallet: priceOracleWallet } }
  );
  console.log(`    ✓ TaskAgent (PriceOracle): ${taskAgentPriceOracle.address}`);

  console.log("12. Deploying TaskAgent for SummaryBot...");
  const taskAgentSummaryBot = await viem.deployContract(
    "TaskAgent",
    [identityRegistry.address, reputationRegistry.address, validationRegistry.address],
    { client: { wallet: summaryBotWallet } }
  );
  console.log(`    ✓ TaskAgent (SummaryBot): ${taskAgentSummaryBot.address}`);

  console.log("13. Deploying TaskAgent for RiskAssessor...");
  const taskAgentRiskAssessor = await viem.deployContract(
    "TaskAgent",
    [identityRegistry.address, reputationRegistry.address, validationRegistry.address],
    { client: { wallet: riskAssessorWallet } }
  );
  console.log(`    ✓ TaskAgent (RiskAssessor): ${taskAgentRiskAssessor.address}`);

  console.log("14. Deploying TaskAgent for CodeAuditor...");
  const taskAgentCodeAuditor = await viem.deployContract(
    "TaskAgent",
    [identityRegistry.address, reputationRegistry.address, validationRegistry.address],
    { client: { wallet: codeAuditorWallet } }
  );
  console.log(`    ✓ TaskAgent (CodeAuditor): ${taskAgentCodeAuditor.address}`);

  console.log("15. Deploying TaskAgent for OnChainIndexer...");
  const taskAgentOnChainIndexer = await viem.deployContract(
    "TaskAgent",
    [identityRegistry.address, reputationRegistry.address, validationRegistry.address],
    { client: { wallet: onChainIndexerWallet } }
  );
  console.log(`    ✓ TaskAgent (OnChainIndexer): ${taskAgentOnChainIndexer.address}`);

  // ===== Post-deployment wiring =====
  console.log("\n=== Wiring permissions ===\n");

  // Authorize EscrowVault as a settler on AgentMetricsRegistry
  await metricsRegistry.write.authorizeSettler([escrowVault.address, true]);
  console.log("    ✓ EscrowVault authorized as settler on AgentMetricsRegistry");

  // Authorize PolicyEngine as a settler on AgentMetricsRegistry
  await metricsRegistry.write.authorizeSettler([policyEngine.address, true]);
  console.log("    ✓ PolicyEngine authorized as settler on AgentMetricsRegistry");



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
      TaskAgent_PriceOracle: taskAgentPriceOracle.address,
      TaskAgent_SummaryBot: taskAgentSummaryBot.address,
      TaskAgent_RiskAssessor: taskAgentRiskAssessor.address,
      TaskAgent_CodeAuditor: taskAgentCodeAuditor.address,
      TaskAgent_OnChainIndexer: taskAgentOnChainIndexer.address,
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
