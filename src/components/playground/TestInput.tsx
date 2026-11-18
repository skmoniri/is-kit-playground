
import { FlaskConical } from "lucide-react";

import { ParsingModeSelector } from "./ParsingModeSelector";

import type {
  ParsingMode,
} from "../../lib/safe-parsing";

type TestInputProps = {
  input: string;
  onChange: (value: string) => void;
  parsingMode: ParsingMode;
  onChangeParsingMode: (mode: ParsingMode) => void;
};

const QUICK_VALUES = [
  { label: "String", value: '"hello"' },
  { label: "Number", value: "42" },
  { label: "Boolean", value: "true" },
  { label: "Null", value: "null" },
  { label: "Object", value: '{"age":22}' },
  { label: "Array", value: "[1,2,3]" },
];

export function TestInput({
  input,
  onChange,
  parsingMode,
  onChangeParsingMode,
}: TestInputProps) {
  return (
    <section className="panel input-panel">
      <div className="panel-header compact">
        <div className="panel-label">
          <FlaskConical size={16} />
          TEST INPUT
        </div>

        <span className="panel-index">02 / TEST</span>
      </div>

      <p className="panel-subtitle">
        Enter a JSON value and choose how is-kit
        should evaluate it.
      </p>

      <ParsingModeSelector
        mode={parsingMode}
        onChange={onChangeParsingMode}
      />

      <div className="editor-wrapper">
        <div className="editor-topline">
          <span>input.json</span>
          <span>JSON</span>
        </div>

        <textarea
          spellCheck={false}
          aria-label="JSON test input"
          value={input}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="json-editor"
        />
      </div>

      <div className="quick-values">
        <span>TRY:</span>

        {QUICK_VALUES.map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
