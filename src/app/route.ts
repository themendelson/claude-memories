export type Route =
  | { view: "home" }
  | { view: "project"; projectId: string; tab: "memories" | "index" }
  | { view: "memory"; projectId: string; file: string };

function decode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

export function parseRoute(hash: string): Route {
  const [scope, projectId, ...rest] = hash.replace(/^#\/?/, "").split("/").map(decode);
  if (scope !== "p" || projectId === undefined || projectId === "") return { view: "home" };
  if (rest.length === 0) return { view: "project", projectId, tab: "memories" };
  if (rest.length === 1 && rest[0] === "index") return { view: "project", projectId, tab: "index" };
  return { view: "memory", projectId, file: rest.join("/") };
}

export const href = {
  home: (): string => "#/",
  project: (id: string): string => `#/p/${encodeURIComponent(id)}`,
  index: (id: string): string => `#/p/${encodeURIComponent(id)}/index`,
  memory: (id: string, file: string): string =>
    `#/p/${encodeURIComponent(id)}/${file.split("/").map(encodeURIComponent).join("/")}`,
};
