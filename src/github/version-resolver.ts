import semver from "semver";
import type { Network } from "../types.js";
import { listVersions } from "./fetcher.js";

/**
 * Normalize non-standard version strings from the repo.
 * e.g. "v1.0.0.rc4" -> "1.0.0-rc.4"
 */
export function normalizeVersion(raw: string): string {
  let v = raw.startsWith("v") ? raw.slice(1) : raw;
  v = v.replace(/\.rc\.?(\d+)/i, "-rc.$1");
  v = v.replace(/\.rc$/i, "-rc.0");
  const parsed = semver.parse(v) ?? semver.coerce(v);
  if (!parsed) {
    throw new Error(`Unable to parse version: ${raw}`);
  }
  return parsed.version;
}

export function resolveLatestVersion(rawVersions: string[]): {
  latest: string;
  normalized: string;
} {
  const mapped = rawVersions.map((raw) => ({
    raw,
    normalized: normalizeVersion(raw),
  }));

  mapped.sort((a, b) => semver.rcompare(a.normalized, b.normalized));
  return { latest: mapped[0].raw, normalized: mapped[0].normalized };
}

export async function getLatestVersion(
  network: Network,
  token?: string,
): Promise<{ latest: string; normalized: string }> {
  const versions = await listVersions(network, token);
  if (versions.length === 0) {
    throw new Error(`No versions found for network: ${network}`);
  }
  return resolveLatestVersion(versions);
}
