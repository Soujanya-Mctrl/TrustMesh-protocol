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
  description: string;
  iconType: string;
  serviceFee: string;
  serviceUrl: string;
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
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`,
    description: "High-frequency weather and financial oracle feed with optimized direct routing.",
    iconType: "radio",
    serviceFee: "1000000000000000",
    serviceUrl: "http://localhost:3001/request-service"
  },
  {
    id: 2,
    key: "newService",
    name: "NewService",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as `0x${string}`,
    description: "Custom translation and analytics models with escrow payment security.",
    iconType: "cpu",
    serviceFee: "2000000000000000",
    serviceUrl: "http://localhost:3002/request-service"
  },
  {
    id: 3,
    key: "suspiciousAgent",
    name: "SuspiciousAgent",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as `0x${string}`,
    description: "Anomalous execution sandbox agent subject to manual policy review.",
    iconType: "alert",
    serviceFee: "500000000000000",
    serviceUrl: "http://localhost:3003/request-service"
  },
  {
    id: 4,
    key: "priceOracle",
    name: "PriceOracle",
    address: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65" as `0x${string}`,
    description: "Low-fee price oracle providing fast asset pricing rates.",
    iconType: "trending",
    serviceFee: "800000000000000",
    serviceUrl: "http://localhost:3004/request-service"
  },
  {
    id: 5,
    key: "summaryBot",
    name: "SummaryBot",
    address: "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc" as `0x${string}`,
    description: "Automated summarization and document formatting assistant.",
    iconType: "sliders",
    serviceFee: "1200000000000000",
    serviceUrl: "http://localhost:3006/request-service"
  },
  {
    id: 6,
    key: "riskAssessor",
    name: "RiskAssessor",
    address: "0x976ea74026e726554db657fa54763abd0c3a0aa9" as `0x${string}`,
    description: "On-chain risk analyzer and counterparty scanner.",
    iconType: "shield",
    serviceFee: "1000000000000000",
    serviceUrl: "http://localhost:3007/request-service"
  },
  {
    id: 7,
    key: "codeAuditor",
    name: "CodeAuditor",
    address: "0x14dc79964da2c08b23698b3d3cc7ca32193d9955" as `0x${string}`,
    description: "Professional Solidity smart contract security auditor.",
    iconType: "terminal",
    serviceFee: "3000000000000000",
    serviceUrl: "http://localhost:3008/request-service"
  },
  {
    id: 8,
    key: "onChainIndexer",
    name: "OnChainIndexer",
    address: "0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f" as `0x${string}`,
    description: "Avalanche subnet state indexer and data compiler.",
    iconType: "search",
    serviceFee: "1500000000000000",
    serviceUrl: "http://localhost:3009/request-service"
  }
];

const PolicyEngineABI = parseAbi([
  "event PaymentRouted(address indexed payer, address indexed payee, uint8 tier, uint256 amountAvax)",
  "event HumanReviewRequired(bytes32 indexed jobId, address indexed provider, uint256 amount, uint256 trustScore, bool sybilFlagged)"
]);

const EscrowVaultABI = parseAbi([
  "event EscrowCreated(uint256 indexed escrowId, address indexed payer, address indexed payee, uint256 amount, bytes32 expectedHash)",
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

  // Bottom strip payment flows state
  const [latestDirectPay, setLatestDirectPay] = useState<any>({
    agentName: "DataFeed Pro",
    amount: "0.001 AVAX",
    txHash: "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
  });
  const [latestEscrow, setLatestEscrow] = useState<any>({
    escrowId: "#3",
    agentName: "NewService",
    amount: "0.002 AVAX",
  });
  const [latestValidation, setLatestValidation] = useState<any>({
    agentName: "SuspiciousAgent",
    status: "Pending approval",
    taskHash: "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
  });

  // Initialize providers list
  useEffect(() => {
    if (!deployed) return;

    async function loadScores() {
      try {
        const isFuji = !deployed.network || deployed.network === "fuji";
        const chain = isFuji ? avalancheFuji : hardhat;
        const wsUrl = isFuji ? "wss://api.avax-test.network/ext/bc/C/ws" : "ws://127.0.0.1:8545";
        const client = createPublicClient({
          chain,
          transport: webSocket(wsUrl)
        });

        let dynamicProviders: ProviderCard[] = [];
        try {
          const totalBig = await client.readContract({
            address: deployed.contracts.AgentIdentityRegistry,
            abi: parseAbi(["function totalAgents() external view returns (uint256)"]),
            functionName: "totalAgents"
          }) as bigint;

          const total = Number(totalBig);
          if (total > 0) {
            const tempProviders = await Promise.all(
              Array.from({ length: total }, async (_, idx) => {
                const agentId = idx + 1;
                try {
                  const agentURI = await client.readContract({
                    address: deployed.contracts.AgentIdentityRegistry,
                    abi: parseAbi(["function tokenURI(uint256 tokenId) external view returns (string)"]),
                    functionName: "tokenURI",
                    args: [BigInt(agentId)]
                  }) as string;

                  const walletAddress = await client.readContract({
                    address: deployed.contracts.AgentIdentityRegistry,
                    abi: parseAbi(["function getAgentWallet(uint256 agentId) external view returns (address)"]),
                    functionName: "getAgentWallet",
                    args: [BigInt(agentId)]
                  }) as `0x${string}`;

                  let decoded: any = null;
                  if (agentURI.startsWith("data:")) {
                    const base64Str = agentURI.split(",")[1];
                    const decodedStr = typeof window !== "undefined" && typeof window.atob === "function"
                      ? window.atob(base64Str)
                      : Buffer.from(base64Str, "base64").toString("binary");
                    decoded = JSON.parse(decodedStr);
                  } else if (agentURI.startsWith("ipfs://")) {
                    const ipfsHash = agentURI.replace("ipfs://", "");
                    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
                    decoded = await res.json();
                  }

                  if (!decoded || !decoded.name) {
                    throw new Error("Invalid metadata format");
                  }

                  let score = 100;
                  let sybilFlagged = false;
                  let tier = 0;

                  try {
                    const cached = await client.readContract({
                      address: deployed.contracts.TrustRegistry,
                      abi: parseAbi([
                        "function getCachedScore(address agentAddress) external view returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)"
                      ]),
                      functionName: "getCachedScore",
                      args: [walletAddress],
                    }) as any;

                    score = Number(cached[0]);
                    sybilFlagged = cached[2];
                    
                    if (score >= 70) tier = 0;
                    else if (score >= 40) tier = 1;
                    else tier = 2;
                  } catch {}

                  const serviceFee = decoded.serviceFee || decoded.services?.[0]?.serviceFee || "1000000000000000";
                  const serviceUrl = decoded.services?.[0]?.endpoint || decoded.serviceUrl || `http://localhost:${3000 + agentId}/request-service`;
                  
                  const iconType = 
                    decoded.name.toLowerCase().includes("feed") ? "radio" :
                    decoded.name.toLowerCase().includes("oracle") ? "trending" :
                    decoded.name.toLowerCase().includes("translate") ? "cpu" :
                    decoded.name.toLowerCase().includes("suspicious") ? "alert" :
                    decoded.name.toLowerCase().includes("bot") ? "sliders" :
                    decoded.name.toLowerCase().includes("risk") ? "shield" :
                    decoded.name.toLowerCase().includes("audit") ? "terminal" : "search";

                  return {
                    id: agentId,
                    key: decoded.name.replace(/\s+/g, "").toLowerCase(),
                    name: decoded.name,
                    address: walletAddress,
                    score,
                    tier,
                    status: "Idle",
                    sybilFlagged,
                    description: decoded.description,
                    iconType,
                    serviceFee,
                    serviceUrl
                  } as ProviderCard;

                } catch (err) {
                  const fallback = AGENTS_METADATA.find(a => a.id === agentId);
                  if (fallback) {
                    return {
                      ...fallback,
                      score: 100,
                      tier: 0,
                      status: "Idle",
                      sybilFlagged: false
                    } as ProviderCard;
                  }
                  throw err;
                }
              })
            );
            dynamicProviders = tempProviders.filter((p): p is ProviderCard => !!p);
          }
        } catch (err) {
          console.warn("Dynamic ERC-8004 metadata load failed, falling back to static metadata.", err);
        }

        if (dynamicProviders.length > 0) {
          setProviders(dynamicProviders);
        } else {
          // Fallback to static config
          const initialProviders = await Promise.all(
            AGENTS_METADATA.map(async (agent) => {
              let score = 100;
              let sybilFlagged = false;
              let tier = 0;

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
              } catch {}

              return {
                ...agent,
                score,
                tier,
                status: "Idle",
                sybilFlagged
              };
            })
          );
          setProviders(initialProviders);
        }
      } catch {
        // Fallback to defaults
        setProviders(
          AGENTS_METADATA.map((a) => {
            const score =
              a.id === 1 ? 92 :
              a.id === 2 ? 55 :
              a.id === 3 ? 22 :
              a.id === 4 ? 88 :
              a.id === 5 ? 64 :
              a.id === 6 ? 78 :
              a.id === 7 ? 95 : 82;
            const tier = score >= 70 ? 0 : score >= 40 ? 1 : 2;
            return {
              ...a,
              score,
              tier,
              status: "Idle",
              sybilFlagged: a.id === 3,
            };
          })
        );
      }
    }

    loadScores();
  }, [deployed]);

  useEffect(() => {
    if (!deployed) return;

    let unwatchPE: (() => void) | null = null;
    let unwatchEV: (() => void) | null = null;
    let unwatchEVCreated: (() => void) | null = null;
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
              const { payer, payee, tier, amountAvax } = log.args;
              const agent = getAgent(payee);
              const txHash = log.transactionHash;
              
              setProviders(prev => prev.map(p => {
                if (p.address.toLowerCase() === payee.toLowerCase()) {
                  return {
                    ...p,
                    status: tier === 1 ? "Securing funds" : tier === 0 ? "Payment confirmed ✓" : "Validation pending"
                  };
                }
                return p;
              }));

              if (tier === 0) {
                setLatestDirectPay({
                  agentName: agent.name,
                  amount: `${Number(amountAvax) / 1e18} AVAX`,
                  txHash: txHash || "0xabc...",
                });
              }

              const id = `pe-${Date.now()}-${Math.random()}`;
              const newEvent: ActivityEvent = {
                id,
                timestamp: Date.now(),
                type: "evaluated",
                agentName: agent.name,
                message: `Payment evaluated for ${agent.name} (Tier ${tier})`
              };

              setEvents(prev => [newEvent, ...prev].slice(0, 10));
            });
          }
        });

        // 2. Listen to EscrowVault.EscrowCreated
        unwatchEVCreated = client.watchContractEvent({
          address: deployed.contracts.EscrowVault,
          abi: EscrowVaultABI,
          eventName: "EscrowCreated",
          onLogs: (logs: any) => {
            logs.forEach((log: any) => {
              const { escrowId, payee, amount } = log.args;
              const agent = getAgent(payee);
              setLatestEscrow({
                escrowId: `#${escrowId.toString()}`,
                agentName: agent.name,
                amount: `${Number(amount) / 1e18} AVAX`,
              });
            });
          }
        });

        // 2.5 Listen to EscrowVault.EscrowReleased
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
                message: `Payment escrow released for ${agent.name}`
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

              setLatestValidation({
                agentName: agent.name,
                status: "Pending approval",
                taskHash: jobId,
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

        // 3.5 Listen to ValidationRegistry.ValidationRequest (For SDK/Orchestrator-triggered events)
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

              setLatestValidation({
                agentName: agentMeta.name,
                status: "Pending approval",
                taskHash: requestHash,
              });

              setProviders(prev => prev.map(p => {
                if (p.id === agentMeta.id) {
                  return { ...p, status: "Under Review" };
                }
                return p;
              }));

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
              const { agentId, requestHash, response } = log.args;
              const agentMeta = AGENTS_METADATA.find(a => BigInt(a.id) === BigInt(agentId));
              const agentName = agentMeta?.name || "Agent";

              setActiveEscalation(prev => {
                if (prev && prev.hash === requestHash) {
                  return { ...prev, isComplete: true };
                }
                return prev;
              });

              const decisionText = Number(response) === 0 ? "Rejected" : "Approved";
              setLatestValidation((prev: any) => {
                if (prev && prev.taskHash === requestHash) {
                  return {
                    ...prev,
                    status: decisionText,
                  };
                }
                return prev;
              });

              setProviders(prev => prev.map(p => {
                if (p.id === agentMeta?.id) {
                  return { ...p, status: decisionText === "Approved" ? "Completed" : "Rejected" };
                }
                return p;
              }));

              const id = `vr-${Date.now()}-${Math.random()}`;
              const newEvent: ActivityEvent = {
                id,
                timestamp: Date.now(),
                type: "resolved",
                agentName,
                message: `Validation resolved for ${agentName}: ${decisionText}`
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
      if (unwatchEVCreated) unwatchEVCreated();
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
    setProviders,
    latestDirectPay,
    latestEscrow,
    latestValidation
  };
}
