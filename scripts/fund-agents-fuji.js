import hre from "hardhat";

async function main() {
  console.log("=== Checking and Funding Agent Wallets on Fuji ===");
  
  const { viem } = await hre.network.getOrCreate();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const agentAddresses = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1 (DataFeed Pro)
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2 (NewService)
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Account #3 (SuspiciousAgent)
    "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65", // Account #4 (PriceOracle)
    "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc", // Account #5 (SummaryBot)
    "0x976ea74026e726554db657fa54763abd0c3a0aa9", // Account #6 (RiskAssessor)
    "0x14dc79964da2c08b23698b3d3cc7ca32193d9955", // Account #7 (CodeAuditor)
    "0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f", // Account #8 (OnChainIndexer)
  ];

  const deployerBalance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`Deployer address: ${deployer.account.address}`);
  console.log(`Deployer balance: ${Number(deployerBalance) / 1e18} AVAX`);

  const fundAmount = 20000000000000000n; // 0.02 AVAX
  
  for (const agentAddress of agentAddresses) {
    const balance = await publicClient.getBalance({ address: agentAddress });
    console.log(`Agent ${agentAddress} balance: ${Number(balance) / 1e18} AVAX`);
    
    if (balance < 10000000000000000n) { // less than 0.01 AVAX
      console.log(`Funding ${agentAddress} with 0.02 AVAX...`);
      const hash = await deployer.sendTransaction({
        to: agentAddress,
        value: fundAmount,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✓ Funded successfully. Tx Hash: ${hash}`);
    } else {
      console.log(`✓ Agent has sufficient balance.`);
    }
  }
}

main().catch(console.error);
