import type { ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { href } from "#app/route.ts";
import { expandWikiLinks, resolveFileLink, resolveWikiLink } from "#shared/links.ts";
import type { Project } from "#shared/types.ts";

interface Context {
  project: Project;
  all: Project[];
}

const WIKI = "wikilink:";

function Missing({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <span className="wikilink missing" title={title}>
      {children}
    </span>
  );
}

function WikiLink({ name, children, project, all }: Context & { name: string; children: ReactNode }): ReactNode {
  const target = resolveWikiLink(name, project, all);
  if (target === null) return <Missing title="No memory with this name yet">{children}</Missing>;
  return (
    <a
      className="wikilink"
      href={href.memory(target.project.id, target.memory.file)}
      title={target.memory.description ?? ""}
    >
      {children}
      {target.project !== project && <span className="wikilink-scope"> ↗</span>}
    </a>
  );
}

function Link({ target, children, project, all }: Context & { target: string; children: ReactNode }): ReactNode {
  if (target.startsWith(WIKI)) {
    const name = decodeURIComponent(target.slice(WIKI.length));
    return <WikiLink {...{ name, project, all }}>{children}</WikiLink>;
  }
  if (target.startsWith("#")) return <a href={target}>{children}</a>;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
    return (
      <a href={target} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  const memory = resolveFileLink(target, project);
  if (memory === null) return <Missing title={`File not found: ${target}`}>{children}</Missing>;
  return <a href={href.memory(project.id, memory.file)}>{children}</a>;
}

export function Markdown({ source, project, all }: Context & { source: string }): ReactNode {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => (url.startsWith(WIKI) ? url : defaultUrlTransform(url))}
        components={{
          a: ({ href: target = "", children }) => <Link {...{ target, project, all }}>{children}</Link>,
        }}
      >
        {expandWikiLinks(source)}
      </ReactMarkdown>
    </div>
  );
}
