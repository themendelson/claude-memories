export type Frontmatter = Record<string, unknown>;

export interface Memory {
  file: string;
  path: string;
  name: string;
  description: string | null;
  type: string | null;
  frontmatter: Frontmatter;
  frontmatterError: string | null;
  body: string;
  raw: string;
  modified: string;
  size: number;
}

export interface Project {
  id: string;
  path: string;
  memoryDir: string;
  index: string | null;
  memories: Memory[];
}

export interface Snapshot {
  home: string;
  configDir: string;
  projects: Project[];
}

export interface DeleteResult {
  removedIndexLines: string[];
}
