import { useCallback, useEffect, useState } from "react";
import { errorMessage, isDeleteResult, isSnapshot } from "#shared/guards.ts";
import type { DeleteResult, Snapshot } from "#shared/types.ts";

async function readJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body === null ? response.statusText : errorMessage(body));
  return body;
}

export interface SnapshotState {
  snapshot: Snapshot | null;
  error: string | null;
  loadedAt: Date | null;
  reload: () => void;
}

export function useSnapshot(): SnapshotState {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const reload = useCallback(() => {
    fetch("/api/snapshot")
      .then(readJson)
      .then((body) => {
        if (!isSnapshot(body)) throw new Error("unexpected response from /api/snapshot");
        setSnapshot(body);
        setError(null);
        setLoadedAt(new Date());
      })
      .catch((reason: unknown) => setError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    reload();
    addEventListener("focus", reload);
    return () => removeEventListener("focus", reload);
  }, [reload]);

  return { snapshot, error, loadedAt, reload };
}

export async function deleteMemory(projectId: string, file: string): Promise<DeleteResult> {
  const params = new URLSearchParams({ project: projectId, file });
  const body = await readJson(await fetch(`/api/memory?${params.toString()}`, { method: "DELETE" }));
  if (!isDeleteResult(body)) throw new Error("unexpected response from /api/memory");
  return body;
}
