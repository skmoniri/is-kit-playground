
import {
  Braces,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";

import { GUARDS } from "../../data/guards";
import { getShapeError } from "../../lib/shape-engine";

import type {
  ShapeConfig,
  ShapeField,
  ShapeMode,
} from "../../types/object-shape";
import type { GuardName } from "../../types/playground";

type ObjectShapeBuilderProps = {
  config: ShapeConfig;
  onChange: (config: ShapeConfig) => void;
};

const MAX_DEPTH = 8;

function createField(
  key: string
): ShapeField {
  return {
    id: crypto.randomUUID(),
    key,
    guard: "isString",
    optional: false,
    kind: "guard",
  };
}

function updateFields(
  fields: ShapeField[],
  id: string,
  updates: Partial<ShapeField>
): ShapeField[] {
  return fields.map((field) => {
    if (field.id === id) {
      return { ...field, ...updates };
    }

    if (field.kind === "object") {
      return {
        ...field,
        fields: updateFields(
          field.fields ?? [],
          id,
          updates
        ),
      };
    }

    return field;
  });
}

function removeFieldRecursive(
  fields: ShapeField[],
  id: string
): ShapeField[] {
  return fields
    .filter((field) => field.id !== id)
    .map((field) =>
      field.kind === "object"
        ? {
            ...field,
            fields: removeFieldRecursive(
              field.fields ?? [],
              id
            ),
          }
        : field
    );
}

function addChildRecursive(
  fields: ShapeField[],
  parentId: string,
  child: ShapeField
): ShapeField[] {
  return fields.map((field) => {
    if (field.id === parentId) {
      return {
        ...field,
        fields: [...(field.fields ?? []), child],
      };
    }

    if (field.kind === "object") {
      return {
        ...field,
        fields: addChildRecursive(
          field.fields ?? [],
          parentId,
          child
        ),
      };
    }

    return field;
  });
}

function nextKey(
  fields: ShapeField[]
): string {
  const names = new Set(
    fields.map((field) => field.key)
  );

  let index = fields.length + 1;
  let key = `field${index}`;

  while (names.has(key)) {
    index += 1;
    key = `field${index}`;
  }

  return key;
}

function findChildren(
  fields: ShapeField[],
  id: string
): ShapeField[] {
  for (const field of fields) {
    if (field.id === id) {
      return field.fields ?? [];
    }

    if (field.kind === "object") {
      const result = findChildren(
        field.fields ?? [],
        id
      );

      if (
        result.length > 0 ||
        containsField(field.fields ?? [], id)
      ) {
        return result;
      }
    }
  }

  return [];
}

function containsField(
  fields: ShapeField[],
  id: string
): boolean {
  return fields.some(
    (field) =>
      field.id === id ||
      (field.kind === "object" &&
        containsField(field.fields ?? [], id))
  );
}

export function ObjectShapeBuilder({
  config,
  onChange,
}: ObjectShapeBuilderProps) {
  const mode: ShapeMode =
    config.mode ?? "inferred";

  function changeFields(fields: ShapeField[]) {
    onChange({ ...config, fields });
  }

  function updateField(
    id: string,
    updates: Partial<ShapeField>
  ) {
    changeFields(
      updateFields(config.fields, id, updates)
    );
  }

  function removeField(id: string) {
    changeFields(
      removeFieldRecursive(config.fields, id)
    );
  }

  function addField(parentId?: string) {
    if (!parentId) {
      changeFields([
        ...config.fields,
        createField(nextKey(config.fields)),
      ]);
      return;
    }

    const siblings = findChildren(
      config.fields,
      parentId
    );

    const child = createField(
      nextKey(siblings)
    );

    changeFields(
      addChildRecursive(
        config.fields,
        parentId,
        child
      )
    );
  }

  function changeFieldKind(
    field: ShapeField,
    kind: "guard" | "object"
  ) {
    if (kind === "object") {
      updateField(field.id, {
        kind: "object",
        fields:
          field.fields?.length
            ? field.fields
            : [createField("value")],
      });
    } else {
      updateField(field.id, {
        kind: "guard",
        fields: undefined,
      });
    }
  }

  function renderFields(
    fields: ShapeField[],
    depth = 0
  ): React.ReactNode {
    return fields.map((field, index) => {
      const nested = field.kind === "object";

      return (
        <div
          key={field.id}
          className={`shape-tree-item ${
            depth > 0 ? "shape-nested-item" : ""
          }`}
        >
          <div className="shape-field-row">
            <span className="guard-number">
              {String(index + 1).padStart(2, "0")}
            </span>

            <input
              className="shape-key-input"
              value={field.key}
              aria-label={`Property ${field.key} name`}
              placeholder="Property name"
              onChange={(event) =>
                updateField(field.id, {
                  key: event.target.value,
                })
              }
            />

            <div className="guard-select-wrap shape-guard-select">
              <Braces size={16} />

              <select
                aria-label={`Property ${field.key} type`}
                value={
                  nested
                    ? "__object"
                    : field.guard
                }
                onChange={(event) => {
                  const value = event.target.value;

                  if (value === "__object") {
                    changeFieldKind(field, "object");
                  } else {
                    updateField(field.id, {
                      kind: "guard",
                      guard: value as GuardName,
                      fields: undefined,
                    });
                  }
                }}
              >
                <option value="__object">
                  Nested object
                </option>

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

            <label className="shape-optional">
              <input
                type="checkbox"
                checked={field.optional}
                onChange={(event) =>
                  updateField(field.id, {
                    optional: event.target.checked,
                  })
                }
              />
              <span>Optional</span>
            </label>

            <button
              type="button"
              className="icon-button remove-button"
              aria-label={`Remove ${field.key}`}
              title="Remove property"
              onClick={() => removeField(field.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {nested && (
            <div className="shape-nested-children">
              <div className="shape-nested-heading">
                <ChevronRight size={14} />
                <span>
                  {field.key || "Unnamed object"}
                </span>
                <span>
                  {(field.fields ?? []).length} properties
                </span>
              </div>

              {renderFields(
                field.fields ?? [],
                depth + 1
              )}

              {depth + 1 < MAX_DEPTH && (
                <button
                  type="button"
                  className="shape-add-nested"
                  onClick={() => addField(field.id)}
                >
                  <Plus size={14} />
                  Add nested property
                </button>
              )}
            </div>
          )}
        </div>
      );
    });
  }

  const schemaError = getShapeError(config);

  return (
    <section className="panel composer-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">
            <Braces size={16} />
            OBJECT SHAPE BUILDER
          </div>

          <p>
            Define object properties, nested schemas,
            and TypeScript types using is-kit.
          </p>
        </div>

        <span className="panel-index">
          01 / SCHEMA
        </span>
      </div>

      <div className="guard-section">
        <div className="shape-mode-switch">
          <button
            type="button"
            className={
              mode === "inferred" ? "active" : ""
            }
            aria-pressed={mode === "inferred"}
            onClick={() =>
              onChange({
                ...config,
                mode: "inferred",
              })
            }
          >
            Inferred Schema
          </button>

          <button
            type="button"
            className={
              mode === "typed" ? "active" : ""
            }
            aria-pressed={mode === "typed"}
            onClick={() =>
              onChange({
                ...config,
                mode: "typed",
              })
            }
          >
            Typed Schema
          </button>
        </div>

        <p className="shape-mode-description">
          {mode === "inferred"
            ? "Generate a struct() guard and let TypeScript infer the object type."
            : "Generate an explicit TypeScript interface checked by typedStruct<T>()."}
        </p>

        <div className="field-heading">
          <span>Object properties</span>

          <span className="guard-count">
            {config.fields.length}{" "}
            {config.fields.length === 1
              ? "PROPERTY"
              : "PROPERTIES"}
          </span>
        </div>

        <div className="shape-field-list">
          {renderFields(config.fields)}
        </div>

        <div className="add-guard-area">
          <button
            type="button"
            className="add-guard-button"
            onClick={() => addField()}
          >
            <Plus size={16} />
            Add property
          </button>
        </div>

        <div className="shape-options">
          <label className="shape-exact-option">
            <input
              type="checkbox"
              checked={config.exact}
              onChange={(event) =>
                onChange({
                  ...config,
                  exact: event.target.checked,
                })
              }
            />

            <span>
              <strong>Exact object matching</strong>
              <small>
                Reject properties not defined in the
                schema, including nested objects.
              </small>
            </span>
          </label>
        </div>

        {schemaError && (
          <p className="shape-error" role="alert">
            {schemaError}
          </p>
        )}
      </div>
    </section>
  );
}
