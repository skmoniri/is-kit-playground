
import { GitMerge, Plus, Trash2 } from "lucide-react";

import { GUARDS } from "../../data/guards";

import {
  UNION_MODES,
  type LiteralValue,
  type UnionConfig,
  type UnionKind,
} from "../../types/union";

import type { GuardName } from "../../types/playground";

type Props = {
  config: UnionConfig;
  onChange: (config: UnionConfig) => void;
};

function formatLiteral(value: LiteralValue): string {
  return JSON.stringify(value);
}

function parseLiteral(
  input: string
): LiteralValue | undefined {
  try {
    const value: unknown = JSON.parse(input);

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
  } catch {
    // Invalid JSON is handled by the caller.
  }

  return undefined;
}

export function UnionExplorer({
  config,
  onChange,
}: Props) {
  const current = UNION_MODES.find(
    (mode) => mode.value === config.kind
  );

  function update(changes: Partial<UnionConfig>) {
    onChange({ ...config, ...changes });
  }

  function addLiteral() {
    const input = window.prompt(
      'Enter a JSON primitive, e.g. "active", 42, true, or null:'
    );

    if (input === null) return;

    const value = parseLiteral(input);

    if (value === undefined) {
      window.alert(
        "Enter a valid JSON primitive: string, number, boolean, or null."
      );
      return;
    }

    update({
      literals: [...config.literals, value],
    });
  }

  return (
    <section className="panel composer-panel union-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">
            <GitMerge size={16} />
            UNION BUILDER
          </div>

          <p>
            Explore union guards from the actual
            is-kit library.
          </p>
        </div>

        <span className="panel-index">
          01 / BUILD
        </span>
      </div>

      <div className="union-mode-grid">
        {UNION_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            className={`union-mode-card ${
              config.kind === mode.value
                ? "selected"
                : ""
            }`}
            onClick={() =>
              update({
                kind: mode.value as UnionKind,
              })
            }
            aria-pressed={config.kind === mode.value}
          >
            <strong>{mode.title}</strong>
            <code>{mode.api}</code>
          </button>
        ))}
      </div>

      <p className="union-description">
        {current?.description}
      </p>

      {config.kind === "guards" && (
        <div className="union-fields">
          <div className="union-field-heading">
            <strong>Accepted guards</strong>
            <span>Any matching guard passes</span>
          </div>

          {config.guards.map((guard, index) => (
            <div
              className="union-guard-row"
              key={index}
            >
              <span className="union-position">
                {index + 1}
              </span>

              <select
                aria-label={`Union guard ${index + 1}`}
                value={guard}
                onChange={(event) =>
                  update({
                    guards: config.guards.map(
                      (item, position) =>
                        position === index
                          ? (event.target.value as GuardName)
                          : item
                    ),
                  })
                }
              >
                {GUARDS.map((item) => (
                  <option
                    key={item.name}
                    value={item.name}
                  >
                    {item.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="union-icon-button"
                aria-label={`Remove guard ${index + 1}`}
                disabled={config.guards.length <= 1}
                onClick={() =>
                  update({
                    guards: config.guards.filter(
                      (_, position) =>
                        position !== index
                    ),
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          <button
            type="button"
            className="union-add-button"
            onClick={() =>
              update({
                guards: [
                  ...config.guards,
                  "isBoolean",
                ],
              })
            }
          >
            <Plus size={15} />
            Add guard
          </button>
        </div>
      )}

      {config.kind === "literals" && (
        <div className="union-fields">
          <div className="union-field-heading">
            <strong>Allowed literal values</strong>
            <span>Exact matches using Object.is</span>
          </div>

          <div className="union-literal-list">
            {config.literals.map((value, index) => (
              <div
                className="union-literal"
                key={index}
              >
                <code>{formatLiteral(value)}</code>

                <button
                  type="button"
                  className="union-icon-button"
                  aria-label={`Remove literal ${index + 1}`}
                  disabled={
                    config.literals.length <= 1
                  }
                  onClick={() =>
                    update({
                      literals: config.literals.filter(
                        (_, position) =>
                          position !== index
                      ),
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="union-add-button"
            onClick={addLiteral}
          >
            <Plus size={15} />
            Add literal
          </button>
        </div>
      )}

      {config.kind === "discriminated" && (
        <div className="union-fields">
          <div className="union-field-heading">
            <strong>Typed message example</strong>
            <span>Discriminant: type</span>
          </div>

          <div className="union-variant-grid">
            <div className="union-variant">
              <span>TEXT VARIANT</span>
              <code>
                {`{ type: "text", content: string }`}
              </code>
            </div>

            <div className="union-variant">
              <span>IMAGE VARIANT</span>
              <code>
                {`{ type: "image", url: string }`}
              </code>
            </div>
          </div>

          <p className="union-note">
            This mode demonstrates a real,
            statically typed discriminated union.
            Its branches are intentionally predefined
            to preserve TypeScript type guarantees.
          </p>
        </div>
      )}
    </section>
  );
}
