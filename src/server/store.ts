import { open, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { describe, parseMemoryFile } from "#server/frontmatter.ts";
import { linksTo } from "#shared/links.ts";
import type { DeleteResult, Memory, Project, Snapshot } from "#shared/types.ts";

const INDEX_FILE = "MEMORY.md";
const CWD_FIELD = /"cwd":"((?:[^"\\]|\\.)*)"/;

export class InvalidRequest extends Error {}

export function defaultConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
}

export async function loadSnapshot(configDir: string): Promise<Snapshot> {
  const projectsDir = join(configDir, "projects");
  const entries = await readdir(projectsDir, { withFileTypes: true }).catch(() => []);
  const loaded = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => loadProject(projectsDir, entry.name)),
  );
  const projects = loaded
    .filter((project) => project !== null)
    .sort((a, b) => b.memories.length - a.memories.length || a.path.localeCompare(b.path));
  return { home: homedir(), configDir, projects };
}

async function loadProject(projectsDir: string, id: string): Promise<Project | null> {
  const dir = join(projectsDir, id);
  const memoryDir = join(dir, "memory");
  const files = await listMarkdown(memoryDir);
  if (files === null) return null;
  const index = files.includes(INDEX_FILE) ? await readFile(join(memoryDir, INDEX_FILE), "utf8") : null;
  const memories = await Promise.all(files.filter((f) => f !== INDEX_FILE).map((f) => loadMemory(memoryDir, f)));
  memories.sort((a, b) => b.modified.localeCompare(a.modified));
  return { id, path: await sessionCwd(dir, id), memoryDir, index, memories };
}

async function listMarkdown(memoryDir: string): Promise<string[] | null> {
  try {
    const entries = await readdir(memoryDir, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => join(entry.parentPath, entry.name).slice(memoryDir.length + 1))
      .sort();
  } catch {
    return null;
  }
}

async function loadMemory(memoryDir: string, file: string): Promise<Memory> {
  const path = join(memoryDir, file);
  const [raw, info] = await Promise.all([readFile(path, "utf8"), stat(path)]);
  const parsed = parseMemoryFile(raw);
  return {
    file,
    path,
    ...describe(parsed.frontmatter, file),
    frontmatter: parsed.frontmatter,
    frontmatterError: parsed.error,
    body: parsed.body,
    raw,
    modified: info.mtime.toISOString(),
    size: info.size,
  };
}

// Folder names turn "/" and "." into "-", which is lossy (utm-ai vs utm/ai), so prefer a transcript's cwd.
async function sessionCwd(dir: string, id: string): Promise<string> {
  const entries = await readdir(dir).catch((): string[] => []);
  for (const name of entries.filter((n) => n.endsWith(".jsonl")).slice(0, 5)) {
    const match = CWD_FIELD.exec(await readHead(join(dir, name), 256 * 1024));
    const cwd: unknown = match === null ? null : JSON.parse(`"${match[1] ?? ""}"`);
    if (typeof cwd === "string") return cwd;
  }
  return id.replace(/-/g, "/");
}

async function readHead(file: string, bytes: number): Promise<string> {
  const handle = await open(file, "r").catch(() => null);
  if (handle === null) return "";
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

function memoryPath(configDir: string, projectId: string, file: string): { memoryDir: string; target: string } {
  if (projectId === "" || /[/\\]/.test(projectId) || projectId.startsWith(".")) {
    throw new InvalidRequest("invalid project");
  }
  const memoryDir = join(configDir, "projects", projectId, "memory");
  const target = resolve(memoryDir, file);
  if (!target.startsWith(memoryDir + sep) || !target.endsWith(".md")) throw new InvalidRequest("invalid file");
  if (target === join(memoryDir, INDEX_FILE)) throw new InvalidRequest("refusing to delete the index");
  return { memoryDir, target };
}

export async function deleteMemory(configDir: string, projectId: string, file: string): Promise<DeleteResult> {
  const { memoryDir, target } = memoryPath(configDir, projectId, file);
  await unlink(target);
  const indexPath = join(memoryDir, INDEX_FILE);
  const index = await readFile(indexPath, "utf8").catch(() => null);
  if (index === null) return { removedIndexLines: [] };
  const relative = target.slice(memoryDir.length + 1);
  const lines = index.split("\n");
  const removedIndexLines = lines.filter((line) => linksTo(line, relative));
  if (removedIndexLines.length > 0) {
    await writeFile(indexPath, lines.filter((line) => !linksTo(line, relative)).join("\n"));
  }
  return { removedIndexLines };
}
