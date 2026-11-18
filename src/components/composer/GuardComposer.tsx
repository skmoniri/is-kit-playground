
import {
  Braces,
  ChevronDown,
  GitBranch,
  Trash2,
} from "lucide-react";

import { GUARDS, guardLookup } from "../../data/guards";
import type {
  GuardName,
  Operator,
} from "../../types/playground";

import { GuardPicker } from "./GuardPicker";

type GuardComposerProps = {
  operator: Operator;
  selectedGuards: GuardName[];
  onChangeOperator: (operator: Operator) => void;
  onUpdateGuard: (index: number, name: GuardName) => void;
  onAddGuard: (name: GuardName) => void;
  onRemoveGuard: (index: number) => void;
};

const OPERATORS: Operator[] = ["or", "and", "not"];

export function GuardComposer({
  operator,
  selectedGuards,
  onChangeOperator,
  onUpdateGuard,
  onAddGuard,
  onRemoveGuard,
}: GuardComposerProps) {
  return (
    <section className="panel composer-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">
            <GitBranch size={16} />
            GUARD BUILDER
          </div>

          <p>
            Choose an operator and the guards you want to
            combine.
          </p>
        </div>

        <span className="panel-index">01 / COMPOSE</span>
      </div>

      <div className="operator-section">
        <div className="field-heading">
          <span>Composition operator</span>
          <span className="field-hint">
            How should the guards be combined?
          </span>
        </div>

        <div className="operator-options">
          {OPERATORS.map((item) => (
            <button
              type="button"
              key={item}
              className={`operator-button ${
                operator === item ? "selected" : ""
              }`}
              aria-pressed={operator === item}
              onClick={() => onChangeOperator(item)}
            >
              <span className="operator-symbol">
                {item === "or"
                  ? "||"
                  : item === "and"
                    ? "&&"
                    : "!"}
              </span>
              {item}()
            </button>
          ))}
        </div>

        <p className="operator-description">
          {operator === "or" &&
            "Passes when at least one guard matches."}
          {operator === "and" &&
            "Passes only when every guard matches."}
          {operator === "not" &&
            "Passes when the selected guard does not match."}
        </p>
      </div>

      <div className="guard-section">
        <div className="field-heading">
          <span>Selected guards</span>
          <span className="guard-count">
            {selectedGuards.length}{" "}
            {selectedGuards.length === 1 ? "GUARD" : "GUARDS"}
          </span>
        </div>

        <div className="guard-stack">
          {selectedGuards.map((name, index) => (
            <div className="guard-row" key={index}>
              <span className="guard-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="guard-select-wrap">
                <Braces size={17} />

                <select
                  aria-label={`Guard ${index + 1}`}
                  value={name}
                  onChange={(event) =>
                    onUpdateGuard(
                      index,
                      event.target.value as GuardName
                    )
                  }
                >
                  {GUARDS.map((guard) => (
                    <option
                      key={guard.name}
                      value={guard.name}
                    >
                      {guard.name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="select-chevron"
                />
              </div>

              <span className="guard-description">
                {guardLookup[name].description}
              </span>

              <button
                type="button"
                className="icon-button remove-button"
                aria-label={`Remove guard ${index + 1}`}
                title="Remove guard"
                disabled={selectedGuards.length === 1}
                onClick={() => onRemoveGuard(index)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <GuardPicker
          operator={operator}
          onAddGuard={onAddGuard}
        />
      </div>
    </section>
  );
}
