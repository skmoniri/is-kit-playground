
import { Braces } from "lucide-react";

import type { ParsingMode } from "../../lib/safe-parsing";

type ParsingModeSelectorProps = {
  mode: ParsingMode;
  onChange: (mode: ParsingMode) => void;
};

const PARSING_MODES: {
  value: ParsingMode;
  label: string;
  description: string;
}[] = [
  {
    value: "direct",
    label: "Direct",
    description: "Run guard directly",
  },
  {
    value: "safeParse",
    label: "safeParse",
    description: "Validate a JS value",
  },
  {
    value: "safeJsonParse",
    label: "safeJsonParse",
    description: "Parse and validate JSON",
  },
];

export function ParsingModeSelector({
  mode,
  onChange,
}: ParsingModeSelectorProps) {
  return (
    <div className="parsing-mode-section">
      <div className="parsing-mode-heading">
        <Braces size={13} />
        PARSING MODE
      </div>

      <div
        className="parsing-mode-options"
        role="group"
        aria-label="Parsing mode"
      >
        {PARSING_MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`parsing-mode-button ${
              mode === option.value ? "active" : ""
            }`}
            onClick={() => onChange(option.value)}
            aria-pressed={mode === option.value}
          >
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
