
import {
  RotateCcw,
  Undo2,
  Redo2,
} from "lucide-react";

import type { WorkspaceTool } from "../../types/object-shape";

type WorkspaceHeaderProps = {
  activeTool: WorkspaceTool;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const WORKSPACE_INFO: Record<
  WorkspaceTool,
  {
    title: string;
    description: string;
  }
> = {
  composer: {
    title: "Guard Composer",
    description:
      "Build, combine, and test TypeScript type guards without leaving your browser.",
  },
  shape: {
    title: "Object Shape Builder",
    description:
      "Define object schemas, validate JSON data, and generate TypeScript using struct().",
  },
  collection: {
    title: "Collection Guard Explorer",
    description:
      "Explore arrays, tuples, sets, maps, and records using real is-kit guards.",
  },
  union: {
    title: "Union Explorer",
    description:
      "Experiment with guard unions, literal values, and typed discriminated unions.",
  },
  narrowing: {
    title: "Type Narrowing Explorer",
    description:
      "Explore how is-kit guards narrow unknown values into useful TypeScript types.",
  },
};

export function WorkspaceHeader({
  activeTool,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: WorkspaceHeaderProps) {
  const info = WORKSPACE_INFO[activeTool];

  return (
    <div className="workspace-heading">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-line" />
          INTERACTIVE WORKSPACE
        </div>

        <h1>{info.title}</h1>

        <p>{info.description}</p>
      </div>

      <div className="workspace-history-actions">
        <button
          type="button"
          className="reset-button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last change"
          aria-label="Undo"
        >
          <Undo2 size={15} />
          Undo
        </button>

        <button
          type="button"
          className="reset-button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo last change"
          aria-label="Redo"
        >
          <Redo2 size={15} />
          Redo
        </button>

        <button
          type="button"
          className="reset-button"
          onClick={onReset}
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>
    </div>
  );
}
