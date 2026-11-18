
import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { GUARDS } from "../../data/guards";
import type {
  GuardName,
  Operator,
} from "../../types/playground";

type GuardPickerProps = {
  operator: Operator;
  onAddGuard: (name: GuardName) => void;
};

export function GuardPicker({
  operator,
  onAddGuard,
}: GuardPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const filteredGuards = GUARDS.filter(
    (guard) =>
      guard.name.toLowerCase().includes(query) ||
      guard.description.toLowerCase().includes(query) ||
      guard.category.toLowerCase().includes(query)
  );

  function selectGuard(name: GuardName) {
    onAddGuard(name);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="add-guard-area">
      <button
        type="button"
        className="add-guard-button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Plus size={16} />
        {operator === "not"
          ? "Replace guard"
          : "Add another guard"}
      </button>

      {open && (
        <div className="guard-picker">
          <div className="picker-search">
            <Search size={16} />
            <input
              autoFocus
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search available guards..."
              aria-label="Search guards"
            />
          </div>

          <div className="picker-results">
            {filteredGuards.length === 0 ? (
              <div className="picker-empty">
                No matching guards.
              </div>
            ) : (
              filteredGuards.map((guard) => (
                <button
                  type="button"
                  key={guard.name}
                  className="picker-option"
                  onClick={() => selectGuard(guard.name)}
                >
                  <div>
                    <strong>{guard.name}</strong>
                    <span>{guard.description}</span>
                  </div>

                  <span className="picker-category">
                    {guard.category}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
