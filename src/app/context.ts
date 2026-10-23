import { createContext, useContext } from "react";
import type { Snapshot } from "#shared/types.ts";

export interface AppContext {
  snapshot: Snapshot;
  reload: () => void;
}

export const SnapshotContext = createContext<AppContext | null>(null);

export function useApp(): AppContext {
  const value = useContext(SnapshotContext);
  if (value === null) throw new Error("useApp needs a SnapshotContext provider");
  return value;
}
