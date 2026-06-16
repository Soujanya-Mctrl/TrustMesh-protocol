import hre from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  const net = await hre.network.getOrCreate();
  const { viem } = net;
  const walletClients = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  if (walletClients.length === 0) {
    console.error("No wallet clients found. Please check network/config.");
    return;
  }

  const deployer = walletClients[0];
  const deployerAddress = deployer.account.address;
  const deployerBalance = await publicClient.getBalance({ address: deployerAddress });

  console.log(`Network Name: ${net.networkName}`);
  console.log(`Deployer EOA: ${deployerAddress}`);
  console.log(`Deployer Balance: ${formatEther(deployerBalance)} AVAX`);

  const amountToDistribute = parseEther("0.1");
  const agentAddresses = [
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // NewService
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906"  // SuspiciousAgent
  ];
  const agentNames = ["NewService", "SuspiciousAgent"];

  const requiredDeployerBalance = amountToDistribute * BigInt(agentAddresses.length) + parseEther("0.01"); // adding gas margin
  if (deployerBalance < requiredDeployerBalance) {
    console.error(`\nError: Deployer balance is too low (${formatEther(deployerBalance)} AVAX).`);
    console.error(`Please fund the Deployer EOA (${deployerAddress}) with at least 0.3 AVAX using the Fuji Faucet:`);
    console.error(`👉 https://faucet.avax.network/`);
    return;
  }

  console.log(`\nDistributing ${formatEther(amountToDistribute)} AVAX to each agent...`);

  for (let i = 0; i < agentAddresses.length; i++) {
    const toAddress = agentAddresses[i] as `0x${string}`;
    const currentBalance = await publicClient.getBalance({ address: toAddress });
    
    if (currentBalance < parseEther("0.05")) {
      console.log(`Sending 0.1 AVAX to ${agentNames[i]} (${toAddress})...`);
      const txHash = await deployer.sendTransaction({
        to: toAddress,
        value: amountToDistribute,
      });
      console.log(`  Transaction sent: ${txHash}`);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`  ✓ Confirmed.`);
    } else {
      console.log(`${agentNames[i]} already has sufficient balance: ${formatEther(currentBalance)} AVAX.`);
    }
  }

  console.log("\nNew Balances:");
  const finalDeployerBalance = await publicClient.getBalance({ address: deployerAddress });
  console.log(`Deployer: ${formatEther(finalDeployerBalance)} AVAX`);
  for (let i = 0; i < agentAddresses.length; i++) {
    const balance = await publicClient.getBalance({ address: agentAddresses[i] as `0x${string}` });
    console.log(`${agentNames[i]}: ${formatEther(balance)} AVAX`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
