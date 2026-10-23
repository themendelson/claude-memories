import type { Server } from "node:http";
import { createServer, get } from "node:http";
import { afterEach, describe, expect, test } from "vitest";
import { createApi } from "#server/api.ts";
import { isSnapshot } from "#shared/guards.ts";
import { copyFixture, FIXTURE_DIR } from "./support.ts";

let server: Server | undefined;

afterEach(() => new Promise<void>((resolve) => (server === undefined ? resolve() : server.close(() => resolve()))));

async function start(configDir: string): Promise<string> {
  const api = createApi({ configDir });
  server = createServer((req, res) => {
    if (!api(req, res)) res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("server is not listening on a port");
  return `http://127.0.0.1:${address.port}`;
}

describe("api", () => {
  test("serves the snapshot", async () => {
    const base = await start(FIXTURE_DIR);
    const response = await fetch(`${base}/api/snapshot`);
    expect(response.status).toBe(200);
    expect(isSnapshot(await response.json())).toBe(true);
  });

  test("rejects a request addressed to another host name", async () => {
    const base = await start(FIXTURE_DIR);
    const status = await new Promise<number | undefined>((resolve, reject) => {
      get(`${base}/api/snapshot`, { headers: { host: "attacker.example" } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      }).on("error", reject);
    });
    expect(status).toBe(403);
  });

  test("rejects a delete sent from another origin", async () => {
    const base = await start(await copyFixture());
    const response = await fetch(`${base}/api/memory?project=-Users-test-app&file=user-role.md`, {
      method: "DELETE",
      headers: { origin: "https://attacker.example" },
    });
    expect(response.status).toBe(403);
  });

  test("deletes a memory for the viewer's own origin", async () => {
    const base = await start(await copyFixture());
    const response = await fetch(`${base}/api/memory?project=-Users-test-app&file=user-role.md`, {
      method: "DELETE",
      headers: { origin: base },
    });
    expect(await response.json()).toEqual({ removedIndexLines: ["- [User role](user-role.md) — who the user is"] });
  });

  test("answers a refused delete with 400 and the reason", async () => {
    const base = await start(await copyFixture());
    const response = await fetch(`${base}/api/memory?project=-Users-test-app&file=MEMORY.md`, { method: "DELETE" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "refusing to delete the index" });
  });
});
