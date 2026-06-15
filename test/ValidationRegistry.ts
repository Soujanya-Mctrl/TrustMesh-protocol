import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

describe("ValidationRegistry", async function () {
  it("creates a validation request and resolves it", async function () {
    const { viem } = await hre.network.getOrCreate();
    const [deployer, agent, validator] = await viem.getWalletClients();

    const identityRegistry = await viem.deployContract("IdentityRegistry", []);
    const registry = await viem.deployContract("ValidationRegistry", [identityRegistry.address]);

    // Register agent
    await identityRegistry.write.register(["ipfs://testAgent"]);
    const agentId = 1n;

    // Request validation
    const taskHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`;
    await registry.write.validationRequest([
      validator.account.address,
      agentId, // agentId
      "ipfs://testRequest",
      taskHash
    ]);

    // Check completion status (should be false)
    let complete = await registry.read.isValidationComplete([taskHash]);
    assert.equal(complete, false);

    // Submit validation response as validator
    const registryAsValidator = await viem.getContractAt(
      "ValidationRegistry",
      registry.address,
      { client: { wallet: validator } },
    );

    const responseHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`;
    await registryAsValidator.write.validationResponse([
      taskHash,
      85, // response (e.g. 85/100)
      "ipfs://testResponse",
      responseHash,
      "tag1"
    ]);

    // Check completion status (should be true now)
    complete = await registry.read.isValidationComplete([taskHash]);
    assert.equal(complete, true);

    // Get validation status
    const status = await registry.read.getValidationStatus([taskHash]) as any;
    assert.equal(Number(status[2] ?? status.response), 85);
  });
});
