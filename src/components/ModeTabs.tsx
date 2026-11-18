
import { Code2, GitBranch } from "lucide-react";

export type EditorMode = "visual" | "code";

type ModeTabsProps = {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
};

export function ModeTabs({
  mode,
  onChange,
}: ModeTabsProps) {
  return (
    <div className="mode-tabs" role="group" aria-label="Workspace mode">
      <button
        type="button"
        className={`mode-tab ${mode === "visual" ? "active" : ""}`}
        aria-pressed={mode === "visual"}
        onClick={() => onChange("visual")}
      >
        <GitBranch size={16} />
        Visual Mode
      </button>

      <button
        type="button"
        className={`mode-tab ${mode === "code" ? "active" : ""}`}
        aria-pressed={mode === "code"}
        onClick={() => onChange("code")}
      >
        <Code2 size={16} />
        Code Mode
      </button>
    </div>
  );
}
