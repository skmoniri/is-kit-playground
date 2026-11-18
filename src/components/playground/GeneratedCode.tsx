
import { useState } from "react";
import { Check, Code2, Copy } from "lucide-react";

type GeneratedCodeProps = {
  code: string;
};

export function GeneratedCode({
  code,
}: GeneratedCodeProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(
    null
  );

  const copied = copiedCode === code;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
    } catch {
      setCopiedCode(null);
    }
  }

  return (
    <section className="panel code-panel">
      <div className="panel-header compact">
        <div className="panel-label">
          <Code2 size={16} />
          GENERATED TYPESCRIPT
        </div>

        <button
          type="button"
          className="copy-button"
          onClick={copyCode}
        >
          {copied ? (
            <Check size={15} />
          ) : (
            <Copy size={15} />
          )}
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>

      <div className="code-editor">
        <div className="editor-topline">
          <span>guard.ts</span>
          <span>TypeScript</span>
        </div>

        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </section>
  );
}
