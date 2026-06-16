import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  const net = await hre.network.getOrCreate();
  const { viem } = net;
  const walletClients = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`Network Name: ${net.networkName}`);
  console.log(`Chain Type: ${net.chainType}`);
  if (net.networkConfig) {
    console.log(`RPC URL: ${(net.networkConfig as any).url}`);
  }

  if (walletClients.length === 0) {
    console.log("No wallet clients found.");
    return;
  }

  const deployer = walletClients[0];
  const deployerAddress = deployer.account.address;
  const deployerBalance = await publicClient.getBalance({ address: deployerAddress });

  console.log(`\nDeployer EOA: ${deployerAddress}`);
  console.log(`Deployer Balance: ${formatEther(deployerBalance)} AVAX`);

  // Deterministic agent addresses matching profiles.ts
  const agentAddresses = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906"  // Account #3
  ];

  const agentNames = ["DataFeed Pro", "NewService", "SuspiciousAgent"];

  console.log("\nAgent Balances:");
  for (let i = 0; i < agentAddresses.length; i++) {
    const balance = await publicClient.getBalance({ address: agentAddresses[i] as `0x${string}` });
    console.log(`- ${agentNames[i]} (${agentAddresses[i]}): ${formatEther(balance)} AVAX`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
