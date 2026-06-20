import { useEffect, useState, useRef } from "react";
import { 
  createPublicClient, 
  webSocket, 
  parseAbi, 
  type PublicClient 
} from "viem";
import { avalancheFuji, hardhat } from "viem/chains";

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: "evaluated" | "created" | "released" | "escalated" | "resolved";
  agentName: string;
  message: string;
}

export interface ProviderCard {
  id: number;
  key: string;
  name: string;
  address: `0x${string}`;
  score: number;
  tier: number;
  status: string;
  sybilFlagged: boolean;
  balance?: string;
  description?: string;
  capabilities?: string[];
  registrationAge?: string;
}

export interface Escalation {
  hash: `0x${string}`;
  agentId: number;
  agentName: string;
  score: number;
  sybilFlagged: boolean;
  isComplete: boolean;
}

const AGENTS_METADATA = [
  {
    id: 1,
    key: "dataFeedPro",
    name: "DataFeed Pro",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`
  },
  {
    id: 2,
    key: "newService",
    name: "NewService",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as `0x${string}`
  },
  {
    id: 3,
    key: "suspiciousAgent",
    name: "SuspiciousAgent",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as `0x${string}`
  },
  {
    id: 4,
    key: "priceOracle",
    name: "PriceOracle",
    address: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65" as `0x${string}`
  },
  {
    id: 5,
    key: "summaryBot",
    name: "SummaryBot",
    address: "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc" as `0x${string}`
  },
  {
    id: 6,
    key: "riskAssessor",
    name: "RiskAssessor",
    address: "0x976ea74026e726554db657fa54763abd0c3a0aa9" as `0x${string}`
  },
  {
    id: 7,
    key: "codeAuditor",
    name: "CodeAuditor",
    address: "0x14dc79964da2c08b23698b3d3cc7ca32193d9955" as `0x${string}`
  },
  {
    id: 8,
    key: "onChainIndexer",
    name: "OnChainIndexer",
    address: "0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f" as `0x${string}`
  }
];

const PolicyEngineABI = parseAbi([
  "event PaymentRouted(address indexed payer, address indexed payee, uint8 tier, uint256 amountAvax)",
  "event HumanReviewRequired(bytes32 indexed jobId, address indexed provider, uint256 amount, uint256 trustScore, bool sybilFlagged)"
]);

const EscrowVaultABI = parseAbi([
  "event EscrowReleased(uint256 indexed escrowId, address indexed payee, uint256 amount)",
  "function escrows(uint256 escrowId) external view returns (address payer, address payee, uint256 amount, bytes32 expectedHash, uint64 createdAt, uint8 state)"
]);

const ValidationRegistryABI = parseAbi([
  "event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)",
  "event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)"
]);

export function useTrustMeshEvents(deployed: any) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [activeEscalation, setActiveEscalation] = useState<Escalation | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const clientRef = useRef<any>(null);

  // Initialize providers list
  useEffect(() => {
    if (!deployed) return;

    // Load initial score state
    async function loadScores() {
      try {
        const isFuji = !deployed.network || deployed.network === "fuji";
        const chain = isFuji ? avalancheFuji : hardhat;
        const wsUrl = isFuji ? "wss://api.avax-test.network/ext/bc/C/ws" : "ws://127.0.0.1:8545";
        const client = createPublicClient({
          chain,
          transport: webSocket(wsUrl)
        });

        const initialProviders = await Promise.all(
          AGENTS_METADATA.map(async (agent) => {
            let score = 100;
            let sybilFlagged = false;
            let tier = 0;
            let balance = "0.0000";
            let description = "";
            let capabilities: string[] = [];
            let registrationAge = "N/A";

            try {
              const cached = await client.readContract({
                address: deployed.contracts.TrustRegistry,
                abi: parseAbi([
                  "function getCachedScore(address agentAddress) external view returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)"
                ]),
                functionName: "getCachedScore",
                args: [agent.address],
              }) as any;

              score = Number(cached[0]);
              sybilFlagged = cached[2];
              
              if (score >= 70) tier = 0;
              else if (score >= 40) tier = 1;
              else tier = 2;

              const balWei = await client.getBalance({ address: agent.address });
              balance = (Number(balWei) / 1e18).toFixed(4);

              // Read registration time
              const regTime = await client.readContract({
                address: deployed.contracts.AgentIdentityRegistry,
                abi: parseAbi([
                  "function getRegistrationTime(uint256 agentId) external view returns (uint256)"
                ]),
                functionName: "getRegistrationTime",
                args: [BigInt(agent.id)],
              }) as bigint;

              if (regTime > 0n) {
                const ageSecs = Math.floor(Date.now() / 1000) - Number(regTime);
                const ageDays = Math.max(0, Math.floor(ageSecs / 86400));
                registrationAge = `${ageDays} days`;
              }

              // Read tokenURI
              const uri = await client.readContract({
                address: deployed.contracts.AgentIdentityRegistry,
                abi: parseAbi([
                  "function tokenURI(uint256 tokenId) external view returns (string memory)"
                ]),
                functionName: "tokenURI",
                args: [BigInt(agent.id)],
              }) as string;

              if (uri.startsWith("data:application/json;base64,")) {
                const base64Str = uri.slice("data:application/json;base64,".length);
                const jsonStr = atob(base64Str);
                const metaData = JSON.parse(jsonStr);
                description = metaData.description || "";
                capabilities = metaData.capabilities || [];
              } else if (uri.startsWith("http") || uri.startsWith("ipfs://")) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                try {
                  const httpUrl = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
                  const metaRes = await fetch(httpUrl, { signal: controller.signal });
                  const metaData = await metaRes.json();
                  description = metaData.description || "";
                  capabilities = metaData.capabilities || [];
                } catch {
                } finally {
                  clearTimeout(timeoutId);
                }
              }
            } catch {}

            return {
              ...agent,
              score,
              tier,
              status: "Idle",
              sybilFlagged,
              balance,
              description,
              capabilities,
              registrationAge
            };
          })
        );
        setProviders(initialProviders);
      } catch {
        // Fallback to defaults
        setProviders(AGENTS_METADATA.map(a => {
          const score = 
            a.id === 1 ? 92 :
            a.id === 2 ? 55 :
            a.id === 3 ? 22 :
            a.id === 4 ? 88 :
            a.id === 5 ? 64 :
            a.id === 6 ? 78 :
            a.id === 7 ? 95 : 82;
          const tier = score >= 70 ? 0 : score >= 40 ? 1 : 2;
          const caps: Record<number, string[]> = {
            1: ["data-feed", "analytics", "real-time-pricing"],
            2: ["translation", "summarization", "nlp"],
            3: ["sandbox-exec", "unknown"],
            4: ["price-oracle", "defi-rates", "arbitrage"],
            5: ["summarize", "newsletter", "formatting"],
            6: ["risk-check", "anomalies", "scoring"],
            7: ["audit", "compliance", "report"],
            8: ["indexing", "subnet-telemetry", "data-sync"]
          };
          const descs: Record<number, string> = {
            1: "High-trust weather and financial oracle feed with optimized direct routing.",
            2: "Custom translation and analytics models with escrow payment security.",
            3: "Anomalous execution sandbox agent subject to manual policy review.",
            4: "Low-fee price oracle providing fast asset pricing rates.",
            5: "Automated summarization and document formatting assistant.",
            6: "On-chain risk analyzer and counterparty scanner.",
            7: "Professional Solidity smart contract security auditor.",
            8: "Avalanche subnet state indexer and data compiler."
          };
          return { 
            ...a, 
            score, 
            tier, 
            status: "Idle", 
            sybilFlagged: a.id === 3,
            balance: "10.0000",
            description: descs[a.id] || "",
            capabilities: caps[a.id] || [],
            registrationAge: a.id === 1 ? "300 days" : a.id === 2 ? "63 days" : a.id === 3 ? "180 days" : "150 days"
          };
        }));
      }
    }

    loadScores();
  }, [deployed]);

  useEffect(() => {
    if (!deployed) return;

    let unwatchPE: (() => void) | null = null;
    let unwatchEV: (() => void) | null = null;
    let unwatchVR: (() => void) | null = null;
    let unwatchVRReq: (() => void) | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      try {
        const isFuji = !deployed.network || deployed.network === "fuji";
        const chain = isFuji ? avalancheFuji : hardhat;
        const wsUrl = isFuji ? "wss://api.avax-test.network/ext/bc/C/ws" : "ws://127.0.0.1:8545";
        console.log(`🔌 Connecting to ${isFuji ? "Avalanche Fuji" : "Localhost"} WebSocket C-Chain...`);
        
        const client = createPublicClient({
          chain,
          transport: webSocket(wsUrl, {
            reconnect: {
              attempts: 10,
              delay: 3000,
            }
          })
        });

        clientRef.current = client;
        setIsConnected(true);

        // helper to get agent details by payee address
        const getAgent = (addr: string) => {
          return AGENTS_METADATA.find(a => a.address.toLowerCase() === addr.toLowerCase()) 
            || { name: "Unknown Provider", id: 0 };
        };

        // 1. Listen to PolicyEngine.PaymentRouted
        unwatchPE = client.watchContractEvent({
          address: deployed.contracts.PolicyEngine,
          abi: PolicyEngineABI,
          eventName: "PaymentRouted",
          onLogs: (logs: any) => {
            logs.forEach((log: any) => {
              const { payee, tier } = log.args;
              const agent = getAgent(payee);
              
              setProviders(prev => prev.map(p => {
                if (p.address.toLowerCase() === payee.toLowerCase()) {
                  return {
                    ...p,
                    status: tier === 1 ? "Securing funds" : tier === 0 ? "Payment confirmed ✓" : "Validation pending"
                  };
                }
                return p;
              }));

              const id = `pe-${Date.now()}-${Math.random()}`;
              const newEvent: ActivityEvent = {
                id,
                timestamp: Date.now(),
                type: "evaluated",
                agentName: agent.name,
                message: `Payment evaluated for ${agent.name}`
              };

              setEvents(prev => [newEvent, ...prev].slice(0, 10));
            });
          }
        });

        // 2. Listen to EscrowVault.EscrowReleased
        unwatchEV = client.watchContractEvent({
          address: deployed.contracts.EscrowVault,
          abi: EscrowVaultABI,
          eventName: "EscrowReleased",
          onLogs: (logs: any) => {
            logs.forEach((log: any) => {
              const { payee } = log.args;
              if (!payee) return;
              const agent = getAgent(payee);

              setProviders(prev => prev.map(p => {
                if (p.address.toLowerCase() === payee.toLowerCase()) {
                  return { ...p, status: "Payment confirmed ✓" };
                }
                return p;
              }));

              const id = `ev-${Date.now()}-${Math.random()}`;
              const newEvent: ActivityEvent = {
                id,
                timestamp: Date.now(),
                type: "released",
                agentName: agent.name,
                message: `Payment confirmed for ${agent.name}`
              };

              setEvents(prev => [newEvent, ...prev].slice(0, 10));
            });
          }
        });

        // 3. Listen to PolicyEngine.HumanReviewRequired
        client.watchContractEvent({
          address: deployed.contracts.PolicyEngine,
          abi: PolicyEngineABI,
          eventName: "HumanReviewRequired",
          onLogs: (logs: any) => {
            logs.forEach((log: any) => {
              const { jobId, provider, trustScore, sybilFlagged } = log.args;
              const agent = getAgent(provider);

              setActiveEscalation({
                hash: jobId,
                agentId: agent.id,
                agentName: agent.name,
                score: Number(trustScore),
                sybilFlagged: !!sybilFlagged,
                isComplete: false
              });

              const id = `hr-${Date.now()}-${Math.random()}`;
              const newEvent: ActivityEvent = {
                id,
                timestamp: Date.now(),
                type: "escalated",
                agentName: agent.name,
                message: `Review required for ${agent.name}`
              };

              setEvents(prev => [newEvent, ...prev].slice(0, 10));
            });
          }
        });

        // 3.5 Listen to ValidationRegistry.ValidationRequest (For SDK-triggered events)
        unwatchVRReq = client.watchContractEvent({
          address: deployed.contracts.ValidationRegistry,
          abi: ValidationRegistryABI,
          eventName: "ValidationRequest",
          onLogs: async (logs: any) => {
            for (const log of logs) {
              const { agentId, requestHash } = log.args;
              const agentMeta = AGENTS_METADATA.find(a => BigInt(a.id) === BigInt(agentId));
              if (!agentMeta) continue;

              let score = 22;
              let sybilFlagged = true;

              try {
                const cached = await client.readContract({
                  address: deployed.contracts.TrustRegistry,
                  abi: parseAbi([
                    "function getCachedScore(address agentAddress) external view returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)"
                  ]),
                  functionName: "getCachedScore",
                  args: [agentMeta.address],
                }) as any;

                score = Number(cached[0]);
                sybilFlagged = cached[2];
              } catch {}

              setActiveEscalation({
                hash: requestHash,
                agentId: agentMeta.id,
                agentName: agentMeta.name,
                score,
                sybilFlagged,
                isComplete: false
              });

              const id = `vr-req-${Date.now()}-${Math.random()}`;
              const newEvent: ActivityEvent = {
                id,
                timestamp: Date.now(),
                type: "escalated",
                agentName: agentMeta.name,
                message: `Review required for ${agentMeta.name}`
              };

              setEvents(prev => [newEvent, ...prev].slice(0, 10));
            }
          }
        });

        // 4. Listen to ValidationRegistry.ValidationResponse
        unwatchVR = client.watchContractEvent({
          address: deployed.contracts.ValidationRegistry,
          abi: ValidationRegistryABI,
          eventName: "ValidationResponse",
          onLogs: (logs: any) => {
            logs.forEach((log: any) => {
              const { agentId, requestHash } = log.args;
              const agentMeta = AGENTS_METADATA.find(a => BigInt(a.id) === BigInt(agentId));
              const agentName = agentMeta?.name || "Agent";

              setActiveEscalation(prev => {
                if (prev && prev.hash === requestHash) {
                  return { ...prev, isComplete: true };
                }
                return prev;
              });

              const id = `vr-${Date.now()}-${Math.random()}`;
              const newEvent: ActivityEvent = {
                id,
                timestamp: Date.now(),
                type: "resolved",
                agentName,
                message: `Validation resolved for ${agentName}`
              };

              setEvents(prev => [newEvent, ...prev].slice(0, 10));
            });
          }
        });

      } catch (err) {
        console.error("WS Connection Failed, retrying in 3s...", err);
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (unwatchPE) unwatchPE();
      if (unwatchEV) unwatchEV();
      if (unwatchVR) unwatchVR();
      if (unwatchVRReq) unwatchVRReq();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };

  }, [deployed]);

  return {
    events,
    providers,
    activeEscalation,
    isConnected,
    setProviders
  };
}
