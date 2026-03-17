import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFile, copyFile, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readLocalAbi } from "./reader.js";
import { writeLocalAbi } from "./writer.js";
import type { Abi } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(__dirname, "__fixtures__");

const replacementAbi: Abi = [
  {
    type: "function",
    name: "liquidate",
    inputs: [{ name: "clusterOwner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "ClusterLiquidated",
    inputs: [{ name: "owner", type: "address", indexed: true }],
  },
];

describe("readLocalAbi", () => {
  it("reads a JSON ABI file", async () => {
    const abi = await readLocalAbi(resolve(fixtures, "sample.json"));
    expect(abi).toHaveLength(2);
    expect((abi[0] as { name: string }).name).toBe("registerOperator");
  });

  it("reads a TypeScript ABI file", async () => {
    const abi = await readLocalAbi(resolve(fixtures, "sample.ts"));
    expect(abi).toHaveLength(2);
    expect((abi[0] as { name: string }).name).toBe("registerOperator");
  });

  it("reads a TypeScript file with export default", async () => {
    const abi = await readLocalAbi(resolve(fixtures, "sample-default.ts"));
    expect(abi).toHaveLength(2);
    expect((abi[0] as { name: string }).name).toBe("registerOperator");
  });

  it("throws for a TS file without ABI array", async () => {
    await expect(readLocalAbi(resolve(fixtures, "not-abi.ts"))).rejects.toThrow(
      "No exported ABI array"
    );
  });
});

describe("writeLocalAbi", () => {
  const tmpJson = resolve(fixtures, "_tmp_write.json");
  const tmpTs = resolve(fixtures, "_tmp_write.ts");
  const tmpDefaultTs = resolve(fixtures, "_tmp_write_default.ts");

  beforeEach(async () => {
    await copyFile(resolve(fixtures, "sample.json"), tmpJson);
    await copyFile(resolve(fixtures, "sample.ts"), tmpTs);
    await copyFile(resolve(fixtures, "sample-default.ts"), tmpDefaultTs);
  });

  afterEach(async () => {
    await unlink(tmpJson).catch(() => {});
    await unlink(tmpTs).catch(() => {});
    await unlink(tmpDefaultTs).catch(() => {});
  });

  it("replaces a JSON file entirely", async () => {
    await writeLocalAbi(tmpJson, replacementAbi);
    const content = JSON.parse(await readFile(tmpJson, "utf-8"));
    expect(content).toHaveLength(2);
    expect(content[0].name).toBe("liquidate");
  });

  it("replaces only the ABI array in a TS file, keeping other data intact", async () => {
    await writeLocalAbi(tmpTs, replacementAbi);
    const content = await readFile(tmpTs, "utf-8");
    expect(content).toContain("export const ssvNetworkAbi =");
    expect(content).toContain('"liquidate"');
    expect(content).toContain("as const");
    expect(content).not.toContain("registerOperator");
    expect(content).toContain("someRandomData");
    expect(content).toContain("moreRandomData");
    expect(content).toContain('"bar"');
  });

  it("replaces the array in a TS file with export default", async () => {
    await writeLocalAbi(tmpDefaultTs, replacementAbi);
    const content = await readFile(tmpDefaultTs, "utf-8");
    expect(content).toContain("export default");
    expect(content).toContain('"liquidate"');
    expect(content).not.toContain("registerOperator");
  });
});
