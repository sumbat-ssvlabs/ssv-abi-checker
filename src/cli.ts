#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { writeFile } from "node:fs/promises";
import { checkAbi, replaceAbi, fetchLatestAbi } from "./index.js";
import { NETWORKS, CONTRACT_NAMES } from "./types.js";
import type { Network, ContractName } from "./types.js";

const program = new Command();

program
  .name("ssv-abi-checker")
  .description("Fetch, compare, and replace SSV Network ABI files from GitHub")
  .version("1.0.0");

function resolveToken(opts: { token?: string }): string | undefined {
  return opts.token ?? process.env.GITHUB_TOKEN;
}

function validateNetwork(value: string): Network {
  if (!NETWORKS.includes(value as Network)) {
    throw new Error(
      `Invalid network "${value}". Must be one of: ${NETWORKS.join(", ")}`,
    );
  }
  return value as Network;
}

function validateContract(value: string): ContractName {
  if (!CONTRACT_NAMES.includes(value as ContractName)) {
    throw new Error(
      `Invalid contract "${value}". Must be one of: ${CONTRACT_NAMES.join(", ")}`,
    );
  }
  return value as ContractName;
}

// ── check ──────────────────────────────────────────────────────────────────

program
  .command("check")
  .description("Check if a local ABI matches the latest remote ABI")
  .requiredOption("-n, --network <network>", "Network: dev | mainnet | testnet")
  .requiredOption(
    "-c, --contract <name>",
    "Contract: SSVNetwork | SSVNetworkViews | SSVToken | CSSVToken",
  )
  .requiredOption("-l, --local <path>", "Path to local ABI file")
  .option("-v, --version <version>", "Pin a specific version (default: latest)")
  .option("-t, --token <token>", "GitHub token for higher rate limits")
  .action(async (opts) => {
    try {
      const network = validateNetwork(opts.network);
      const contract = validateContract(opts.contract);

      console.log(
        chalk.blue(`Checking ${contract} on ${network}...`),
      );

      const result = await checkAbi({
        network,
        contract,
        localPath: opts.local,
        version: opts.version,
        token: resolveToken(opts),
      });

      console.log(
        chalk.gray(`Remote version: ${result.remoteVersion}`),
      );

      if (result.isUpToDate) {
        console.log(chalk.green("✔ Local ABI is up to date."));
        process.exit(0);
      }

      console.log(chalk.yellow("✘ Local ABI is out of date.\n"));

      const { diff } = result;
      if (diff.missing.length > 0) {
        console.log(chalk.red(`Missing (in remote but not local): ${diff.missing.length}`));
        for (const e of diff.missing) {
          console.log(chalk.red(`  + ${e.signature}`));
        }
      }
      if (diff.extra.length > 0) {
        console.log(chalk.yellow(`\nExtra (in local but not remote): ${diff.extra.length}`));
        for (const e of diff.extra) {
          console.log(chalk.yellow(`  - ${e.signature}`));
        }
      }
      if (diff.modified.length > 0) {
        console.log(chalk.magenta(`\nModified: ${diff.modified.length}`));
        for (const m of diff.modified) {
          console.log(chalk.magenta(`  ~ ${m.name} (${m.type})`));
          console.log(chalk.gray(`    local:  ${m.local}`));
          console.log(chalk.gray(`    remote: ${m.remote}`));
        }
      }

      process.exit(1);
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(2);
    }
  });

// ── replace ────────────────────────────────────────────────────────────────

program
  .command("replace")
  .description("Replace local ABI with the latest remote version")
  .requiredOption("-n, --network <network>", "Network: dev | mainnet | testnet")
  .requiredOption(
    "-c, --contract <name>",
    "Contract: SSVNetwork | SSVNetworkViews | SSVToken | CSSVToken",
  )
  .requiredOption("-l, --local <path>", "Path to local ABI file")
  .option("-v, --version <version>", "Pin a specific version (default: latest)")
  .option("-t, --token <token>", "GitHub token for higher rate limits")
  .action(async (opts) => {
    try {
      const network = validateNetwork(opts.network);
      const contract = validateContract(opts.contract);

      console.log(
        chalk.blue(`Replacing ${contract} ABI from ${network}...`),
      );

      await replaceAbi({
        network,
        contract,
        localPath: opts.local,
        version: opts.version,
        token: resolveToken(opts),
      });

      console.log(chalk.green(`✔ ${opts.local} has been updated.`));
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(2);
    }
  });

// ── fetch ──────────────────────────────────────────────────────────────────

program
  .command("fetch")
  .description("Fetch the latest remote ABI and save it to a file")
  .requiredOption("-n, --network <network>", "Network: dev | mainnet | testnet")
  .requiredOption(
    "-c, --contract <name>",
    "Contract: SSVNetwork | SSVNetworkViews | SSVToken | CSSVToken",
  )
  .requiredOption("-o, --out <path>", "Output file path")
  .option("-v, --version <version>", "Pin a specific version (default: latest)")
  .option("-t, --token <token>", "GitHub token for higher rate limits")
  .action(async (opts) => {
    try {
      const network = validateNetwork(opts.network);
      const contract = validateContract(opts.contract);

      console.log(
        chalk.blue(`Fetching ${contract} ABI from ${network}...`),
      );

      const result = await fetchLatestAbi({
        network,
        contract,
        version: opts.version,
        token: resolveToken(opts),
      });

      await writeFile(
        opts.out,
        JSON.stringify(result.abi, null, 2) + "\n",
        "utf-8",
      );

      console.log(
        chalk.green(
          `✔ Saved ${contract} ABI (${result.version}) to ${opts.out}`,
        ),
      );
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(2);
    }
  });

program.parse();
