import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useApp } from "#app/context.ts";
import { formatDate, projectName, timeAgo } from "#app/format.ts";
import { Markdown } from "#app/Markdown.tsx";
import { href } from "#app/route.ts";
import { DeleteDialog } from "#app/views/DeleteDialog.tsx";
import { Crumbs, Page, TypeBadge } from "#app/views/parts.tsx";
import { isRecord } from "#shared/guards.ts";
import type { Located } from "#shared/links.ts";
import { backlinks, resolveWikiLink, wikiTargets } from "#shared/links.ts";
import type { Memory, Project } from "#shared/types.ts";

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function metaRows(memory: Memory): [string, unknown][] {
  return Object.entries(memory.frontmatter)
    .filter(([key]) => key !== "name" && key !== "description")
    .flatMap(([key, value]): [string, unknown][] =>
      isRecord(value) ? Object.entries(value).map(([inner, v]) => [`${key}.${inner}`, v]) : [[key, value]],
    );
}

function Frontmatter({ memory }: { memory: Memory }): ReactNode {
  const rows = metaRows(memory);
  if (rows.length === 0) return null;
  return (
    <details className="card meta">
      <summary>Frontmatter</summary>
      <table className="meta-table">
        <tbody>
          {rows.map(([key, value]) => (
            <tr key={key}>
              <th>{key}</th>
              <td className="mono">{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function LinkItem({ entry, from }: { entry: Located; from: Project }): ReactNode {
  const { snapshot } = useApp();
  return (
    <li>
      <a href={href.memory(entry.project.id, entry.memory.file)}>{entry.memory.name}</a>
      {entry.project !== from && <span className="muted small"> in {projectName(entry.project, snapshot.home)}</span>}
    </li>
  );
}

function Links({
  project,
  outgoing,
  incoming,
}: {
  project: Project;
  outgoing: OutgoingLink[];
  incoming: Located[];
}): ReactNode {
  if (outgoing.length === 0 && incoming.length === 0) return null;
  return (
    <div className="links">
      {outgoing.length > 0 && (
        <div>
          <h3 className="section-title small-title">Links to</h3>
          <ul>
            {outgoing.map(({ name, target }) =>
              target === null ? (
                <li key={name}>
                  <span className="wikilink missing">{name}</span>
                  <span className="muted small"> not written yet</span>
                </li>
              ) : (
                <LinkItem key={name} entry={target} from={project} />
              ),
            )}
          </ul>
        </div>
      )}
      {incoming.length > 0 && (
        <div>
          <h3 className="section-title small-title">Linked from</h3>
          <ul>
            {incoming.map((entry) => (
              <LinkItem key={entry.project.id + entry.memory.file} entry={entry} from={project} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface OutgoingLink {
  name: string;
  target: Located | null;
}

function Header({ memory, onDelete }: { memory: Memory; onDelete: () => void }): ReactNode {
  return (
    <header className="page-head">
      <div className="title-row">
        <h1>{memory.name}</h1>
        <TypeBadge type={memory.type} />
        <button type="button" className="danger-button" onClick={onDelete}>
          Delete
        </button>
      </div>
      {memory.description !== null && <p className="lede">{memory.description}</p>}
      <div className="meta-line muted small">
        <span title={new Date(memory.modified).toLocaleString()}>
          Modified {formatDate(memory.modified)} ({timeAgo(memory.modified)})
        </span>
        <span>{memory.size.toLocaleString()} bytes</span>
        <span className="mono">{memory.path}</span>
      </div>
    </header>
  );
}

export function MemoryView({ project, memory }: { project: Project; memory: Memory }): ReactNode {
  const { snapshot, reload } = useApp();
  const all = snapshot.projects;
  const [raw, setRaw] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const outgoing = useMemo(
    () => [...new Set(wikiTargets(memory.body))].map((name) => ({ name, target: resolveWikiLink(name, project, all) })),
    [memory, project, all],
  );
  const incoming = useMemo(() => backlinks({ project, memory }, all), [memory, project, all]);

  const onDeleted = (): void => {
    location.hash = href.project(project.id);
    reload();
  };

  return (
    <Page>
      <Crumbs project={project} file={memory.file} />
      <Header memory={memory} onDelete={() => setConfirming(true)} />
      {confirming && (
        <DeleteDialog
          {...{ project, memory, onDeleted }}
          backlinkCount={incoming.length}
          onCancel={() => setConfirming(false)}
        />
      )}
      {memory.frontmatterError !== null && (
        <div className="notice error">Frontmatter did not parse: {memory.frontmatterError}</div>
      )}
      <div className="tabs">
        <button type="button" className={`tab${raw ? "" : " active"}`} onClick={() => setRaw(false)}>
          Rendered
        </button>
        <button type="button" className={`tab${raw ? " active" : ""}`} onClick={() => setRaw(true)}>
          Raw file
        </button>
      </div>
      {raw ? (
        <pre className="card raw">{memory.raw}</pre>
      ) : (
        <>
          <Frontmatter memory={memory} />
          <article className="card doc">
            <Markdown source={memory.body} project={project} all={all} />
          </article>
        </>
      )}
      <Links project={project} outgoing={outgoing} incoming={incoming} />
    </Page>
  );
}
