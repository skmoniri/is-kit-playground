
import {
  ArrowRight,
  Boxes,
  Braces,
  CircleHelp,
  GitBranch,
  GitMerge,
  Layers3,
  ScanSearch,
  Sparkles,
} from "lucide-react";

import { EXAMPLES } from "../../data/examples";

import type { ExampleId } from "../../types/playground";
import type { WorkspaceTool } from "../../types/object-shape";

type SidebarProps = {
  activeTool: WorkspaceTool;
  activeExample: ExampleId | null;
  onChangeTool: (tool: WorkspaceTool) => void;
  onLoadExample: (id: ExampleId) => void;
};

export function Sidebar({
  activeTool,
  activeExample,
  onChangeTool,
  onLoadExample,
}: SidebarProps) {
  const tools = [
    {
      id: "composer",
      label: "Guard Composer",
      icon: GitBranch,
    },
    {
      id: "shape",
      label: "Object Shape Builder",
      icon: Braces,
    },
    {
      id: "collection",
      label: "Collection Explorer",
      icon: Boxes,
    },
    {
      id: "union",
      label: "Union Explorer",
      icon: GitMerge,
    },
    {
      id: "narrowing",
      label: "Type Narrowing",
      icon: ScanSearch,
    },
  ] as const;

  return (
    <aside className="sidebar">
      <div className="sidebar-heading">
        <Layers3 size={15} />
        <span>WORKSPACE</span>
      </div>

      {tools.map((tool) => {
        const Icon = tool.icon;

        return (
          <button
            key={tool.id}
            type="button"
            className={`sidebar-tool ${
              activeTool === tool.id
                ? "sidebar-active"
                : ""
            }`}
            onClick={() => onChangeTool(tool.id)}
            aria-pressed={activeTool === tool.id}
          >
            <Icon size={17} />
            <span>{tool.label}</span>
          </button>
        );
      })}

      <div className="sidebar-heading examples-heading">
        <Sparkles size={15} />
        <span>EXAMPLES</span>
      </div>

      <div className="examples-list">
        {EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            className={`example-button ${
              activeTool === "composer" &&
              activeExample === example.id
                ? "selected"
                : ""
            }`}
            onClick={() => onLoadExample(example.id)}
            title={example.description}
          >
            <span>{example.title}</span>
            <ArrowRight size={14} />
          </button>
        ))}
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <CircleHelp size={17} />

          <p>
            Compose guards, build object schemas,
            explore collections and unions, inspect
            type narrowing, and copy real TypeScript.
          </p>
        </div>

        <a
          href="https://github.com/necoz-oss/is-kit"
          target="_blank"
          rel="noopener noreferrer"
          className="library-credit"
        >
          Powered by is-kit
          <ArrowRight size={14} />
        </a>
      </div>
    </aside>
  );
}
