import { describe, it, expect } from "vitest";
import { compareAbis } from "./comparator.js";
import type { Abi } from "../types.js";

const fnA = {
  type: "function" as const,
  name: "registerOperator",
  inputs: [
    { name: "publicKey", type: "bytes" },
    { name: "fee", type: "uint256" },
  ],
  outputs: [{ name: "", type: "uint64" }],
  stateMutability: "nonpayable" as const,
};

const fnB = {
  type: "function" as const,
  name: "removeOperator",
  inputs: [{ name: "operatorId", type: "uint64" }],
  outputs: [],
  stateMutability: "nonpayable" as const,
};

const evtA = {
  type: "event" as const,
  name: "OperatorAdded",
  inputs: [
    { name: "operatorId", type: "uint64", indexed: true },
    { name: "owner", type: "address", indexed: true },
  ],
};

describe("compareAbis", () => {
  it("reports equal for identical ABIs", () => {
    const result = compareAbis([fnA, evtA] as Abi, [fnA, evtA] as Abi);
    expect(result.isEqual).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
  });

  it("reports equal regardless of order", () => {
    const result = compareAbis([evtA, fnA] as Abi, [fnA, evtA] as Abi);
    expect(result.isEqual).toBe(true);
  });

  it("detects missing entries (in remote but not local)", () => {
    const result = compareAbis([fnA] as Abi, [fnA, fnB] as Abi);
    expect(result.isEqual).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].name).toBe("removeOperator");
    expect(result.missing[0].signature).toBe(
      "function removeOperator(uint64 operatorId)",
    );
  });

  it("detects extra entries (in local but not remote)", () => {
    const result = compareAbis([fnA, fnB] as Abi, [fnA] as Abi);
    expect(result.isEqual).toBe(false);
    expect(result.extra).toHaveLength(1);
    expect(result.extra[0].name).toBe("removeOperator");
  });

  it("detects modified entries (same name, different signature)", () => {
    const modifiedFn = {
      ...fnA,
      inputs: [
        { name: "publicKey", type: "bytes" },
        { name: "fee", type: "uint256" },
        { name: "extra", type: "bool" },
      ],
    };
    const result = compareAbis([fnA] as Abi, [modifiedFn] as Abi);
    expect(result.isEqual).toBe(false);
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].name).toBe("registerOperator");
    expect(result.modified[0].local).toBe(
      "function registerOperator(bytes publicKey, uint256 fee) returns (uint64)",
    );
    expect(result.modified[0].remote).toBe(
      "function registerOperator(bytes publicKey, uint256 fee, bool extra) returns (uint64)",
    );
  });
});
