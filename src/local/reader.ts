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
 * Parse the source file and find the first exported variable whose initializer
 * is an array literal that looks like an ABI.
 * Returns both the raw text of the array and the variable name.
 */
export function extractAbiArrayFromSource(filePath: string): {
  arrayText: string;
  variableName: string;
} {
  const project = new Project({ compilerOptions: { allowJs: true } });
  const sourceFile = project.addSourceFileAtPath(filePath);

  for (const varDecl of sourceFile.getVariableDeclarations()) {
    const initializer = varDecl.getInitializer();
    if (!initializer || initializer.getKind() !== SyntaxKind.ArrayLiteralExpression) {
      continue;
    }

    const text = initializer.getText();
    try {
      const parsed = parseArrayText(text);
      if (isAbiArray(parsed)) {
        return { arrayText: text, variableName: varDecl.getName() };
      }
    } catch {
      continue;
    }
  }

  // Also check `as const` or type-asserted arrays
  for (const varDecl of sourceFile.getVariableDeclarations()) {
    const initializer = varDecl.getInitializer();
    if (!initializer) continue;

    // Handle `[...] as const` or `[...] satisfies ...`
    const asExpr =
      initializer.getKind() === SyntaxKind.AsExpression ||
      initializer.getKind() === SyntaxKind.SatisfiesExpression
        ? initializer.getChildAtIndex(0)
        : null;

    if (
      asExpr &&
      asExpr.getKind() === SyntaxKind.ArrayLiteralExpression
    ) {
      const text = asExpr.getText();
      try {
        const parsed = parseArrayText(text);
        if (isAbiArray(parsed)) {
          return { arrayText: text, variableName: varDecl.getName() };
        }
      } catch {
        continue;
      }
    }
  }

  throw new Error(
    `No exported ABI array found in ${filePath}. ` +
      "Expected a variable declaration with an array literal containing ABI entries.",
  );
}

/**
 * Safely evaluate array literal text into a JS array.
 * Handles trailing commas, unquoted keys (JS object literal style), etc.
 */
function parseArrayText(text: string): unknown[] {
  const fn = new Function(`"use strict"; return (${text});`);
  const result = fn();
  if (!Array.isArray(result)) {
    throw new Error("Parsed expression is not an array");
  }
  return result;
}
