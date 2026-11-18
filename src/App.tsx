
import { useMemo, useState } from "react";

import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { WorkspaceHeader } from "./components/layout/WorkspaceHeader";
import { ShareWorkspace } from "./components/layout/ShareWorkspace";

import {
  ModeTabs,
  type EditorMode,
} from "./components/ModeTabs";

import { GuardComposer } from "./components/composer/GuardComposer";
import { ObjectShapeBuilder } from "./components/composer/ObjectShapeBuilder";
import { CollectionExplorer } from "./components/collection/CollectionExplorer";
import { UnionExplorer } from "./components/union/UnionExplorer";
import { NarrowingExplorer } from "./components/narrowing/NarrowingExplorer";

import { TestInput } from "./components/playground/TestInput";
import { ValidationResult } from "./components/playground/ValidationResult";
import { GeneratedCode } from "./components/playground/GeneratedCode";
import { EditableCode } from "./components/playground/EditableCode";

import { EXAMPLES } from "./data/examples";

import { generateCode } from "./lib/code-generator";
import { validateInput } from "./lib/validation";
import { generateShapeCode } from "./lib/shape-code-generator";
import { validateShapeInput } from "./lib/shape-engine";

import {
  evaluateParsing,
  type ParsingMode,
} from "./lib/safe-parsing";

import { evaluateCollection } from "./lib/collection-engine";
import { generateCollectionCode } from "./lib/collection-code-generator";

import { evaluateUnion } from "./lib/union-engine";
import { generateUnionCode } from "./lib/union-code-generator";

import { evaluateNarrowing } from "./lib/narrowing-engine";
import { generateNarrowingCode } from "./lib/narrowing-code-generator";

import {
  readSharedWorkspace,
  type SharedWorkspace,
} from "./lib/share-state";

import { useWorkspaceHistory } from "./hooks/useWorkspaceHistory";

import {
  DEFAULT_COLLECTION_CONFIG,
  type CollectionConfig,
} from "./types/collection";

import {
  DEFAULT_UNION_CONFIG,
  defaultUnionInput,
  type UnionConfig,
} from "./types/union";

import type {
  ExampleId,
  GuardName,
  Operator,
} from "./types/playground";

import type {
  ShapeConfig,
  WorkspaceTool,
} from "./types/object-shape";

import "./App.css";
import "./CompactLayout.css";
import "./CollectionLayout.css";
import "./UnionLayout.css";
import "./NarrowingLayout.css";
import "./TypedSchemaLayout.css";
import "./CodeModeLayout.css";
import "./ShareWorkspace.css";
import "./WorkspaceHistory.css";

function createDefaultShape(): ShapeConfig {
  return {
    exact: false,
    fields: [
      {
        id: "name",
        key: "name",
        guard: "isString",
        optional: false,
      },
      {
        id: "age",
        key: "age",
        guard: "isNumber",
        optional: false,
      },
      {
        id: "active",
        key: "active",
        guard: "isBoolean",
        optional: true,
      },
    ],
  };
}

function getDefaultCollectionInput(
  kind: CollectionConfig["kind"]
): string {
  switch (kind) {
    case "arrayOf":
    case "nonEmptyArrayOf":
    case "setOf":
      return "[1, 2, 3]";

    case "tupleOf":
      return '["hello", 42]';

    case "mapOf":
      return '[["age", 28], ["score", 95]]';

    case "recordOf":
      return '{"age": 28, "score": 95}';
  }
}

function createDefaultCollection(): CollectionConfig {
  return {
    ...DEFAULT_COLLECTION_CONFIG,
    tupleGuards: [
      ...DEFAULT_COLLECTION_CONFIG.tupleGuards,
    ],
  };
}

function createDefaultUnion(): UnionConfig {
  return {
    ...DEFAULT_UNION_CONFIG,
    guards: [...DEFAULT_UNION_CONFIG.guards],
    literals: [...DEFAULT_UNION_CONFIG.literals],
  };
}

const sharedLink = readSharedWorkspace();
const restored = sharedLink.workspace;

export default function App() {
  const [activeTool, setActiveTool] =
    useState<WorkspaceTool>(
      restored?.activeTool ?? "composer"
    );

  const [editorMode, setEditorMode] =
    useState<EditorMode>(
      restored?.editorMode ?? "visual"
    );

  const [codeDrafts, setCodeDrafts] = useState<
    Partial<Record<WorkspaceTool, string>>
  >(restored?.codeDrafts ?? {});

  const [activeExample, setActiveExample] =
    useState<ExampleId | null>(
      restored ? restored.activeExample : "quick"
    );

  const [operator, setOperator] =
    useState<Operator>(
      restored?.operator ?? "or"
    );

  const [selectedGuards, setSelectedGuards] =
    useState<GuardName[]>(
      restored?.selectedGuards ?? [
        "isString",
        "isNumber",
      ]
    );

  const [shapeConfig, setShapeConfig] =
    useState<ShapeConfig>(
      restored?.shapeConfig ?? createDefaultShape()
    );

  const [collectionConfig, setCollectionConfig] =
    useState<CollectionConfig>(
      restored?.collectionConfig ??
        createDefaultCollection()
    );

  const [unionConfig, setUnionConfig] =
    useState<UnionConfig>(
      restored?.unionConfig ?? createDefaultUnion()
    );

  const [narrowingGuard, setNarrowingGuard] =
    useState<GuardName>(
      restored?.narrowingGuard ?? "isString"
    );

  const [composerInput, setComposerInput] =
    useState(
      restored?.composerInput ?? '"hello"'
    );

  const [shapeInput, setShapeInput] =
    useState(
      restored?.shapeInput ??
        '{\n  "name": "Alex",\n  "age": 28\n}'
    );

  const [collectionInput, setCollectionInput] =
    useState(
      restored?.collectionInput ?? "[1, 2, 3]"
    );

  const [unionInput, setUnionInput] =
    useState(
      restored?.unionInput ?? '"hello"'
    );

  const [narrowingInput, setNarrowingInput] =
    useState(
      restored?.narrowingInput ?? '"hello"'
    );

  const [parsingMode, setParsingMode] =
    useState<ParsingMode>(
      restored?.parsingMode ?? "direct"
    );

  const input =
    activeTool === "shape"
      ? shapeInput
      : activeTool === "collection"
        ? collectionInput
        : activeTool === "union"
          ? unionInput
          : activeTool === "narrowing"
            ? narrowingInput
            : composerInput;

  const collectionEvaluation = useMemo(() => {
    if (activeTool !== "collection") {
      return null;
    }

    return evaluateCollection(
      collectionInput,
      collectionConfig,
      parsingMode
    );
  }, [
    activeTool,
    collectionInput,
    collectionConfig,
    parsingMode,
  ]);

  const unionEvaluation = useMemo(() => {
    if (activeTool !== "union") {
      return null;
    }

    return evaluateUnion(
      unionInput,
      unionConfig,
      parsingMode
    );
  }, [
    activeTool,
    unionInput,
    unionConfig,
    parsingMode,
  ]);

  const narrowingEvaluation = useMemo(() => {
    if (activeTool !== "narrowing") {
      return null;
    }

    return evaluateNarrowing(
      narrowingInput,
      narrowingGuard,
      parsingMode
    );
  }, [
    activeTool,
    narrowingInput,
    narrowingGuard,
    parsingMode,
  ]);

  const code = useMemo(() => {
    if (activeTool === "narrowing") {
      return generateNarrowingCode(
        narrowingGuard,
        narrowingInput,
        parsingMode
      );
    }

    if (activeTool === "union") {
      return generateUnionCode(
        unionConfig,
        unionInput,
        parsingMode
      );
    }

    if (activeTool === "collection") {
      return generateCollectionCode(
        collectionConfig,
        collectionInput,
        parsingMode
      );
    }

    if (activeTool === "shape") {
      return generateShapeCode(
        shapeConfig,
        shapeInput,
        parsingMode
      );
    }

    return generateCode(
      operator,
      selectedGuards,
      composerInput,
      parsingMode
    );
  }, [
    activeTool,
    narrowingGuard,
    narrowingInput,
    unionConfig,
    unionInput,
    collectionConfig,
    collectionInput,
    shapeConfig,
    shapeInput,
    operator,
    selectedGuards,
    composerInput,
    parsingMode,
  ]);

  const validation = useMemo(() => {
    if (activeTool === "narrowing") {
      return narrowingEvaluation!.validation;
    }

    if (activeTool === "union") {
      return unionEvaluation!.validation;
    }

    if (activeTool === "collection") {
      return collectionEvaluation!.validation;
    }

    if (activeTool === "shape") {
      return validateShapeInput(
        shapeInput,
        shapeConfig
      );
    }

    return validateInput(
      composerInput,
      operator,
      selectedGuards
    );
  }, [
    activeTool,
    narrowingEvaluation,
    unionEvaluation,
    collectionEvaluation,
    shapeConfig,
    shapeInput,
    operator,
    selectedGuards,
    composerInput,
  ]);

  const parsingResult = useMemo(() => {
    if (activeTool === "narrowing") {
      return narrowingEvaluation!.parsing;
    }

    if (activeTool === "union") {
      return unionEvaluation!.parsing;
    }

    if (activeTool === "collection") {
      return collectionEvaluation!.parsing;
    }

    return evaluateParsing(
      input,
      parsingMode,
      {
        activeTool:
          activeTool === "shape"
            ? "shape"
            : "composer",
        operator,
        guards: selectedGuards,
        shape: shapeConfig,
      }
    );
  }, [
    input,
    parsingMode,
    activeTool,
    operator,
    selectedGuards,
    shapeConfig,
    collectionEvaluation,
    unionEvaluation,
    narrowingEvaluation,
  ]);

  const editableCode = codeDrafts[activeTool] ?? code;

  function changeEditorMode(next: EditorMode) {
    if (next === "code" && editorMode !== "code") {
      setCodeDrafts((current) => {
        if (
          Object.prototype.hasOwnProperty.call(
            current,
            activeTool
          )
        ) {
          return current;
        }

        return {
          ...current,
          [activeTool]: code,
        };
      });
    }

    setEditorMode(next);
  }

  function updateEditableCode(next: string) {
    setCodeDrafts((current) => ({
      ...current,
      [activeTool]: next,
    }));
  }

  function resetEditableCode() {
    setCodeDrafts((current) => ({
      ...current,
      [activeTool]: code,
    }));
  }

  function markCustom() {
    setActiveExample(null);
  }

  function loadExample(id: ExampleId) {
    const example = EXAMPLES.find(
      (item) => item.id === id
    );

    if (!example) return;

    setActiveTool("composer");
    setActiveExample(id);
    setOperator(example.operator);
    setSelectedGuards([...example.guards]);
    setComposerInput(example.input);
  }

  function changeOperator(next: Operator) {
    if (next === operator) return;

    markCustom();
    setOperator(next);

    if (next === "not") {
      setSelectedGuards((current) => [
        current[0],
      ]);
    }
  }

  function updateGuard(
    index: number,
    name: GuardName
  ) {
    markCustom();

    setSelectedGuards((current) =>
      current.map((guard, i) =>
        i === index ? name : guard
      )
    );
  }

  function addGuard(name: GuardName) {
    markCustom();

    if (operator === "not") {
      setSelectedGuards([name]);
    } else {
      setSelectedGuards((current) => [
        ...current,
        name,
      ]);
    }
  }

  function removeGuard(index: number) {
    if (selectedGuards.length <= 1) return;

    markCustom();

    setSelectedGuards((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function changeCollectionConfig(
    next: CollectionConfig
  ) {
    if (next.kind !== collectionConfig.kind) {
      setCollectionInput(
        getDefaultCollectionInput(next.kind)
      );
    }

    setCollectionConfig(next);
  }

  function changeUnionConfig(next: UnionConfig) {
    if (next.kind !== unionConfig.kind) {
      setUnionInput(defaultUnionInput(next.kind));
    }

    setUnionConfig(next);
  }

  function updateInput(value: string) {
    if (activeTool === "shape") {
      setShapeInput(value);
    } else if (activeTool === "collection") {
      setCollectionInput(value);
    } else if (activeTool === "union") {
      setUnionInput(value);
    } else if (activeTool === "narrowing") {
      setNarrowingInput(value);
    } else {
      setComposerInput(value);
    }
  }

  function resetWorkspace() {
    if (activeTool === "shape") {
      setShapeConfig(createDefaultShape());
      setShapeInput(
        '{\n  "name": "Alex",\n  "age": 28\n}'
      );
    } else if (activeTool === "collection") {
      setCollectionConfig(createDefaultCollection());
      setCollectionInput("[1, 2, 3]");
    } else if (activeTool === "union") {
      setUnionConfig(createDefaultUnion());
      setUnionInput('"hello"');
    } else if (activeTool === "narrowing") {
      setNarrowingGuard("isString");
      setNarrowingInput('"hello"');
    } else {
      loadExample("quick");
    }

    setParsingMode("direct");
  }

  const shareSnapshot: SharedWorkspace = {
    version: 1,
    activeTool,
    editorMode,
    activeExample,
    operator,
    selectedGuards,
    shapeConfig,
    collectionConfig,
    unionConfig,
    narrowingGuard,
    composerInput,
    shapeInput,
    collectionInput,
    unionInput,
    narrowingInput,
    parsingMode,
    codeDrafts: {
      ...codeDrafts,
      ...(editorMode === "code"
        ? { [activeTool]: editableCode }
        : {}),
    },
  };

  // Restore every piece of workspace state together.
  // React batches these updates into one render.
  function restoreWorkspace(snapshot: SharedWorkspace) {
    setActiveTool(snapshot.activeTool);
    setEditorMode(snapshot.editorMode);
    setActiveExample(snapshot.activeExample);
    setOperator(snapshot.operator);
    setSelectedGuards([...snapshot.selectedGuards]);
    setShapeConfig(snapshot.shapeConfig);
    setCollectionConfig(snapshot.collectionConfig);
    setUnionConfig(snapshot.unionConfig);
    setNarrowingGuard(snapshot.narrowingGuard);
    setComposerInput(snapshot.composerInput);
    setShapeInput(snapshot.shapeInput);
    setCollectionInput(snapshot.collectionInput);
    setUnionInput(snapshot.unionInput);
    setNarrowingInput(snapshot.narrowingInput);
    setParsingMode(snapshot.parsingMode);
    setCodeDrafts({ ...snapshot.codeDrafts });
  }

  const {
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkspaceHistory(
    shareSnapshot,
    restoreWorkspace
  );

  const narrowingPassed =
    narrowingEvaluation?.validation.status === "pass"
      ? true
      : narrowingEvaluation?.validation.status === "fail"
        ? false
        : null;

  return (
    <div className="app-shell">
      <Header />

      <div className="app-layout">
        <Sidebar
          activeTool={activeTool}
          activeExample={activeExample}
          onChangeTool={setActiveTool}
          onLoadExample={loadExample}
        />

        <main className="workspace">
          <WorkspaceHeader
            activeTool={activeTool}
            onReset={resetWorkspace}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />

          <ModeTabs
            mode={editorMode}
            onChange={changeEditorMode}
          />

          <ShareWorkspace
            workspace={shareSnapshot}
            initialError={sharedLink.error}
          />

          {editorMode === "visual" ? (
            <>
              {activeTool === "composer" ? (
                <GuardComposer
                  operator={operator}
                  selectedGuards={selectedGuards}
                  onChangeOperator={changeOperator}
                  onUpdateGuard={updateGuard}
                  onAddGuard={addGuard}
                  onRemoveGuard={removeGuard}
                />
              ) : activeTool === "shape" ? (
                <ObjectShapeBuilder
                  config={shapeConfig}
                  onChange={setShapeConfig}
                />
              ) : activeTool === "collection" ? (
                <CollectionExplorer
                  config={collectionConfig}
                  onChange={changeCollectionConfig}
                />
              ) : activeTool === "union" ? (
                <UnionExplorer
                  config={unionConfig}
                  onChange={changeUnionConfig}
                />
              ) : (
                <NarrowingExplorer
                  guard={narrowingGuard}
                  onChange={setNarrowingGuard}
                  passed={narrowingPassed}
                />
              )}

              <div className="workbench-grid">
                <TestInput
                  input={input}
                  onChange={updateInput}
                  parsingMode={parsingMode}
                  onChangeParsingMode={setParsingMode}
                />

                <GeneratedCode code={code} />
              </div>

              <ValidationResult
                validation={validation}
                parsingResult={parsingResult}
              />
            </>
          ) : (
            <EditableCode
              code={editableCode}
              onChange={updateEditableCode}
              onReset={resetEditableCode}
            />
          )}

          <footer className="workspace-footer">
            <span>
              Independent playground powered by the
              open-source is-kit library.
            </span>

            <span>Built for experimentation.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
