
import { Layers3, Plus, Trash2 } from "lucide-react";

import { GUARDS } from "../../data/guards";

import {
  COLLECTION_KINDS,
  type CollectionConfig,
  type CollectionKind,
} from "../../types/collection";

import type {
  GuardName,
} from "../../types/playground";

type CollectionExplorerProps = {
  config: CollectionConfig;
  onChange: (config: CollectionConfig) => void;
};

export function CollectionExplorer({
  config,
  onChange,
}: CollectionExplorerProps) {
  const selectedKind = COLLECTION_KINDS.find(
    (item) => item.value === config.kind
  );

  const isTuple = config.kind === "tupleOf";

  const hasKeys =
    config.kind === "mapOf" ||
    config.kind === "recordOf";

  function update(
    changes: Partial<CollectionConfig>
  ) {
    onChange({ ...config, ...changes });
  }

  function updateTupleGuard(
    index: number,
    guard: GuardName
  ) {
    update({
      tupleGuards: config.tupleGuards.map(
        (current, position) =>
          position === index ? guard : current
      ),
    });
  }

  return (
    <section className="panel composer-panel collection-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">
            <Layers3 size={16} />
            COLLECTION BUILDER
          </div>

          <p>
            Configure real is-kit collection guards
            and test their behavior.
          </p>
        </div>

        <span className="panel-index">
          01 / BUILD
        </span>
      </div>

      <div className="collection-form">
        <div className="collection-field">
          <label htmlFor="collection-kind">
            Collection type
          </label>

          <select
            id="collection-kind"
            value={config.kind}
            onChange={(event) =>
              update({
                kind: event.target.value as CollectionKind,
              })
            }
          >
            {COLLECTION_KINDS.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label} — {item.value}
              </option>
            ))}
          </select>

          <p className="collection-hint">
            {selectedKind?.description}
          </p>
        </div>

        {!isTuple && (
          <div className="collection-field">
            <label htmlFor="collection-value-guard">
              {hasKeys
                ? "Value guard"
                : "Element guard"}
            </label>

            <select
              id="collection-value-guard"
              value={config.elementGuard}
              onChange={(event) =>
                update({
                  elementGuard:
                    event.target.value as GuardName,
                })
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
          </div>
        )}

        {hasKeys && (
          <div className="collection-field">
            <label htmlFor="collection-key-guard">
              Key guard
            </label>

            <select
              id="collection-key-guard"
              value={config.keyGuard}
              onChange={(event) =>
                update({
                  keyGuard:
                    event.target.value as GuardName,
                })
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
          </div>
        )}

        {isTuple && (
          <div className="collection-field collection-tuple-field">
            <label>Tuple positions</label>

            <div className="collection-tuple-list">
              {config.tupleGuards.map(
                (guard, index) => (
                  <div
                    className="collection-tuple-row"
                    key={index}
                  >
                    <span className="collection-position">
                      {index + 1}
                    </span>

                    <select
                      aria-label={`Guard for position ${index + 1}`}
                      value={guard}
                      onChange={(event) =>
                        updateTupleGuard(
                          index,
                          event.target.value as GuardName
                        )
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
                      className="collection-remove"
                      disabled={
                        config.tupleGuards.length <= 1
                      }
                      onClick={() =>
                        update({
                          tupleGuards:
                            config.tupleGuards.filter(
                              (_, position) =>
                                position !== index
                            ),
                        })
                      }
                      aria-label={`Remove tuple position ${index + 1}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              className="collection-add"
              onClick={() =>
                update({
                  tupleGuards: [
                    ...config.tupleGuards,
                    "isString",
                  ],
                })
              }
            >
              <Plus size={15} />
              Add position
            </button>
          </div>
        )}
      </div>

      {(config.kind === "setOf" ||
        config.kind === "mapOf") && (
        <p className="collection-conversion-note">
          The playground accepts JSON and converts
          it to a JavaScript{" "}
          {config.kind === "setOf" ? "Set" : "Map"}.
          This conversion is not performed by is-kit.
        </p>
      )}
    </section>
  );
}
