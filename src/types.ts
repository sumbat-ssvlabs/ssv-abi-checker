import type { Abi } from "abitype";

type AbiItem = Abi[number];

export type { Abi, AbiItem };

export const NETWORKS = ["dev", "mainnet", "testnet"] as const;
export type Network = (typeof NETWORKS)[number];

export const CONTRACT_NAMES = [
  "CSSVToken",
  "SSVNetwork",
  "SSVNetworkViews",
  "SSVToken",
] as const;
export type ContractName = (typeof CONTRACT_NAMES)[number];

export interface DiffEntry {
  type: string;
  name: string;
  signature: string;
}

export interface AbiDiffResult {
  isEqual: boolean;
  missing: DiffEntry[];
  extra: DiffEntry[];
  modified: { name: string; type: string; local: string; remote: string }[];
}

export interface CheckResult {
  isUpToDate: boolean;
  localVersion?: string;
  remoteVersion: string;
  diff: AbiDiffResult;
}

export interface FetchResult {
  version: string;
  abi: Abi;
}

export interface CommonOptions {
  network: Network;
  contract: ContractName;
  version?: string;
  token?: string;
}

export interface CheckOptions extends CommonOptions {
  localPath: string;
}

export interface ReplaceOptions extends CommonOptions {
  localPath: string;
}

export interface FetchOptions extends CommonOptions {
  out?: string;
}

export interface GitHubContentEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
}
