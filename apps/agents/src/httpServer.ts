import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, http as viemHttp, keccak256, toBytes } from "viem";
import { hardhat } from "viem/chains";
import { providerProfiles } from "./profiles.js";
import { generateAIContent } from "./server.js";

const rpcUrl = "http://127.0.0.1:8545";
const publicClient = createPublicClient({
  chain: hardhat,
  transport: viemHttp(rpcUrl),
});

// Start an HTTP server for a specific agent provider profile
function startServer(port: number, agentKey: string) {
  const profile = providerProfiles[agentKey];
  if (!profile) {
    console.error(`Profile not found for agent key: ${agentKey}`);
    return;
  }

  const server = http.createServer(async (req, res) => {
    // Enable CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/request-service") {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          const serviceRequest = payload.serviceRequest;

          if (!serviceRequest) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing serviceRequest object in body" }));
            return;
          }

          const { type, prompt } = serviceRequest;

          // 1. Quote endpoint (returns deliverable hash for committed escrow)
          if (type === "quote") {
            const deliverableHash = keccak256(toBytes(prompt || "default"));
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ deliverableHash }));
            return;
          }

          // 2. Simulation endpoint (returns 402 challenge)
          if (type === "simulation") {
            const challenge = {
              error: "Payment required",
              x402Version: 1,
              accepts: [
                {
                  amount: profile.serviceFee,
                  recipient: profile.walletAddress,
                }
              ]
            };
            res.writeHead(402, { "Content-Type": "application/json" });
            res.end(JSON.stringify(challenge));
            return;
          }

          // 3. Execution endpoint (verifies X-PAYMENT header proof and delivers AI content)
          if (type === "execute") {
            const paymentHeaderStr = req.headers["x-payment"];
            if (!paymentHeaderStr) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing X-PAYMENT header" }));
              return;
            }

            let paymentHeader: any;
            try {
              paymentHeader = JSON.parse(paymentHeaderStr as string);
            } catch {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Invalid JSON format in X-PAYMENT header" }));
              return;
            }

            const { txHash } = paymentHeader;
            if (!txHash) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing txHash in X-PAYMENT header" }));
              return;
            }

            // Verify payment transaction details on-chain
            console.log(`[${profile.name}] Verifying payment tx: ${txHash}...`);
            let tx: any;
            try {
              tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
            } catch (err) {
              res.writeHead(402, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: `Transaction ${txHash} not found on-chain` }));
              return;
            }

            // Resolve target addresses dynamically
            let deployed: any;
            try {
              const path = resolve(process.cwd(), "deployed-addresses.json");
              deployed = JSON.parse(readFileSync(path, "utf8"));
            } catch {
              try {
                const path = resolve(process.cwd(), "../../deployed-addresses.json");
                deployed = JSON.parse(readFileSync(path, "utf8"));
              } catch {}
            }

            const escrowVaultAddress = deployed?.contracts?.EscrowVault?.toLowerCase();
            const toAddress = tx.to?.toLowerCase();
            const expectedPayee = profile.walletAddress.toLowerCase();

            const isValidRecipient = 
              toAddress === expectedPayee || 
              (escrowVaultAddress && toAddress === escrowVaultAddress);

            if (!isValidRecipient) {
              res.writeHead(402, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Transaction recipient is not authorized for this agent" }));
              return;
            }

            const expectedFee = BigInt(profile.serviceFee);
            if (tx.value < expectedFee) {
              res.writeHead(402, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: `Insufficient payment value. Expected at least ${expectedFee} wei.` }));
              return;
            }

            console.log(`[${profile.name}] Payment tx verified successfully!`);

            // Generate AI output
            const systemInstruction = 
              agentKey === "dataFeedPro" 
                ? "You are DataFeed Pro, a premium DeFi and market analysis oracle."
                : agentKey === "newService"
                ? "You are NewService, a professional translation and localization assistant."
                : "You are SuspiciousAgent, a high-frequency trading bot and arbitrage scanner.";

            const output = await generateAIContent(profile.name, prompt || "", systemInstruction);
            const deliverableHash = keccak256(toBytes(output));

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ output, deliverableHash }));
            return;
          }

          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Unsupported serviceRequest type: ${type}` }));

        } catch (err: any) {
          console.error(`[${profile.name}] Server execution error:`, err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message || "Internal server error" }));
        }
      });
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });

  server.listen(port, () => {
    console.log(`📡 [${profile.name}] x402 Server listening on http://localhost:${port}/request-service`);
  });

  return server;
}

export function startAgentServers() {
  console.log("=== Starting x402 Agent Provider HTTP Servers ===\n");
  startServer(3001, "dataFeedPro");
  startServer(3002, "newService");
  startServer(3003, "suspiciousAgent");
}
