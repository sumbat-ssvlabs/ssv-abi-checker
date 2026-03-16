import { describe, it, expect } from "vitest";
import { isAbiArray, validateAbi } from "./abi-detector.js";

const validAbi = [
  {
    type: "function" as const,
    name: "registerOperator",
    inputs: [
      { name: "publicKey", type: "bytes" },
      { name: "fee", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "nonpayable" as const,
  },
  {
    type: "event" as const,
    name: "OperatorAdded",
    inputs: [
      { name: "operatorId", type: "uint64", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
  {
    type: "constructor" as const,
    inputs: [],
    stateMutability: "nonpayable" as const,
  },
  {
    type: "error" as const,
    name: "CallerNotOwner",
    inputs: [],
  },
];

describe("isAbiArray", () => {
  it("returns true for a valid ABI array", () => {
    expect(isAbiArray(validAbi)).toBe(true);
  });

  it("returns false for an empty array", () => {
    expect(isAbiArray([])).toBe(false);
  });

  it("returns false for an array of random objects", () => {
    expect(isAbiArray([{ foo: "bar" }, { baz: 1 }])).toBe(false);
  });

  it("returns false for an array of strings", () => {
    expect(isAbiArray(["hello", "world"])).toBe(false);
  });

  it("returns false for non-ABI data", () => {
    expect(isAbiArray([{ type: "invalid_type", name: "x" }])).toBe(false);
  });
});

describe("validateAbi", () => {
  it("returns the array for valid ABI", () => {
    const result = validateAbi(validAbi);
    expect(result).toHaveLength(4);
  });

  it("throws if input is not an array", () => {
    expect(() => validateAbi({ type: "function" })).toThrow("not an array");
  });

  it("throws if the array is not a valid ABI", () => {
    expect(() => validateAbi([{ foo: "bar" }])).toThrow("does not appear");
  });
});
