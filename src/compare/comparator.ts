import { formatAbiItem } from "abitype";
import type { Abi, AbiItem, AbiDiffResult, DiffEntry } from "../types.js";

function entryKey(entry: AbiItem): string {
  if ("name" in entry && entry.name) return `${entry.type}:${entry.name}`;
  return entry.type;
}

function signatureOf(entry: AbiItem): string {
  return formatAbiItem(entry);
}

function toDiffEntry(entry: AbiItem): DiffEntry {
  return {
    type: entry.type,
    name: "name" in entry ? entry.name : "(unnamed)",
    signature: signatureOf(entry),
  };
}

export function compareAbis(local: Abi, remote: Abi): AbiDiffResult {
  const localMap = new Map<string, AbiItem>();
  const remoteMap = new Map<string, AbiItem>();

  for (const entry of local) localMap.set(entryKey(entry), entry);
  for (const entry of remote) remoteMap.set(entryKey(entry), entry);

  const missing: DiffEntry[] = [];
  const extra: DiffEntry[] = [];
  const modified: {
    name: string;
    type: string;
    local: string;
    remote: string;
  }[] = [];

  for (const [key, remoteEntry] of remoteMap) {
    const localEntry = localMap.get(key);
    if (!localEntry) {
      missing.push(toDiffEntry(remoteEntry));
    } else {
      const localSig = signatureOf(localEntry);
      const remoteSig = signatureOf(remoteEntry);
      if (localSig !== remoteSig) {
        modified.push({
          name: "name" in remoteEntry ? remoteEntry.name : "(unnamed)",
          type: remoteEntry.type,
          local: localSig,
          remote: remoteSig,
        });
      }
    }
  }

  for (const [key, localEntry] of localMap) {
    if (!remoteMap.has(key)) {
      extra.push(toDiffEntry(localEntry));
    }
  }

  return {
    isEqual:
      missing.length === 0 && extra.length === 0 && modified.length === 0,
    missing,
    extra,
    modified,
  };
}
