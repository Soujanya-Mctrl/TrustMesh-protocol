import { spawn } from "node:child_process";
import readline from "node:readline";

async function main() {
  console.log("=== Starting TrustMesh E2E Interactive Demo on Avalanche Fuji ===\n");
  
  console.log("📡 Starting specialist agent servers in the background...");
  
  // Start the agents CLI in the background, directing to Fuji testnet RPC
  const agentsProcess = spawn("node", ["--env-file=.env", "apps/agents/dist/cli.js"], {
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, RPC_URL: "https://api.avax-test.network/ext/bc/C/rpc" }
  });

  // Read stdout to wait for HTTP servers to finish starting up
  await new Promise((resolve) => {
    agentsProcess.stdout.on("data", (data) => {
      const output = data.toString();
      process.stdout.write(output);
      if (output.includes("SuspiciousAgent")) {
        resolve(null);
      }
    });
  });

  console.log("\n✅ Specialist agent servers are ready and listening.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askPrompt = () => {
    rl.question("\n📝 Enter your custom goal prompt for the TrustMesh orchestrator (or type 'exit' to quit):\n> ", (answer) => {
      const goal = answer.trim();
      if (goal.toLowerCase() === "exit") {
        console.log("\nStopping agent servers and exiting...");
        agentsProcess.kill();
        rl.close();
        process.exit(0);
      }

      if (!goal) {
        console.log("Prompt cannot be empty. Please enter a valid goal.");
        askPrompt();
        return;
      }

      console.log(`\n🚀 Executing orchestrator with custom goal: "${goal}" on Fuji C-Chain...\n`);

      // Spawn the orchestrator CLI with the user's custom goal
      const orchestratorProcess = spawn("node", [
        "--env-file=.env",
        "apps/orchestrator/dist/cli.js",
        `--goal=${goal}`
      ], {
        stdio: "inherit",
        env: { ...process.env, RPC_URL: "https://api.avax-test.network/ext/bc/C/rpc" }
      });

      orchestratorProcess.on("close", (code) => {
        console.log(`\n--------------------------------------------------`);
        console.log(`Orchestrator execution completed (exit code: ${code}).`);
        console.log(`--------------------------------------------------`);
        askPrompt(); // Ask for another prompt
      });
    });
  };

  askPrompt();

  // Cleanup child processes on terminal interrupt
  process.on("SIGINT", () => {
    console.log("\nTerminating background agent servers...");
    agentsProcess.kill();
    process.exit(0);
  });
}

main().catch(console.error);
