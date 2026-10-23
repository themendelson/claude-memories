import type { IncomingMessage, ServerResponse } from "node:http";
import { deleteMemory, InvalidRequest, loadSnapshot } from "#server/store.ts";
import { errorMessage } from "#shared/guards.ts";

export type Handler = (req: IncomingMessage, res: ServerResponse) => boolean;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function statusFor(error: unknown): number {
  if (error instanceof InvalidRequest) return 400;
  if (error instanceof Error && "code" in error && error.code === "ENOENT") return 404;
  return 500;
}

// A page on another site can reach localhost, so only answer requests addressed to it by a local name.
function isLocal(req: IncomingMessage): boolean {
  const host = req.headers.host ?? "";
  const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : (host.split(":")[0] ?? "");
  const origin = req.headers.origin;
  return LOCAL_HOSTS.has(hostname) && (origin === undefined || origin === `http://${host}`);
}

export function createApi({ configDir }: { configDir: string }): Handler {
  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/")) return false;
    const fail = (error: unknown): void => sendJson(res, statusFor(error), { error: errorMessage(error) });

    if (!isLocal(req)) {
      sendJson(res, 403, { error: "only local requests are allowed" });
    } else if (url.pathname === "/api/snapshot" && req.method === "GET") {
      loadSnapshot(configDir).then((snapshot) => sendJson(res, 200, snapshot), fail);
    } else if (url.pathname === "/api/memory" && req.method === "DELETE") {
      const project = url.searchParams.get("project") ?? "";
      const file = url.searchParams.get("file") ?? "";
      deleteMemory(configDir, project, file).then((result) => sendJson(res, 200, result), fail);
    } else {
      sendJson(res, 404, { error: "not found" });
    }
    return true;
  };
}
