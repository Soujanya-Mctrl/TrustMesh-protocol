import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

describe("IdentityRegistry", async function () {
  it("registers an agent and mints an ERC-721 identity token", async function () {
    const { viem } = await hre.network.getOrCreate();
    const [deployer, agent] = await viem.getWalletClients();

    const registry = await viem.deployContract("IdentityRegistry", []);

    const agentURI = "ipfs://testAgent";

    // Register agent (using the agent wallet itself)
    const registryAsAgent = await viem.getContractAt(
      "IdentityRegistry",
      registry.address,
      { client: { wallet: agent } }
    );
    await registryAsAgent.write.register([agentURI]);

    // Check token ID
    const agentId = await registry.read.getAgentIdByWallet([agent.account.address]);
    assert.equal(Number(agentId), 1);

    // Check total agents
    const total = await registry.read.totalAgents([]);
    assert.equal(Number(total), 1);
  });

  it("returns correct registration time and supports overrides", async function () {
    const { viem } = await hre.network.getOrCreate();
    const [deployer, agent] = await viem.getWalletClients();

    const registry = await viem.deployContract("IdentityRegistry", []);

    const registryAsAgent = await viem.getContractAt(
      "IdentityRegistry",
      registry.address,
      { client: { wallet: agent } }
    );
    await registryAsAgent.write.register(["ipfs://testAgent"]);

    const agentId = await registry.read.getAgentIdByWallet([agent.account.address]);

    const regTime = BigInt(Math.floor(Date.now() / 1000) - 86400 * 100);
    await registry.write.setRegistrationTime([agentId, regTime]);

    const storedTime = await registry.read.getRegistrationTime([agentId]);
    assert.equal(storedTime, regTime);
  });
});
