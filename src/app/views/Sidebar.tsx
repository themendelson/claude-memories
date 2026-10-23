import type { ReactNode } from "react";
import { useState } from "react";
import { useApp } from "#app/context.ts";
import { projectName } from "#app/format.ts";
import { href } from "#app/route.ts";
import type { Project } from "#shared/types.ts";

function NavItem({ project, active }: { project: Project; active: boolean }): ReactNode {
  const { snapshot } = useApp();
  const classes = ["nav-item", active ? "active" : "", project.memories.length === 0 ? "empty" : ""];
  return (
    <a className={classes.filter(Boolean).join(" ")} href={href.project(project.id)}>
      <span className="nav-name" title={project.path}>
        {projectName(project, snapshot.home)}
      </span>
      <span className="count">{project.memories.length}</span>
    </a>
  );
}

interface Props {
  activeId: string | null;
  query: string;
  onQuery: (query: string) => void;
  loadedAt: Date | null;
}

export function Sidebar({ activeId, query, onQuery, loadedAt }: Props): ReactNode {
  const { snapshot, reload } = useApp();
  const [showEmpty, setShowEmpty] = useState(false);
  const withMemories = snapshot.projects.filter((project) => project.memories.length > 0);
  const empty = snapshot.projects.filter((project) => project.memories.length === 0);

  return (
    <aside className="sidebar">
      <a className="brand" href={href.home()}>
        <span className="brand-mark">◆</span> Claude Memories
      </a>
      <input
        className="search"
        type="search"
        placeholder="Search all memories…"
        aria-label="Search all memories"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      <nav className="project-list">
        <div className="nav-heading">Projects</div>
        {withMemories.map((project) => (
          <NavItem key={project.id} project={project} active={project.id === activeId} />
        ))}
        {empty.length > 0 && (
          <button type="button" className="nav-toggle" onClick={() => setShowEmpty((shown) => !shown)}>
            {showEmpty ? "▾" : "▸"} {empty.length} without memories
          </button>
        )}
        {showEmpty &&
          empty.map((project) => <NavItem key={project.id} project={project} active={project.id === activeId} />)}
      </nav>
      <div className="sidebar-foot">
        <button type="button" className="link-button" onClick={reload}>
          Reload
        </button>
        {loadedAt !== null && <span className="muted"> · read {loadedAt.toLocaleTimeString()}</span>}
      </div>
    </aside>
  );
}
