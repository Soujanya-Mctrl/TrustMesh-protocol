import hre from "hardhat";
import { parseAbi } from "viem";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  const net = await hre.network.getOrCreate();
  const { viem } = net;
  const publicClient = await viem.getPublicClient();

  const deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
  const taskAgentAddress = deployed.contracts.TaskAgent_DataFeedPro;

  console.log(`Querying owner for TaskAgent at: ${taskAgentAddress}`);

  const ABI = parseAbi(["function owner() view returns (address)"]);

  try {
    const owner = await publicClient.readContract({
      address: taskAgentAddress,
      abi: ABI,
      functionName: "owner",
    });
    console.log(`Contract Owner: ${owner}`);
  } catch (e: any) {
    console.error(`Error querying owner: ${e.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
