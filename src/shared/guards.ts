import type { DeleteResult, Frontmatter, Memory, Project, Snapshot } from "#shared/types.ts";

export function isRecord(value: unknown): value is Frontmatter {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isString = (value: unknown): value is string => typeof value === "string";
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);

function isMemory(value: unknown): value is Memory {
  if (!isRecord(value)) return false;
  return (
    isString(value.file) &&
    isString(value.path) &&
    isString(value.name) &&
    isNullableString(value.description) &&
    isNullableString(value.type) &&
    isRecord(value.frontmatter) &&
    isNullableString(value.frontmatterError) &&
    isString(value.body) &&
    isString(value.raw) &&
    isString(value.modified) &&
    typeof value.size === "number"
  );
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.path) &&
    isString(value.memoryDir) &&
    isNullableString(value.index) &&
    Array.isArray(value.memories) &&
    value.memories.every(isMemory)
  );
}

export function isSnapshot(value: unknown): value is Snapshot {
  if (!isRecord(value)) return false;
  return (
    isString(value.home) &&
    isString(value.configDir) &&
    Array.isArray(value.projects) &&
    value.projects.every(isProject)
  );
}

export function isDeleteResult(value: unknown): value is DeleteResult {
  return isRecord(value) && isStringArray(value.removedIndexLines);
}

export function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (isRecord(value) && isString(value.error)) return value.error;
  return String(value);
}
