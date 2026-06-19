import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  console.log("\n🏔️ Auto-detecting local Avalanche L1 subnet...");
  
  let blockchainId = "";
  try {
    const res = await fetch("http://127.0.0.1:9650/ext/bc/P", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "platform.getBlockchains",
        params: {}
      })
    });
    
    const data = await res.json();
    if (data.result && data.result.blockchains) {
      // Find custom blockchain named "trustmesh"
      const target = data.result.blockchains.find(b => b.name === "trustmesh");
      if (target) {
        blockchainId = target.id;
      }
    }
  } catch (err) {
    console.error("❌ Failed to connect to local Avalanche node at http://127.0.0.1:9650.");
    console.log("👉 Please make sure your local L1 sandbox is deployed and running by executing:");
    console.log("   avalanche blockchain deploy trustmesh");
    process.exit(1);
  }
  
  if (!blockchainId) {
    console.error("❌ Subnet blockchain named 'trustmesh' not found running on the local node.");
    console.log("👉 Please create and deploy it first:");
    console.log("   1. avalanche blockchain create trustmesh --evm --latest");
    console.log("   2. avalanche blockchain deploy trustmesh");
    process.exit(1);
  }
  
  console.log(`✅ Found running local L1 subnet "trustmesh"`);
  console.log(`🔗 Blockchain ID: ${blockchainId}`);
  
  const rpcUrl = `http://127.0.0.1:9650/ext/bc/${blockchainId}/rpc`;
  console.log(`🌐 RPC URL: ${rpcUrl}`);
  
  // Read and update the .env file
  const envPath = resolve(process.cwd(), ".env");
  let envContent = "";
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf8");
  }
  
  // Filter existing keys and append new ones
  const lines = envContent.split("\n");
  const newLines = lines.filter(line => 
    !line.startsWith("LOCAL_L1_RPC_URL=") && 
    !line.startsWith("LOCAL_L1_BLOCKCHAIN_ID=")
  );
  newLines.push(`LOCAL_L1_RPC_URL="${rpcUrl}"`);
  newLines.push(`LOCAL_L1_BLOCKCHAIN_ID="${blockchainId}"`);
  
  writeFileSync(envPath, newLines.join("\n").trim() + "\n", "utf8");
  console.log("📝 Successfully updated .env with L1 RPC details.");
  
  // Run Hardhat contract deployment
  console.log("\n🚀 Deploying smart contracts to local L1 subnet...");
  const deployResult = spawnSync("npx", ["hardhat", "run", "scripts/deploy.ts", "--network", "local_l1"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, LOCAL_L1_RPC_URL: rpcUrl }
  });
  
  if (deployResult.status !== 0) {
    console.error("❌ Smart contract deployment failed.");
    process.exit(1);
  }
  
  // Run Hardhat seeding script
  console.log("\n🌱 Seeding database fixtures on local L1 subnet...");
  const seedResult = spawnSync("npx", ["hardhat", "run", "scripts/seed.ts", "--network", "local_l1"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, LOCAL_L1_RPC_URL: rpcUrl }
  });
  
  if (seedResult.status !== 0) {
    console.error("❌ Seeding failed.");
    process.exit(1);
  }
  
  console.log("\n==================================================");
  console.log("🎉 Local L1 Sandbox successfully deployed & seeded!");
  console.log("==================================================");
  console.log("To run agents and orchestrator on your local L1, configure your environment:");
  console.log(`  FUJI_RPC_URL="${rpcUrl}"`);
  console.log(`  DEPLOYER_PRIVATE_KEY="0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027"`);
  console.log("\nThen run:");
  console.log("  npm run agents");
  console.log("  npm run orchestrator -- --scenario=all");
}

main().catch(console.error);
