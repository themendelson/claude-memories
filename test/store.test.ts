import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { deleteMemory, loadSnapshot } from "#server/store.ts";
import type { Project } from "#shared/types.ts";
import { copyFixture, FIXTURE_DIR } from "./support.ts";

function project(projects: Project[], id: string): Project {
  const found = projects.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no project ${id}`);
  return found;
}

describe("loadSnapshot", () => {
  test("lists every project with a memory folder, most memories first", async () => {
    const { projects } = await loadSnapshot(FIXTURE_DIR);
    expect(projects.map((p) => [p.id, p.memories.length])).toEqual([
      ["-Users-test-app", 3],
      ["-Users-test-lib", 1],
      ["-Users-test-blank", 0],
    ]);
  });

  test("takes the project path from a session transcript", async () => {
    const { projects } = await loadSnapshot(FIXTURE_DIR);
    expect(project(projects, "-Users-test-app").path).toBe("/Users/test/app");
  });

  test("falls back to decoding the folder name without a transcript", async () => {
    const { projects } = await loadSnapshot(FIXTURE_DIR);
    expect(project(projects, "-Users-test-lib").path).toBe("/Users/test/lib");
  });

  test("keeps MEMORY.md as the index, not as a memory", async () => {
    const app = project((await loadSnapshot(FIXTURE_DIR)).projects, "-Users-test-app");
    expect(app.index).toContain("[User role](user-role.md)");
    expect(app.memories.map((m) => m.file)).not.toContain("MEMORY.md");
  });

  test("reads a description with an unquoted colon that strict YAML rejects", async () => {
    const app = project((await loadSnapshot(FIXTURE_DIR)).projects, "-Users-test-app");
    const memory = app.memories.find((m) => m.file === "feedback-tests.md");
    expect(memory).toMatchObject({
      name: "feedback-tests",
      description: "How to test: run the real suite, never mock the database",
      type: "feedback",
      frontmatterError: null,
    });
  });

  test("reads the type from metadata or from the top level", async () => {
    const { projects } = await loadSnapshot(FIXTURE_DIR);
    expect(project(projects, "-Users-test-app").memories.find((m) => m.file === "user-role.md")?.type).toBe("user");
    expect(project(projects, "-Users-test-lib").memories[0]?.type).toBe("reference");
  });

  test("names a memory without frontmatter after its file", async () => {
    const app = project((await loadSnapshot(FIXTURE_DIR)).projects, "-Users-test-app");
    expect(app.memories.find((m) => m.file === "unlisted.md")).toMatchObject({
      name: "unlisted",
      type: null,
      body: "No frontmatter at all.\n",
    });
  });

  test("returns no projects for a config dir without a projects folder", async () => {
    expect((await loadSnapshot(join(FIXTURE_DIR, "missing"))).projects).toEqual([]);
  });
});

describe("deleteMemory", () => {
  test("removes the file and only the index lines that link to it", async () => {
    const dir = await copyFixture();
    const result = await deleteMemory(dir, "-Users-test-app", "feedback-tests.md");
    const memoryDir = join(dir, "projects", "-Users-test-app", "memory");
    expect(result.removedIndexLines).toEqual(["- [Testing feedback](./feedback-tests.md) — how to test"]);
    await expect(access(join(memoryDir, "feedback-tests.md"))).rejects.toThrow();
    expect(await readFile(join(memoryDir, "MEMORY.md"), "utf8")).toBe(
      "- [User role](user-role.md) — who the user is\n- [Gone](gone.md) — points to a file that no longer exists\n",
    );
  });

  test("leaves the index untouched when no line links to the file", async () => {
    const dir = await copyFixture();
    const indexPath = join(dir, "projects", "-Users-test-app", "memory", "MEMORY.md");
    const before = await readFile(indexPath, "utf8");
    expect((await deleteMemory(dir, "-Users-test-app", "unlisted.md")).removedIndexLines).toEqual([]);
    expect(await readFile(indexPath, "utf8")).toBe(before);
  });

  test.each([
    ["a path outside the memory folder", "-Users-test-app", "../session.jsonl", "invalid file"],
    [
      "a parent-relative markdown path",
      "-Users-test-app",
      "../../-Users-test-lib/memory/reference-docs.md",
      "invalid file",
    ],
    ["the index itself", "-Users-test-app", "MEMORY.md", "refusing to delete the index"],
    ["a project id with a slash", "../etc", "x.md", "invalid project"],
    ["a file that isn't markdown", "-Users-test-app", "notes.txt", "invalid file"],
  ])("refuses %s", async (_, projectId, file, message) => {
    const dir = await copyFixture();
    await expect(deleteMemory(dir, projectId, file)).rejects.toThrow(message);
  });

  test("reports a memory that is already gone", async () => {
    const dir = await copyFixture();
    await expect(deleteMemory(dir, "-Users-test-app", "gone.md")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
