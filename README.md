<h1 align="center">Claude Memories</h1>

<p align="center">See, search and delete every memory Claude Code has saved on your machine</p>

<p align="center">
  <a href="https://www.npmjs.com/package/claude-memories"><img src="https://img.shields.io/npm/v/claude-memories" alt="npm"></a>
  <a href="https://github.com/themendelson/claude-memories/actions/workflows/ci.yml"><img src="https://github.com/themendelson/claude-memories/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

```sh
npx claude-memories
```

Claude Code's auto memory writes a markdown file for each thing it decides to remember, in one folder per
project. They pile up, they go stale, and the built-in `/memory` command only shows the current project.
This opens all of them in your browser:

- Every project's memories in one place, grouped by type (user, feedback, project, reference)
- Rendered markdown, frontmatter, and the raw file
- `[[links]]` between memories, including links to memories that were never written
- Memories missing from `MEMORY.md`, and index lines pointing to files that are gone
- Search across every project
- Delete a memory and its `MEMORY.md` line in one step

Everything stays on your machine: the server listens on 127.0.0.1 and reads `~/.claude` directly.

## Options

```text
--port <n>      port to listen on (default: 5190, or the next free one)
--dir <path>    Claude config directory (default: $CLAUDE_CONFIG_DIR or ~/.claude)
--no-open       don't open the browser
```

Requires Node.js 20.19 or later.

## License

MIT
