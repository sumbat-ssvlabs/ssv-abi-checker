import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { Project, SyntaxKind } from "ts-morph";
import type { Abi } from "../types.js";
import { isAbiArray, validateAbi } from "./abi-detector.js";

export async function readLocalAbi(filePath: string): Promise<Abi> {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".json":
      return readJsonAbi(filePath);
    case ".ts":
    case ".js":
      return readTsJsAbi(filePath);
    default:
      throw new Error(`Unsupported file extension: ${ext}. Use .json, .ts, or .js`);
  }
}

async function readJsonAbi(filePath: string): Promise<Abi> {
  const raw = await readFile(filePath, "utf-8");
  const data = JSON.parse(raw);
  return validateAbi(data);
}

async function readTsJsAbi(filePath: string): Promise<Abi> {
  const { arrayText } = extractAbiArrayFromSource(filePath);
  const parsed = parseArrayText(arrayText);
  return validateAbi(parsed);
}

/**
 * Walks the AST to find the first ArrayLiteralExpression that is a valid ABI.
 * Works with any structure: named exports, default exports, as const, satisfies, etc.
 */
export function extractAbiArrayFromSource(filePath: string): {
  arrayText: string;
  variableName: string;
} {
  const project = new Project({ compilerOptions: { allowJs: true } });
  const sourceFile = project.addSourceFileAtPath(filePath);

  const abiNode = sourceFile.getFirstDescendant((node) => {
    if (node.getKind() !== SyntaxKind.ArrayLiteralExpression) return false;
    try {
      const parsed = parseArrayText(node.getText());
      return isAbiArray(parsed);
    } catch {
      return false;
    }
  });

  if (!abiNode) {
    throw new Error(
      `No exported ABI array found in ${filePath}. ` +
        "Expected an array literal containing ABI entries.",
    );
  }

  return { arrayText: abiNode.getText(), variableName: "abi" };
}

function parseArrayText(text: string): unknown[] {
  const fn = new Function(`"use strict"; return (${text});`);
  const result = fn();
  if (!Array.isArray(result)) {
    throw new Error("Parsed expression is not an array");
  }
  return result;
}
