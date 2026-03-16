import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { Project, SyntaxKind, type Node } from "ts-morph";
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

  const arrayNode = findAbiArrayNode(sourceFile);
  if (!arrayNode) {
    throw new Error(
      `No ABI array found in ${filePath}. Cannot replace.`,
    );
  }

  const serialized = JSON.stringify(abi, null, 2);

  const start = arrayNode.getStart();
  const end = arrayNode.getEnd();

  const replaced =
    source.substring(0, start) + serialized + source.substring(end);

  await writeFile(filePath, replaced, "utf-8");
}

function findAbiArrayNode(
  sourceFile: ReturnType<Project["createSourceFile"]>,
): Node | null {
  for (const varDecl of sourceFile.getVariableDeclarations()) {
    const initializer = varDecl.getInitializer();
    if (!initializer) continue;

    let arrayNode: Node | null =
      initializer.getKind() === SyntaxKind.ArrayLiteralExpression
        ? initializer
        : null;

    if (
      !arrayNode &&
      (initializer.getKind() === SyntaxKind.AsExpression ||
        initializer.getKind() === SyntaxKind.SatisfiesExpression)
    ) {
      const child = initializer.getChildAtIndex(0);
      if (child.getKind() === SyntaxKind.ArrayLiteralExpression) {
        arrayNode = child;
      }
    }

    if (!arrayNode) continue;

    const text = arrayNode.getText();
    try {
      const fn = new Function(`"use strict"; return (${text});`);
      const parsed = fn();
      if (Array.isArray(parsed) && isAbiArray(parsed)) {
        return arrayNode;
      }
    } catch {
      continue;
    }
  }
  return null;
}
