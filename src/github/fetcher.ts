import type {
  Network,
  ContractName,
  Abi,
  GitHubContentEntry,
} from "../types.js";

const REPO_OWNER = "ssvlabs";
const REPO_NAME = "ssv-network";
const BRANCH = "contract-abi";
const BASE_PATH = "docs";

const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ssv-abi-checker",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function fetchJson<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) {
    throw new Error(
      `GitHub API error: ${res.status} ${res.statusText} for ${url}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function listNetworks(
  token?: string,
): Promise<string[]> {
  const entries = await fetchJson<GitHubContentEntry[]>(
    `${API_BASE}/${BASE_PATH}?ref=${BRANCH}`,
    token,
  );
  return entries.filter((e) => e.type === "dir").map((e) => e.name);
}

export async function listVersions(
  network: Network,
  token?: string,
): Promise<string[]> {
  const entries = await fetchJson<GitHubContentEntry[]>(
    `${API_BASE}/${BASE_PATH}/${network}?ref=${BRANCH}`,
    token,
  );
  return entries.filter((e) => e.type === "dir").map((e) => e.name);
}

export async function fetchAbi(
  network: Network,
  version: string,
  contractName: ContractName,
  token?: string,
): Promise<Abi> {
  const url = `${RAW_BASE}/${BASE_PATH}/${network}/${version}/abi/${contractName}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ssv-abi-checker" },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ABI: ${res.status} ${res.statusText} for ${url}`,
    );
  }
  return res.json() as Promise<Abi>;
}

export async function fetchAllAbis(
  network: Network,
  version: string,
  token?: string,
): Promise<Record<ContractName, Abi>> {
  const contracts: ContractName[] = [
    "CSSVToken",
    "SSVNetwork",
    "SSVNetworkViews",
    "SSVToken",
  ];
  const results = await Promise.all(
    contracts.map((c) => fetchAbi(network, version, c, token)),
  );
  return Object.fromEntries(
    contracts.map((c, i) => [c, results[i]]),
  ) as Record<ContractName, Abi>;
}
