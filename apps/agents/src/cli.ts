import { executeDataFeedPro } from "./dataFeedPro.js";
import { executeNewService } from "./newService.js";
import { executeSuspiciousAgent } from "./suspiciousAgent.js";
import { startAgentServers } from "./httpServer.js";

const args = process.argv.slice(2);
const agentArg = args.find(a => a.startsWith("--agent="));
const taskIdArg = args.find(a => a.startsWith("--taskId="));

if (!agentArg && !taskIdArg) {
  // If no arguments are provided, start the x402 HTTP servers
  startAgentServers();
} else if (!agentArg || !taskIdArg) {
  console.log("Usage for CLI task execution: node cli.js --agent=[dataFeedPro|newService|suspiciousAgent] --taskId=[id]");
  console.log("Or run without arguments to start the x402 HTTP servers.");
  process.exit(1);
} else {
  const agentKey = agentArg.split("=")[1];
  const taskId = BigInt(taskIdArg.split("=")[1]);

  console.log(`CLI invoking Agent: ${agentKey} for Task: ${taskId}...`);

  try {
    let output = "";
    if (agentKey === "dataFeedPro") {
      output = await executeDataFeedPro(taskId);
    } else if (agentKey === "newService") {
      output = await executeNewService(taskId);
    } else if (agentKey === "suspiciousAgent") {
      output = await executeSuspiciousAgent(taskId);
    } else {
      console.error(`Unknown agent key: ${agentKey}`);
      process.exit(1);
    }
    console.log(`\nSuccess! Output:`);
    console.log(output);
    process.exit(0);
  } catch (err: any) {
    console.error(`CLI execution failed:`, err.message);
    process.exit(1);
  }
}