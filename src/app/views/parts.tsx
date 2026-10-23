import type { ReactNode } from "react";
import { useApp } from "#app/context.ts";
import { groupByType, projectName, timeAgo } from "#app/format.ts";
import { href } from "#app/route.ts";
import type { Memory, Project } from "#shared/types.ts";

export function TypeBadge({ type }: { type: string | null }): ReactNode {
  const name = type ?? "untyped";
  return <span className={`badge t-${name}`}>{name}</span>;
}

export function TypeBar({ memories }: { memories: Memory[] }): ReactNode {
  return (
    <div className="typebar" role="img" aria-label="Memory types">
      {groupByType(memories).map(([type, group]) => (
        <span
          key={type}
          className={`typebar-seg t-${type}`}
          style={{ flexGrow: group.length }}
          title={`${group.length} ${type}`}
        />
      ))}
    </div>
  );
}

function Ago({ iso }: { iso: string }): ReactNode {
  return (
    <span className="muted small" title={new Date(iso).toLocaleString()}>
      {timeAgo(iso)}
    </span>
  );
}

interface RowProps {
  memory: Memory;
  project: Project;
  showProject?: boolean;
  detail?: string;
}

export function MemoryRow({ memory, project, showProject = false, detail }: RowProps): ReactNode {
  const { snapshot } = useApp();
  const description = detail ?? memory.description;
  return (
    <a className="card row" href={href.memory(project.id, memory.file)}>
      <div className="row-main">
        <div className="row-title">
          <span className="card-title">{memory.name}</span>
          {showProject && <span className="muted small"> · {projectName(project, snapshot.home)}</span>}
        </div>
        {description !== null && <div className="row-desc">{description}</div>}
      </div>
      <div className="row-side">
        <TypeBadge type={memory.type} />
        <Ago iso={memory.modified} />
      </div>
    </a>
  );
}

export function Crumbs({ project, file }: { project?: Project; file?: string }): ReactNode {
  const { snapshot } = useApp();
  return (
    <nav className="crumbs">
      <a href={href.home()}>All</a>
      {project !== undefined && (
        <>
          <span>/</span>
          {file === undefined ? (
            <span>{projectName(project, snapshot.home)}</span>
          ) : (
            <a href={href.project(project.id)}>{projectName(project, snapshot.home)}</a>
          )}
        </>
      )}
      {file !== undefined && (
        <>
          <span>/</span>
          <span>{file}</span>
        </>
      )}
    </nav>
  );
}

export function Page({ children }: { children: ReactNode }): ReactNode {
  return <div className="page">{children}</div>;
}
