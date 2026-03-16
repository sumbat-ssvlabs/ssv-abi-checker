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

  it("throws for a TS file without ABI array", async () => {
    await expect(readLocalAbi(resolve(fixtures, "not-abi.ts"))).rejects.toThrow(
      "No exported ABI array"
    );
  });
});

describe("writeLocalAbi", () => {
  const tmpJson = resolve(fixtures, "_tmp_write.json");
  const tmpTs = resolve(fixtures, "_tmp_write.ts");

  beforeEach(async () => {
    await copyFile(resolve(fixtures, "sample.json"), tmpJson);
    await copyFile(resolve(fixtures, "sample.ts"), tmpTs);
  });

  afterEach(async () => {
    await unlink(tmpJson).catch(() => {});
    await unlink(tmpTs).catch(() => {});
  });

  it("replaces a JSON file entirely", async () => {
    await writeLocalAbi(tmpJson, replacementAbi);
    const content = JSON.parse(await readFile(tmpJson, "utf-8"));
    expect(content).toHaveLength(2);
    expect(content[0].name).toBe("liquidate");
  });

  it("replaces only the array in a TS file", async () => {
    console.log("tmpTs:", tmpTs);
    console.log("replacementAbi:", replacementAbi);
    await writeLocalAbi(tmpTs, replacementAbi);
    const content = await readFile(tmpTs, "utf-8");
    console.log("content:", content);
    expect(content).toContain("export const ssvNetworkAbi =");
    expect(content).toContain('"liquidate"');
    expect(content).toContain("as const");
    expect(content).not.toContain("registerOperator");
  });
});
