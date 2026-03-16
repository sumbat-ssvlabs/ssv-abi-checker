import { Abi as AbiSchema } from "abitype/zod";
import type { Abi } from "abitype";

export function isAbiArray(data: unknown): boolean {
  if (!Array.isArray(data) || data.length === 0) return false;
  try {
    return AbiSchema.safeParse(data).success;
  } catch {
    return false;
  }
}

export function validateAbi(data: unknown): Abi {
  if (!Array.isArray(data)) {
    throw new Error("ABI data is not an array");
  }
  const result = AbiSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Array does not appear to be a valid Ethereum ABI: ${result.error.issues[0]?.message ?? "unknown error"}`,
    );
  }
  return result.data;
}
