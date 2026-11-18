
import { ArrowRight, Terminal } from "lucide-react";

export function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">
          <Terminal size={20} />
        </div>

        <div className="brand-name">
          <strong>is-kit</strong>
          <span>PLAYGROUND</span>
        </div>

        <span className="beta-tag">ALPHA</span>
      </div>

      <div className="topbar-right">
        <span className="topbar-status">
          <span className="status-dot" />
          Local runtime
        </span>

        <a
          href="https://is-kit.dev/en"
          target="_blank"
          rel="noopener noreferrer"
          className="header-link"
        >
          Documentation
          <ArrowRight size={14} />
        </a>
      </div>
    </header>
  );
}
