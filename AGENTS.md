# claude-memories

A local web app for the memories Claude Code saves under `~/.claude/projects/*/memory/`: browse them by
project, read them rendered, search them, and delete them along with their `MEMORY.md` line.
`npx claude-memories` starts it; the published package has no runtime dependencies.

## Commands

```bash
pnpm install
pnpm dev                    # the app with hot reload on :5190, reading your real ~/.claude
pnpm check                  # lint + typecheck + tests: the gate before "done"
pnpm test test/store.test.ts
pnpm build                  # vite builds the app into dist/app, tsdown bundles dist/cli.js
pnpm start -- --no-open     # run the built CLI
```

## Layout

- `src/cli.ts`: the `claude-memories` command. Parses flags, serves `dist/app` and the API on 127.0.0.1,
  opens the browser.
- `src/server/`: everything that touches the disk. `store.ts` reads and deletes memories, `frontmatter.ts`
  parses memory files, `api.ts` is the HTTP API (also mounted by `vite.config.ts` in dev), `static.ts`
  serves the built app.
- `src/shared/`: types, runtime guards for API responses, and link logic (`[[name]]` and `MEMORY.md`
  links). Runs in both Node and the browser.
- `src/app/`: the React UI. Talks to the server only over `/api`; routes live in the URL hash.
- `test/fixtures/claude/`: a fake Claude config dir. Tests that delete work on a temp copy of it.

## Rules the linter can't check

- No runtime dependencies. Anything the CLI needs is bundled by tsdown (`deps.onlyBundle`); the app's
  libraries are bundled by Vite. Both stay in `devDependencies`.
- Memory files belong to the user and to Claude Code. Only delete writes to disk, only inside a project's
  `memory/` folder, and it never deletes `MEMORY.md`. Any new write needs the same path checks in
  `src/server/store.ts` and a test that it refuses paths outside the folder.
- The server listens on 127.0.0.1 only and answers only requests addressed to a local host name from the
  same origin (`src/server/api.ts`). Keep it that way: other web pages can reach localhost.
- Read files leniently. Memory files are hand-written and often break strict YAML; show what parsed and
  never fail a whole project because of one file.
- Parse, don't cast: API responses are checked by the guards in `src/shared/guards.ts`. Casts are a lint
  error.
- Tests go through `loadSnapshot`, `deleteMemory`, the link helpers and the HTTP API against the fixture
  dir. No test reads the real `~/.claude`.
- Don't write comments. Name things so the code explains itself. The only exception is a why a reader
  can't get from the code: two lines at most, never narrating or restating. CI enforces the two-line
  limit and rejects commented-out code.

## Done means

`pnpm check` passes, UI changes were checked in the running app, the diff touches only what the task
needs, and the summary lists the commands you ran with their results.

PR titles follow Conventional Commits: `fix:`, `feat:` or `perf:`, a `!` before the colon for a
breaking change (`feat!:`), and `refactor:`, `test:`, `docs:`, `ci:` or `chore:` for internal work.
CI rejects other titles and labels the PR from its title; release notes are grouped by those labels.
PRs are squash-merged into `main`, so the title becomes the commit.
