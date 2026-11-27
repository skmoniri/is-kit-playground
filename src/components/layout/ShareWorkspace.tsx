import { useEffect, useRef, useState } from "react";
import { Check, Link2, AlertCircle } from "lucide-react";

import { createShareUrl, type SharedWorkspace } from "../../lib/share-state";

type ShareWorkspaceProps = {
  workspace: SharedWorkspace;
  initialError?: string | null;
};

export function ShareWorkspace({
  workspace,
  initialError = null,
}: ShareWorkspaceProps) {
  const [message, setMessage] = useState<string | null>(initialError);

  const [copied, setCopied] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previousWorkspaceRef = useRef(JSON.stringify(workspace));

  useEffect(() => {
    const current = JSON.stringify(workspace);

    if (previousWorkspaceRef.current !== current) {
      previousWorkspaceRef.current = current;
      setCopied(false);
      setMessage(null);
    }
  }, [workspace]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function share() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const url = createShareUrl(workspace);

      await navigator.clipboard.writeText(url);

      setCopied(true);
      setMessage("Shareable link copied.");

      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        setMessage(null);
        timeoutRef.current = null;
      }, 2000);
    } catch (error) {
      setCopied(false);

      setMessage(
        error instanceof Error ? error.message : "Unable to copy the link.",
      );
    }
  }

  return (
    <div className="share-workspace">
      <button
        type="button"
        className="copy-button"
        onClick={share}
        aria-label={
          copied ? "Copied! Shareable link" : "Share — copy playground link"
        }
      >
        {copied ? <Check size={15} /> : <Link2 size={15} />}

        {copied ? "Copied!" : "Share"}
      </button>

      {message && (
        <span className="share-workspace-message" role="status">
          {copied ? <Check size={13} /> : <AlertCircle size={13} />}

          {message}
        </span>
      )}
    </div>
  );
}
