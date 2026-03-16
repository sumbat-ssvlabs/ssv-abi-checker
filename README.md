# SSV ABI Checker

CLI + library to fetch, compare, and replace SSV Network ABI files from GitHub.

Fetches ABIs from the [`contract-abi`](https://github.com/ssvlabs/ssv-network/tree/contract-abi/docs) branch of `ssvlabs/ssv-network`, automatically resolves the latest version using semver, and can check or replace your local ABI files — including TypeScript files with AST-aware replacement.

## Install

```bash
pnpm install
pnpm build
```

## CLI Usage

### Check if your local ABI is up to date

```bash
node dist/cli.js check -n dev -c SSVNetwork -l ./path/to/SSVNetwork.ts
```

Exit code `0` = up to date, `1` = out of date, `2` = error.

### Replace local ABI with the latest remote version

```bash
node dist/cli.js replace -n dev -c SSVNetwork -l ./path/to/SSVNetwork.ts
```

For `.json` files, the file is overwritten entirely.
For `.ts` / `.js` files, only the ABI array literal is replaced — surrounding code is preserved.

### Fetch and save a remote ABI

```bash
node dist/cli.js fetch -n mainnet -c SSVNetwork -o ./abi/SSVNetwork.json
```

### Common flags

| Flag | Short | Description |
|------|-------|-------------|
| `--network` | `-n` | `dev`, `mainnet`, or `testnet` (required) |
| `--contract` | `-c` | `SSVNetwork`, `SSVNetworkViews`, `SSVToken`, or `CSSVToken` (required) |
| `--local` | `-l` | Path to local ABI file (required for `check` and `replace`) |
| `--out` | `-o` | Output path (required for `fetch`) |
| `--version` | `-v` | Pin a specific version instead of latest |
| `--token` | `-t` | GitHub token for higher rate limits (also reads `GITHUB_TOKEN` env) |

## Programmatic API

```typescript
import { checkAbi, replaceAbi, fetchLatestAbi } from "ssv-abi-checker";

// Check if local ABI matches remote
const result = await checkAbi({
  network: "dev",
  contract: "SSVNetwork",
  localPath: "./abi/SSVNetwork.ts",
});
console.log(result.isUpToDate); // true or false
console.log(result.diff);       // { missing, extra, modified }

// Replace local ABI with latest remote
await replaceAbi({
  network: "dev",
  contract: "SSVNetwork",
  localPath: "./abi/SSVNetwork.ts",
});

// Fetch latest ABI without writing to disk
const { version, abi } = await fetchLatestAbi({
  network: "dev",
  contract: "SSVNetwork",
});
```

## Supported local file formats

| Extension | Read | Write |
|-----------|------|-------|
| `.json` | Parse as JSON array | Overwrite entire file |
| `.ts` | AST extraction of ABI array from exported variable | Replace only the array literal |
| `.js` | AST extraction of ABI array from exported variable | Replace only the array literal |

For `.ts`/`.js` files, the tool uses `ts-morph` to find an exported variable whose initializer is an array of ABI entries (functions, events, errors, etc.). It validates that the array is a real Ethereum ABI before operating on it.

## How version resolution works

The tool lists all version folders (e.g. `v1.0.0`, `v1.0.0.rc4`, `v2.0.0`) under `docs/{network}/` and picks the highest using semver comparison. Pre-release versions like `v1.0.0.rc4` are normalized to `1.0.0-rc.4` and rank lower than stable releases.

## Tests

```bash
pnpm test
```

## License

MIT
# ssv-abi-checker
