import assert from "node:assert/strict";
import { describe, it } from "node:test";

import hre from "hardhat";

describe("Hardhat setup", async function () {
  const { viem } = await hre.network.getOrCreate();

  it("deploys and writes through viem", async function () {
    const setupCheck = await viem.deployContract("SetupCheck");

    await setupCheck.write.setValue([42n]);

    assert.equal(await setupCheck.read.value(), 42n);
  });
});
