import type { Located } from "#shared/links.ts";
import type { Memory, Project } from "#shared/types.ts";

const TYPE_ORDER = ["user", "feedback", "project", "reference"];

export function projectLabel(project: Project, home: string): string {
  if (project.path === home) return "~";
  if (project.path.startsWith(`${home}/`)) return `~/${project.path.slice(home.length + 1)}`;
  return project.path;
}

export function projectName(project: Project, home: string): string {
  const label = projectLabel(project, home);
  const last = label.split("/").at(-1) ?? label;
  if (label.includes("scratch-workspaces/")) return `scratch · ${last}`;
  return label === "~" ? "~ (home)" : last;
}

export function groupByType(memories: Memory[]): [string, Memory[]][] {
  const groups = new Map<string, Memory[]>();
  for (const memory of memories) {
    const type = memory.type ?? "untyped";
    groups.set(type, [...(groups.get(type) ?? []), memory]);
  }
  const rank = (type: string): number => {
    const position = TYPE_ORDER.indexOf(type);
    return position === -1 ? TYPE_ORDER.length : position;
  };
  return [...groups].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const UNITS: [number, string][] = [
  [60, "minute"],
  [3600, "hour"],
  [86_400, "day"],
  [86_400 * 30, "month"],
  [86_400 * 365, "year"],
];

export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  const [size, unit] = UNITS.findLast(([threshold]) => seconds >= threshold) ?? [60, "minute"];
  const count = Math.floor(seconds / size);
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

export function search(projects: Project[], query: string, home: string): Located[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return projects.flatMap((project) =>
    project.memories
      .filter((memory) => {
        const haystack = [memory.name, memory.description ?? "", memory.body, projectLabel(project, home)]
          .join("\n")
          .toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .map((memory) => ({ project, memory })),
  );
}

export function excerpt(text: string, query: string, radius = 80): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const term = query.toLowerCase().split(/\s+/).find(Boolean) ?? "";
  const at = term === "" ? -1 : flat.toLowerCase().indexOf(term);
  if (at < 0) return flat.length > radius * 2 ? `${flat.slice(0, radius * 2)}…` : flat;
  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + term.length + radius);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}
