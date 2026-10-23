import { describe, expect, test } from "vitest";
import { loadSnapshot } from "#server/store.ts";
import {
  backlinks,
  expandWikiLinks,
  indexedFiles,
  indexLinesFor,
  resolveWikiLink,
  wikiTargets,
} from "#shared/links.ts";
import type { Project } from "#shared/types.ts";
import { FIXTURE_DIR } from "./support.ts";

async function projects(): Promise<{ all: Project[]; app: Project; lib: Project }> {
  const all = (await loadSnapshot(FIXTURE_DIR)).projects;
  const app = all.find((p) => p.id === "-Users-test-app");
  const lib = all.find((p) => p.id === "-Users-test-lib");
  if (app === undefined || lib === undefined) throw new Error("fixture projects missing");
  return { all, app, lib };
}

describe("wiki links", () => {
  test("finds [[name]] targets and turns them into links the renderer can resolve", () => {
    const markdown = "See [[ user-role ]] and [[feedback-tests]].";
    expect(wikiTargets(markdown)).toEqual(["user-role", "feedback-tests"]);
    expect(expandWikiLinks(markdown)).toBe(
      "See [user-role](wikilink:user-role) and [feedback-tests](wikilink:feedback-tests).",
    );
  });

  test("resolve in another project when the current one has no match", async () => {
    const { all, app, lib } = await projects();
    const target = resolveWikiLink("user-role", lib, all);
    expect(target?.project).toBe(app);
    expect(target?.memory.file).toBe("user-role.md");
  });

  test("resolve to null for a memory that was never written", async () => {
    const { all, lib } = await projects();
    expect(resolveWikiLink("not-written-yet", lib, all)).toBeNull();
  });

  test("count as backlinks across projects", async () => {
    const { all, app } = await projects();
    const userRole = app.memories.find((m) => m.file === "user-role.md");
    if (userRole === undefined) throw new Error("fixture memory missing");
    expect(backlinks({ project: app, memory: userRole }, all).map((entry) => entry.memory.name)).toEqual([
      "reference-docs",
    ]);
  });
});

describe("index links", () => {
  const index = "- [A](a.md) — one\n- [B](./b%20c.md) — two\n- [Site](https://example.com)\n";

  test("collect the markdown files MEMORY.md points to", () => {
    expect([...indexedFiles(index)]).toEqual(["a.md", "b c.md"]);
  });

  test("find the lines that link to one file", () => {
    expect(indexLinesFor(index, "b c.md")).toEqual(["- [B](./b%20c.md) — two"]);
    expect(indexLinesFor(null, "a.md")).toEqual([]);
  });
});
