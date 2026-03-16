export type {
  Abi,
  AbiItem,
  Network,
  ContractName,
  DiffEntry,
  AbiDiffResult,
  CheckResult,
  FetchResult,
  CommonOptions,
  CheckOptions,
  ReplaceOptions,
  FetchOptions,
  GitHubContentEntry,
} from "./types.js";

export { NETWORKS, CONTRACT_NAMES } from "./types.js";

export {
  listNetworks,
  listVersions,
  fetchAbi,
  fetchAllAbis,
} from "./github/fetcher.js";
export {
  normalizeVersion,
  resolveLatestVersion,
  getLatestVersion,
} from "./github/version-resolver.js";
export { readLocalAbi, extractAbiArrayFromSource } from "./local/reader.js";
export { writeLocalAbi } from "./local/writer.js";
export { isAbiArray, validateAbi } from "./local/abi-detector.js";
export { compareAbis } from "./compare/comparator.js";

import type {
  CheckOptions,
  ReplaceOptions,
  FetchOptions,
  CheckResult,
  FetchResult,
} from "./types.js";
import { fetchAbi } from "./github/fetcher.js";
import { getLatestVersion } from "./github/version-resolver.js";
import { readLocalAbi } from "./local/reader.js";
import { writeLocalAbi } from "./local/writer.js";
import { compareAbis } from "./compare/comparator.js";

async function resolveVersion(
  network: CheckOptions["network"],
  version?: string,
  token?: string,
): Promise<string> {
  if (version) return version;
  const { latest } = await getLatestVersion(network, token);
  return latest;
}

export async function checkAbi(options: CheckOptions): Promise<CheckResult> {
  const version = await resolveVersion(
    options.network,
    options.version,
    options.token,
  );
  const [remoteAbi, localAbi] = await Promise.all([
    fetchAbi(options.network, version, options.contract, options.token),
    readLocalAbi(options.localPath),
  ]);
  const diff = compareAbis(localAbi, remoteAbi);
  return {
    isUpToDate: diff.isEqual,
    remoteVersion: version,
    diff,
  };
}

export async function replaceAbi(options: ReplaceOptions): Promise<void> {
  const version = await resolveVersion(
    options.network,
    options.version,
    options.token,
  );
  const remoteAbi = await fetchAbi(
    options.network,
    version,
    options.contract,
    options.token,
  );
  await writeLocalAbi(options.localPath, remoteAbi);
}

export async function fetchLatestAbi(
  options: FetchOptions,
): Promise<FetchResult> {
  const version = await resolveVersion(
    options.network,
    options.version,
    options.token,
  );
  const abi = await fetchAbi(
    options.network,
    version,
    options.contract,
    options.token,
  );
  return { version, abi };
}
