import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";

export const FIXTURE_DIR: string = fileURLToPath(new URL("./fixtures/claude", import.meta.url));

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

export async function copyFixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "claude-memories-"));
  created.push(dir);
  await cp(FIXTURE_DIR, dir, { recursive: true });
  return dir;
}
