import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import type { Handler } from "#server/api.ts";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

function decodedPath(url: string): string | null {
  try {
    return decodeURIComponent(new URL(url, "http://localhost").pathname);
  } catch {
    return null;
  }
}

export function serveStatic(root: string): Handler {
  return (req, res) => {
    const pathname = decodedPath(req.url ?? "/");
    if (pathname === null) return false;
    const relative = normalize(pathname === "/" ? "index.html" : pathname.slice(1));
    const file = join(root, relative);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) return false;
    readFile(file).then(
      (content) => {
        res.setHeader("Content-Type", CONTENT_TYPES[extname(file)] ?? "application/octet-stream");
        res.setHeader(
          "Cache-Control",
          relative.startsWith("assets") ? "public, max-age=31536000, immutable" : "no-cache",
        );
        res.end(content);
      },
      () => {
        res.statusCode = 404;
        res.end("not found");
      },
    );
    return true;
  };
}
