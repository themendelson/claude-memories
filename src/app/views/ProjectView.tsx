import type { ReactNode } from "react";
import { useApp } from "#app/context.ts";
import { groupByType, projectName } from "#app/format.ts";
import { Markdown } from "#app/Markdown.tsx";
import { href } from "#app/route.ts";
import { Crumbs, MemoryRow, Page, TypeBadge } from "#app/views/parts.tsx";
import { indexedFiles } from "#shared/links.ts";
import type { Project } from "#shared/types.ts";

function IndexHealth({ project }: { project: Project }): ReactNode {
  if (project.index === null) return null;
  const indexed = indexedFiles(project.index);
  const unlisted = project.memories.filter((memory) => !indexed.has(memory.file));
  const dead = [...indexed].filter((file) => !project.memories.some((memory) => memory.file === file));
  if (unlisted.length === 0 && dead.length === 0) return null;
  return (
    <div className="notice">
      {unlisted.length > 0 && (
        <div>
          {unlisted.length} not listed in MEMORY.md:{" "}
          {unlisted.map((memory, i) => (
            <span key={memory.file}>
              {i > 0 && ", "}
              <a href={href.memory(project.id, memory.file)}>{memory.name}</a>
            </span>
          ))}
        </div>
      )}
      {dead.length > 0 && (
        <div>
          MEMORY.md points to missing files: <span className="mono">{dead.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

function MemoryGroups({ project }: { project: Project }): ReactNode {
  if (project.memories.length === 0) return <p className="muted">No memories saved for this project yet.</p>;
  return (
    <>
      <IndexHealth project={project} />
      {groupByType(project.memories).map(([type, memories]) => (
        <section key={type}>
          <h2 className="section-title">
            <TypeBadge type={type} /> <span className="muted">{memories.length}</span>
          </h2>
          <div className="list">
            {memories.map((memory) => (
              <MemoryRow key={memory.file} memory={memory} project={project} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function ProjectView({ project, tab }: { project: Project; tab: "memories" | "index" }): ReactNode {
  const { snapshot } = useApp();
  return (
    <Page>
      <Crumbs project={project} />
      <header className="page-head">
        <h1>{projectName(project, snapshot.home)}</h1>
        <div className="mono muted small">{project.path}</div>
        <div className="mono muted small">{project.memoryDir}</div>
      </header>
      <div className="tabs">
        <a className={`tab${tab === "memories" ? " active" : ""}`} href={href.project(project.id)}>
          Memories <span className="count">{project.memories.length}</span>
        </a>
        <a className={`tab${tab === "index" ? " active" : ""}`} href={href.index(project.id)}>
          MEMORY.md
        </a>
      </div>
      {tab === "memories" && <MemoryGroups project={project} />}
      {tab === "index" &&
        (project.index === null ? (
          <p className="muted">This project has no MEMORY.md index.</p>
        ) : (
          <div className="card doc">
            <Markdown source={project.index} project={project} all={snapshot.projects} />
          </div>
        ))}
    </Page>
  );
}
