import { providerProfiles } from "./profiles.js";
import { startAgentServers } from "./httpServer.js";

const args = process.argv.slice(2);
const agentArg = args.find(a => a.startsWith("--agent="));
const taskIdArg = args.find(a => a.startsWith("--taskId="));

if (!agentArg && !taskIdArg) {
  // If no arguments are provided, start the x402 HTTP servers
  startAgentServers();
} else if (!agentArg || !taskIdArg) {
  const keys = Object.keys(providerProfiles).join("|");
  console.log(`Usage for CLI task execution: node cli.js --agent=[${keys}] --taskId=[id]`);
  console.log("Or run without arguments to start the x402 HTTP servers.");
  process.exit(1);
} else {
  const agentKey = agentArg.split("=")[1];
  const taskId = BigInt(taskIdArg.split("=")[1]);

  console.log(`CLI invoking Agent: ${agentKey} for Task: ${taskId}...`);

  const profile = providerProfiles[agentKey];
  if (!profile) {
    console.error(`Unknown agent key: ${agentKey}`);
    process.exit(1);
  }

  try {
    const output = await profile.execute(taskId);
    console.log(`\nSuccess! Output:`);
    console.log(output);
    process.exit(0);
  } catch (err: any) {
    console.error(`CLI execution failed:`, err.message);
    process.exit(1);
  }
}