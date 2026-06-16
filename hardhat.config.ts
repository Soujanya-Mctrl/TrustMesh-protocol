import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

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
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    local_l1: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:9650/ext/bc/YOUR_BLOCKCHAIN_ID/rpc", // Replace YOUR_BLOCKCHAIN_ID with your subnet blockchain ID
      chainId: 12345, // Replace with your configured Chain ID
      accounts: ["0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027"], // Default pre-funded developer account in avalanche-cli
    },
  },
});
