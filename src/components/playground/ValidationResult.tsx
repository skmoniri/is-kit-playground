
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleX,
  Info,
} from "lucide-react";

import type {
  ValidationResult as ValidationResultType,
} from "../../types/playground";

import type {
  ParsingResult,
} from "../../lib/safe-parsing";

type ValidationResultProps = {
  validation: ValidationResultType;
  parsingResult: ParsingResult;
};

function formatValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function getParsingLabel(mode: ParsingResult["mode"]) {
  switch (mode) {
    case "direct":
      return "Direct";
    case "safeParse":
      return "safeParse";
    case "safeJsonParse":
      return "safeJsonParse";
  }
}

export function ValidationResult({
  validation,
  parsingResult,
}: ValidationResultProps) {
  const [expanded, setExpanded] = useState(false);

  const isPass = validation.status === "pass";
  const isFail = validation.status === "fail";

  const StatusIcon = isPass
    ? CheckCircle2
    : isFail
      ? CircleX
      : AlertTriangle;

  const statusLabel = isPass
    ? "VALID"
    : isFail
      ? "INVALID"
      : "ERROR";

  const parsingLabel =
    parsingResult.valid === true
      ? "VALID"
      : parsingResult.valid === false
        ? "INVALID"
        : "ERROR";

  return (
    <section className="panel compact-result">
      <div className="compact-result-main">
        <div className="compact-result-identity">
          <div
            className={`compact-result-status ${validation.status}`}
            role="status"
          >
            <StatusIcon size={17} />
            <strong>{statusLabel}</strong>
          </div>
        </div>

        <p className="compact-result-explanation">
          {validation.explanation}
        </p>

        <div className="compact-result-actions">
          <span className="compact-result-mode">
            {getParsingLabel(parsingResult.mode)}
          </span>

          <button
            type="button"
            className="compact-result-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}

            {expanded ? "Hide details" : "Show details"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="compact-result-expanded">
          <div className="compact-result-detail-grid">
            <div className="compact-result-detail">
              <div className="detail-label">
                GUARD EVALUATION
              </div>

              {validation.details.length > 0 ? (
                validation.details.map((detail, index) => (
                  <p key={`${index}-${detail}`}>
                    {detail}
                  </p>
                ))
              ) : (
                <p>{validation.explanation}</p>
              )}
            </div>

            <div className="compact-result-detail">
              <div className="parsing-result-section">
                <div className="parsing-result-heading">
                  <Info size={13} />
                  PARSING RESULT
                </div>

                <div className="detail-label">
                  {getParsingLabel(parsingResult.mode)}:{" "}
                  {parsingLabel}
                </div>

                {parsingResult.error && (
                  <p className="parsing-result-note">
                    {parsingResult.error}
                  </p>
                )}

                {parsingResult.valid === true && (
                  <>
                    <div className="detail-label">
                      RETURNED VALUE
                    </div>

                    <pre className="parsing-result-code">
                      <code>
                        {formatValue(parsingResult.value)}
                      </code>
                    </pre>
                  </>
                )}

                {parsingResult.valid === false && (
                  <p className="parsing-result-note">
                    The selected guard did not accept
                    this value.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="result-footer">
            <Info size={13} />
            Results are evaluated using the is-kit library.
          </div>
        </div>
      )}
    </section>
  );
}
