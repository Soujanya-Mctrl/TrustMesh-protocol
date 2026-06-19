import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

try {
  process.loadEnvFile();
} catch (err: any) {
  if (err.code !== "ENOENT") {
    throw err;
  }
}

export default defineConfig({
  plugins: [hardhatToolboxViem],
  paths: {
    sources: "./contracts/src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    fuji: {
      type: "http",
      chainType: "l1",
      chainId: 43113,
      url: configVariable("FUJI_RPC_URL"),
      accounts: [
        configVariable("DEPLOYER_PRIVATE_KEY"),
        configVariable("DATAFEED_PRO_PRIVATE_KEY"),
        configVariable("NEW_SERVICE_PRIVATE_KEY"),
        configVariable("SUSPICIOUS_AGENT_PRIVATE_KEY"),
        configVariable("PRICE_ORACLE_PRIVATE_KEY"),
        configVariable("SUMMARY_BOT_PRIVATE_KEY"),
        configVariable("RISK_ASSESSOR_PRIVATE_KEY"),
        configVariable("CODE_AUDITOR_PRIVATE_KEY"),
        configVariable("ONCHAIN_INDEXER_PRIVATE_KEY"),
      ],
    },
    local_l1: {
      type: "http",
      chainType: "l1",
      url: process.env.LOCAL_L1_RPC_URL || "http://127.0.0.1:9650/ext/bc/YOUR_BLOCKCHAIN_ID/rpc",
      chainId: Number(process.env.LOCAL_L1_CHAIN_ID || 12345),
      accounts: [process.env.LOCAL_L1_PRIVATE_KEY || "0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027"],
    },
  },
});
