import hre from "hardhat";
import { privateKeyToAccount } from "viem/accounts";
import { formatEther } from "viem";

async function main() {
  const net = await hre.network.getOrCreate();
  const { viem } = net;
  const publicClient = await viem.getPublicClient();

  const keys = [
    { name: "Deployer", key: process.env.DEPLOYER_PRIVATE_KEY },
    { name: "DataFeed Pro", key: process.env.DATAFEED_PRO_PRIVATE_KEY },
    { name: "Price Oracle", key: process.env.PRICE_ORACLE_PRIVATE_KEY },
    { name: "New Service", key: process.env.NEW_SERVICE_PRIVATE_KEY },
    { name: "Suspicious Agent", key: process.env.SUSPICIOUS_AGENT_PRIVATE_KEY },
    { name: "Summary Bot", key: process.env.SUMMARY_BOT_PRIVATE_KEY },
    { name: "Risk Assessor", key: process.env.RISK_ASSESSOR_PRIVATE_KEY },
    { name: "Code Auditor", key: process.env.CODE_AUDITOR_PRIVATE_KEY },
    { name: "On-Chain Indexer", key: process.env.ONCHAIN_INDEXER_PRIVATE_KEY },
  ];

  console.log(`Checking balances on network: ${net.networkName}`);
  for (const item of keys) {
    if (!item.key) {
      console.log(`  ${item.name}: [Not Configured]`);
      continue;
    }
    try {
      const account = privateKeyToAccount(item.key as `0x${string}`);
      const balance = await publicClient.getBalance({ address: account.address });
      console.log(`  ${item.name} (${account.address}): ${formatEther(balance)} AVAX`);
    } catch (err: any) {
      console.log(`  ${item.name}: Error: ${err.message}`);
    }
  }
}

main().catch(console.error);
