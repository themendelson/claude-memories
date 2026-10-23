import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { deleteMemory } from "#app/data.ts";
import { errorMessage } from "#shared/guards.ts";
import { indexLinesFor } from "#shared/links.ts";
import type { Memory, Project } from "#shared/types.ts";

interface Props {
  project: Project;
  memory: Memory;
  backlinkCount: number;
  onCancel: () => void;
  onDeleted: () => void;
}

function IndexChange({ project, memory }: Pick<Props, "project" | "memory">): ReactNode {
  const lines = indexLinesFor(project.index, memory.file);
  if (lines.length === 0) {
    return (
      <div className="small">
        {project.index === null ? "This project has no index." : "No index line links to this file."}
      </div>
    );
  }
  return (
    <>
      <div className="small">{lines.length === 1 ? "This line" : `These ${lines.length} lines`} will be removed:</div>
      {lines.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: index lines can repeat verbatim
        <div key={i} className="mono strike">
          {line}
        </div>
      ))}
    </>
  );
}

export function DeleteDialog({ project, memory, backlinkCount, onCancel, onDeleted }: Props): ReactNode {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const remove = (): void => {
    setBusy(true);
    setError(null);
    deleteMemory(project.id, memory.file).then(onDeleted, (reason: unknown) => {
      setError(errorMessage(reason));
      setBusy(false);
    });
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog card" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <h2 id="delete-title">Delete “{memory.name}”?</h2>
        <p>This permanently removes the file. It does not go to the Trash.</p>
        <div className="dialog-section">
          <div className="muted small">File</div>
          <div className="mono">{memory.path}</div>
        </div>
        <div className="dialog-section">
          <div className="muted small">MEMORY.md</div>
          <IndexChange project={project} memory={memory} />
        </div>
        {backlinkCount > 0 && (
          <div className="notice">
            {backlinkCount} other {backlinkCount === 1 ? "memory links" : "memories link"} to this one with [[…]]. Those
            links will show as missing.
          </div>
        )}
        {error !== null && <div className="notice error">Delete failed: {error}</div>}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="button danger" onClick={remove} disabled={busy}>
            {busy ? "Deleting…" : "Delete memory"}
          </button>
        </div>
      </div>
    </div>
  );
}
