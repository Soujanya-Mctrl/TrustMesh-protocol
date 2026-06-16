import hre from "hardhat";
import { parseAbi } from "viem";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  const net = await hre.network.getOrCreate();
  const { viem } = net;
  const walletClients = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  if (walletClients.length === 0) {
    console.error("No wallet clients found.");
    return;
  }

  const deployer = walletClients[0];
  const deployerAddress = deployer.account.address;

  console.log(`Network: ${net.networkName}`);
  console.log(`Deployer: ${deployerAddress}\n`);

  const deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));

  const agents = [
    {
      name: "DataFeed Pro",
      contractAddress: deployed.contracts.TaskAgent_DataFeedPro,
      agentWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    },
    {
      name: "NewService",
      contractAddress: deployed.contracts.TaskAgent_NewService,
      agentWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    },
    {
      name: "SuspiciousAgent",
      contractAddress: deployed.contracts.TaskAgent_SuspiciousAgent,
      agentWallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    },
  ];

  const OWNABLE_ABI = parseAbi([
    "function owner() view returns (address)",
    "function transferOwnership(address newOwner) external",
  ]);

  for (const agent of agents) {
    console.log(`Checking contract: ${agent.name} at ${agent.contractAddress}...`);
    const currentOwner = await publicClient.readContract({
      address: agent.contractAddress,
      abi: OWNABLE_ABI,
      functionName: "owner",
    });

    if (currentOwner.toLowerCase() === deployerAddress.toLowerCase()) {
      console.log(`  Current owner is Deployer. Transferring ownership to agent wallet: ${agent.agentWallet}...`);
      const txHash = await deployer.writeContract({
        address: agent.contractAddress,
        abi: OWNABLE_ABI,
        functionName: "transferOwnership",
        args: [agent.agentWallet as `0x${string}`],
      });
      console.log(`  Transaction sent: ${txHash}`);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`  ✓ Transfer confirmed.`);
    } else if (currentOwner.toLowerCase() === agent.agentWallet.toLowerCase()) {
      console.log(`  ✓ Already owned by agent wallet: ${agent.agentWallet}`);
    } else {
      console.log(`  ⚠ Owned by another address: ${currentOwner}`);
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
