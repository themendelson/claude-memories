import type { ReactNode } from "react";
import { useApp } from "#app/context.ts";
import { groupByType, projectLabel, projectName, timeAgo } from "#app/format.ts";
import { href } from "#app/route.ts";
import { MemoryRow, Page, TypeBadge, TypeBar } from "#app/views/parts.tsx";
import type { Project } from "#shared/types.ts";

function Stat({ value, children }: { value: number; children: ReactNode }): ReactNode {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{children}</div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }): ReactNode {
  const { snapshot } = useApp();
  const newest = project.memories[0];
  return (
    <a className="card project-card" href={href.project(project.id)}>
      <div className="card-top">
        <span className="card-title">{projectName(project, snapshot.home)}</span>
        <span className="big-count">{project.memories.length}</span>
      </div>
      <div className="mono muted small">{projectLabel(project, snapshot.home)}</div>
      <TypeBar memories={project.memories} />
      {newest !== undefined && <div className="muted small">Updated {timeAgo(newest.modified)}</div>}
    </a>
  );
}

export function Home(): ReactNode {
  const { snapshot } = useApp();
  const withMemories = snapshot.projects.filter((project) => project.memories.length > 0);
  const located = withMemories.flatMap((project) => project.memories.map((memory) => ({ project, memory })));
  const recent = located.toSorted((a, b) => b.memory.modified.localeCompare(a.memory.modified)).slice(0, 6);

  return (
    <Page>
      <header className="page-head">
        <h1>All memories</h1>
        <p className="muted">
          Every memory file under <span className="mono">{snapshot.configDir}/projects/*/memory</span>
        </p>
      </header>
      <div className="stats">
        <Stat value={located.length}>memories</Stat>
        <Stat value={withMemories.length}>projects with memories</Stat>
        {groupByType(located.map((entry) => entry.memory)).map(([type, group]) => (
          <Stat key={type} value={group.length}>
            <TypeBadge type={type} />
          </Stat>
        ))}
      </div>
      {withMemories.length === 0 ? (
        <p className="muted">No memories yet. Claude Code saves them as you work, one folder per project.</p>
      ) : (
        <>
          <h2 className="section-title">Projects</h2>
          <div className="grid">
            {withMemories.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <h2 className="section-title">Recently changed</h2>
          <div className="list">
            {recent.map(({ project, memory }) => (
              <MemoryRow key={project.id + memory.file} memory={memory} project={project} showProject />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
