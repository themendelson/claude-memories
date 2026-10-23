import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { AppContext } from "#app/context.ts";
import { SnapshotContext, useApp } from "#app/context.ts";
import { useSnapshot } from "#app/data.ts";
import { excerpt, search } from "#app/format.ts";
import type { Route } from "#app/route.ts";
import { parseRoute } from "#app/route.ts";
import { Home } from "#app/views/Home.tsx";
import { MemoryView } from "#app/views/MemoryView.tsx";
import { ProjectView } from "#app/views/ProjectView.tsx";
import { MemoryRow, Page } from "#app/views/parts.tsx";
import { Sidebar } from "#app/views/Sidebar.tsx";

function useHash(): string {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = (): void => {
      setHash(location.hash);
      document.querySelector(".main")?.scrollTo(0, 0);
    };
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function Gone({ back }: { back: string }): ReactNode {
  return (
    <Page>
      <p className="muted">
        This no longer exists. <a href={back}>Go back</a>
      </p>
    </Page>
  );
}

function RouteView({ route }: { route: Route }): ReactNode {
  const { snapshot } = useApp();
  if (route.view === "home") return <Home />;
  const project = snapshot.projects.find((candidate) => candidate.id === route.projectId);
  if (project === undefined) return <Gone back="#/" />;
  if (route.view === "project") return <ProjectView project={project} tab={route.tab} />;
  const memory = project.memories.find((candidate) => candidate.file === route.file);
  if (memory === undefined) return <Gone back={`#/p/${encodeURIComponent(project.id)}`} />;
  return <MemoryView key={memory.path} project={project} memory={memory} />;
}

function SearchResults({ query }: { query: string }): ReactNode {
  const { snapshot } = useApp();
  const results = search(snapshot.projects, query, snapshot.home);
  return (
    <Page>
      <header className="page-head">
        <h1>Search</h1>
        <p className="muted">
          {results.length} {results.length === 1 ? "memory matches" : "memories match"} “{query.trim()}”
        </p>
      </header>
      <div className="list">
        {results.map(({ project, memory }) => (
          <MemoryRow
            key={project.id + memory.file}
            memory={memory}
            project={project}
            detail={excerpt(memory.body, query)}
            showProject
          />
        ))}
      </div>
    </Page>
  );
}

function StaleBanner({
  error,
  loadedAt,
  onRetry,
}: {
  error: string;
  loadedAt: Date | null;
  onRetry: () => void;
}): ReactNode {
  return (
    <div className="stale-banner" role="alert">
      <span>
        Couldn't refresh memories ({error}).
        {loadedAt !== null && ` Showing what was read at ${loadedAt.toLocaleTimeString()}.`} Is claude-memories still
        running?
      </span>
      <button type="button" className="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function App(): ReactNode {
  const hash = useHash();
  const route = parseRoute(hash);
  const { snapshot, error, loadedAt, reload } = useSnapshot();
  const [typed, setTyped] = useState({ hash, query: "" });
  const query = typed.hash === hash ? typed.query : "";
  const context = useMemo(
    (): AppContext | null => (snapshot === null ? null : { snapshot, reload }),
    [snapshot, reload],
  );

  if (context === null) {
    return (
      <div className={`center${error === null ? " muted" : " error"}`}>
        {error === null ? "Reading memories…" : `Could not load memories: ${error}`}
      </div>
    );
  }

  return (
    <SnapshotContext.Provider value={context}>
      <div className="layout">
        <Sidebar
          activeId={route.view === "home" ? null : route.projectId}
          query={query}
          onQuery={(next) => setTyped({ hash, query: next })}
          loadedAt={loadedAt}
        />
        <main className="main">
          {error !== null && <StaleBanner error={error} loadedAt={loadedAt} onRetry={reload} />}
          {query.trim() === "" ? <RouteView route={route} /> : <SearchResults query={query} />}
        </main>
      </div>
    </SnapshotContext.Provider>
  );
}
