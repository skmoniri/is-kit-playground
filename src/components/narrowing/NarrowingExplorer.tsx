
import { ArrowRight, GitBranch } from "lucide-react";

import { GUARDS } from "../../data/guards";
import { getNarrowingInfo } from "../../lib/narrowing-engine";
import type { GuardName } from "../../types/playground";

type Props = {
  guard: GuardName;
  onChange: (guard: GuardName) => void;
  passed: boolean | null;
};

export function NarrowingExplorer({
  guard,
  onChange,
  passed,
}: Props) {
  const info = getNarrowingInfo(guard);
  const selected = GUARDS.find(
    (item) => item.name === guard
  );

  return (
    <section className="panel composer-panel narrowing-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">
            <GitBranch size={16} />
            TYPE NARROWING
          </div>

          <p>
            See how an is-kit guard narrows an
            unknown TypeScript value.
          </p>
        </div>

        <span className="panel-index">01 / EXPLORE</span>
      </div>

      <div className="narrowing-selector">
        <label htmlFor="narrowing-guard">
          SELECT GUARD
        </label>

        <select
          id="narrowing-guard"
          value={guard}
          onChange={(event) =>
            onChange(event.target.value as GuardName)
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

        <p>{selected?.description}</p>
      </div>

      <div className="narrowing-flow">
        <div className="narrowing-type-card">
          <span>BEFORE</span>
          <strong>unknown</strong>
          <small>Original TypeScript type</small>
        </div>

        <div className="narrowing-arrow">
          <ArrowRight size={19} />
          <code>{guard}()</code>
        </div>

        <div className="narrowing-type-card narrowed">
          <span>TRUE BRANCH</span>
          <strong>{info.type}</strong>
          <small>Type after successful narrowing</small>
        </div>
      </div>

      <div className="narrowing-branches">
        <div className="narrowing-branch">
          <div className="narrowing-branch-heading">
            <span className="narrowing-dot success" />
            <strong>IF BRANCH</strong>
            <code>{info.type}</code>
          </div>
          <p>
            When the guard returns true,
            TypeScript narrows the variable
            to the guarded type.
          </p>
        </div>

        <div className="narrowing-branch">
          <div className="narrowing-branch-heading">
            <span className="narrowing-dot muted" />
            <strong>ELSE BRANCH</strong>
            <code>unknown</code>
          </div>
          <p>
            When the guard returns false,
            an originally unknown variable
            remains unknown.
          </p>
        </div>
      </div>

      <div className="narrowing-status">
        <div>
          <strong>Runtime test</strong>
          <span>
            {passed === null
              ? "Enter valid JSON to test."
              : passed
                ? "The input matches the selected guard."
                : "The input does not match the guard."}
          </span>
        </div>

        <span
          className={`narrowing-result ${
            passed === null
              ? "invalid"
              : passed
                ? "passed"
                : "failed"
          }`}
        >
          {passed === null
            ? "INVALID"
            : passed
              ? "PASS"
              : "FAIL"}
        </span>
      </div>

      <p className="narrowing-footnote">
        The displayed types describe the known
        guard signatures. Runtime testing uses
        the real is-kit implementation; this
        view does not execute the TypeScript compiler.
      </p>
    </section>
  );
}
