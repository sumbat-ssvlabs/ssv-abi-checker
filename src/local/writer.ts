import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { Project, SyntaxKind } from "ts-morph";
import type { Abi } from "../types.js";
import { isAbiArray } from "./abi-detector.js";

export async function writeLocalAbi(
  filePath: string,
  abi: Abi,
): Promise<void> {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".json":
      return writeJsonAbi(filePath, abi);
    case ".ts":
    case ".js":
      return writeTsJsAbi(filePath, abi);
    default:
      throw new Error(`Unsupported file extension: ${ext}. Use .json, .ts, or .js`);
  }
}

async function writeJsonAbi(filePath: string, abi: Abi): Promise<void> {
  await writeFile(filePath, JSON.stringify(abi, null, 2) + "\n", "utf-8");
}

async function writeTsJsAbi(filePath: string, abi: Abi): Promise<void> {
  const source = await readFile(filePath, "utf-8");
  const project = new Project({ compilerOptions: { allowJs: true } });
  const sourceFile = project.createSourceFile("__temp__" + extname(filePath), source);

  const arrayNode = sourceFile.getFirstDescendant((node) => {
    if (node.getKind() !== SyntaxKind.ArrayLiteralExpression) return false;
    try {
      const fn = new Function(`"use strict"; return (${node.getText()});`);
      const parsed = fn();
      return Array.isArray(parsed) && isAbiArray(parsed);
    } catch {
      return false;
    }
  });

  if (!arrayNode) {
    throw new Error(
      `No ABI array found in ${filePath}. Cannot replace.`,
    );
  }

  const serialized = JSON.stringify(abi, null, 2);
  const replaced =
    source.substring(0, arrayNode.getStart()) +
    serialized +
    source.substring(arrayNode.getEnd());

  await writeFile(filePath, replaced, "utf-8");
}
