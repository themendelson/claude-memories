#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createApi } from "#server/api.ts";
import { serveStatic } from "#server/static.ts";
import { defaultConfigDir, loadSnapshot } from "#server/store.ts";
import { isRecord } from "#shared/guards.ts";

const DEFAULT_PORT = 5190;
const PORT_ATTEMPTS = 20;

const USAGE = `Usage: claude-memories [options]

Browse, search and delete the memories Claude Code saved on this machine.

  --port <n>      port to listen on (default: ${DEFAULT_PORT}, or the next free one)
  --dir <path>    Claude config directory (default: $CLAUDE_CONFIG_DIR or ~/.claude)
  --no-open       don't open the browser
  -v, --version   print the version
  -h, --help      show this help`;

function usage(problem?: string): never {
  if (problem === undefined) {
    console.log(USAGE);
    process.exit(0);
  }
  console.error(`${problem}\n\n${USAGE}`);
  process.exit(2);
}

function version(): string {
  const pkg: unknown = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  return isRecord(pkg) && typeof pkg.version === "string" ? pkg.version : "unknown";
}

function parseOptions(): { port: number | null; dir: string; open: boolean } {
  let parsed: ReturnType<typeof parseCli>;
  try {
    parsed = parseCli();
  } catch (error) {
    usage(error instanceof Error ? error.message : String(error));
  }
  const { values } = parsed;
  if (values.help === true) usage();
  if (values.version === true) {
    console.log(version());
    process.exit(0);
  }
  const port = values.port === undefined ? null : Number(values.port);
  if (port !== null && !(Number.isInteger(port) && port > 0 && port < 65536)) usage(`Invalid port: ${values.port}`);
  return { port, dir: values.dir ?? defaultConfigDir(), open: values["no-open"] !== true };
}

function parseCli() {
  return parseArgs({
    options: {
      port: { type: "string" },
      dir: { type: "string" },
      "no-open": { type: "boolean" },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
  });
}

function listen(server: Server, port: number, attemptsLeft: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException): void => {
      if (error.code === "EADDRINUSE" && attemptsLeft > 1) resolve(listen(server, port + 1, attemptsLeft - 1));
      else reject(error);
    };
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", onError);
      resolve(port);
    });
  });
}

function openBrowser(url: string): void {
  const [command, ...args] =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  spawn(command, args, { stdio: "ignore", detached: true })
    .on("error", () => undefined)
    .unref();
}

async function main(): Promise<void> {
  const options = parseOptions();
  const api = createApi({ configDir: options.dir });
  const assets = serveStatic(fileURLToPath(new URL("./app/", import.meta.url)));
  const server = createServer((req, res) => {
    if (!api(req, res) && !assets(req, res)) {
      res.statusCode = 404;
      res.end("not found");
    }
  });
  const port = await listen(server, options.port ?? DEFAULT_PORT, options.port === null ? PORT_ATTEMPTS : 1);
  const url = `http://127.0.0.1:${port}`;
  const snapshot = await loadSnapshot(options.dir);
  const count = snapshot.projects.reduce((sum, project) => sum + project.memories.length, 0);
  console.log(`claude-memories: ${count} memories in ${options.dir}`);
  console.log(`  ${url}  (Ctrl+C to stop)`);
  if (options.open) openBrowser(url);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
