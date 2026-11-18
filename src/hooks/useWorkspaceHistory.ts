
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type HistoryState<T> = {
  entries: T[];
  index: number;
};

const MAX_HISTORY = 50;

export function useWorkspaceHistory<T>(
  snapshot: T,
  restore: (snapshot: T) => void
) {
  const serialized = JSON.stringify(snapshot);

  const historyRef = useRef<HistoryState<T>>({
    entries: [snapshot],
    index: 0,
  });

  const currentRef = useRef(serialized);
  const restoreRef = useRef(restore);

  const [, setVersion] = useState(0);

  useEffect(() => {
    restoreRef.current = restore;
  }, [restore]);

  useEffect(() => {
    if (serialized === currentRef.current) {
      return;
    }

    currentRef.current = serialized;

    const history = historyRef.current;

    const nextEntries = [
      ...history.entries.slice(0, history.index + 1),
      snapshot,
    ];

    if (nextEntries.length > MAX_HISTORY) {
      nextEntries.shift();
    }

    historyRef.current = {
      entries: nextEntries,
      index: nextEntries.length - 1,
    };

    setVersion((value) => value + 1);
  }, [serialized, snapshot]);

  const undo = useCallback(() => {
    const history = historyRef.current;

    if (history.index <= 0) {
      return;
    }

    const nextIndex = history.index - 1;
    const previous = history.entries[nextIndex];

    historyRef.current = {
      ...history,
      index: nextIndex,
    };

    currentRef.current = JSON.stringify(previous);
    restoreRef.current(previous);

    setVersion((value) => value + 1);
  }, []);

  const redo = useCallback(() => {
    const history = historyRef.current;

    if (history.index >= history.entries.length - 1) {
      return;
    }

    const nextIndex = history.index + 1;
    const next = history.entries[nextIndex];

    historyRef.current = {
      ...history,
      index: nextIndex,
    };

    currentRef.current = JSON.stringify(next);
    restoreRef.current(next);

    setVersion((value) => value + 1);
  }, []);

  const history = historyRef.current;

  return {
    undo,
    redo,
    canUndo: history.index > 0,
    canRedo: history.index < history.entries.length - 1,
  };
}
