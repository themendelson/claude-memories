import { parse as parseYaml } from "yaml";
import { isRecord } from "#shared/guards.ts";
import type { Frontmatter } from "#shared/types.ts";

export interface ParsedFile {
  frontmatter: Frontmatter;
  error: string | null;
  body: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const KEY_VALUE = /^(\s*)([^:\s][^:]*):(?:\s+(.*))?$/;

export function parseMemoryFile(raw: string): ParsedFile {
  const match = FRONTMATTER.exec(raw);
  if (match === null) return { frontmatter: {}, error: null, body: raw };
  const source = match[1] ?? "";
  const body = raw.slice(match[0].length);
  try {
    const parsed: unknown = parseYaml(source);
    return { frontmatter: isRecord(parsed) ? parsed : {}, error: null, body };
  } catch (error) {
    // Hand-written memories often hold unquoted "a: b" values that strict YAML rejects.
    const frontmatter = parseLenient(source);
    const failed = Object.keys(frontmatter).length === 0;
    return { frontmatter, error: failed ? String(error) : null, body };
  }
}

function unquote(value: string): string {
  return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}

function parseLenient(source: string): Frontmatter {
  const result: Frontmatter = {};
  let parent: Frontmatter | null = null;
  for (const line of source.split(/\r?\n/)) {
    const match = KEY_VALUE.exec(line);
    if (match === null) continue;
    const [, indent = "", rawKey = "", rawValue = ""] = match;
    const key = rawKey.trim();
    const value = unquote(rawValue);
    if (indent !== "" && parent !== null) {
      parent[key] = value;
    } else if (value === "") {
      parent = {};
      result[key] = parent;
    } else {
      result[key] = value;
      parent = null;
    }
  }
  return result;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

interface Labels {
  name: string;
  description: string | null;
  type: string | null;
}

export function describe(frontmatter: Frontmatter, file: string): Labels {
  const metadata = isRecord(frontmatter.metadata) ? frontmatter.metadata : {};
  return {
    name: text(frontmatter.name) ?? file.replace(/\.md$/, ""),
    description: text(frontmatter.description),
    type: text(metadata.type) ?? text(frontmatter.type),
  };
}
