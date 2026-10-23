import type { Memory, Project } from "#shared/types.ts";

export interface Located {
  project: Project;
  memory: Memory;
}

const WIKI_LINK = /\[\[([^\]\n]+)\]\]/g;
const MARKDOWN_LINK_TARGET = /\]\(([^)\s]+)\)/g;

export function wikiTargets(markdown: string): string[] {
  return [...markdown.matchAll(WIKI_LINK)].map((match) => (match[1] ?? "").trim());
}

export function expandWikiLinks(markdown: string): string {
  return markdown.replace(WIKI_LINK, (_, name: string) => {
    const trimmed = name.trim();
    return `[${trimmed}](wikilink:${encodeURIComponent(trimmed)})`;
  });
}

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeLinkTarget(target: string): string {
  return decodeSafely(target.replace(/^\.\//, "").split("#")[0] ?? "");
}

export function linksTo(line: string, file: string): boolean {
  return [...line.matchAll(MARKDOWN_LINK_TARGET)].some((match) => normalizeLinkTarget(match[1] ?? "") === file);
}

export function indexLinesFor(index: string | null, file: string): string[] {
  return index === null ? [] : index.split("\n").filter((line) => linksTo(line, file));
}

export function indexedFiles(index: string | null): Set<string> {
  const files = new Set<string>();
  for (const match of (index ?? "").matchAll(MARKDOWN_LINK_TARGET)) {
    const target = normalizeLinkTarget(match[1] ?? "");
    if (target.endsWith(".md")) files.add(target);
  }
  return files;
}

function matchesName(memory: Memory, key: string): boolean {
  return memory.name.toLowerCase() === key || memory.file.replace(/\.md$/, "").toLowerCase() === key;
}

export function resolveWikiLink(target: string, project: Project, all: Project[]): Located | null {
  const key = target.trim().toLowerCase();
  for (const candidate of [project, ...all]) {
    const memory = candidate.memories.find((m) => matchesName(m, key));
    if (memory !== undefined) return { project: candidate, memory };
  }
  return null;
}

export function resolveFileLink(target: string, project: Project): Memory | null {
  const file = normalizeLinkTarget(target);
  return project.memories.find((m) => m.file === file) ?? null;
}

export function backlinks(target: Located, all: Project[]): Located[] {
  return all.flatMap((project) =>
    project.memories
      .filter((memory) => memory !== target.memory)
      .filter((memory) =>
        wikiTargets(memory.body).some((name) => resolveWikiLink(name, project, all)?.memory === target.memory),
      )
      .map((memory) => ({ project, memory })),
  );
}
