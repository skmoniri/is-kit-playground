import { useCallback, useEffect, useRef, useState } from "react";

type HistoryState<T> = {
  entries: T[];
  index: number;
};

const MAX_HISTORY = 50;

export function useWorkspaceHistory<T>(
  snapshot: T,
  restore: (snapshot: T) => void,
) {
  const serialized = JSON.stringify(snapshot);

  const historyRef = useRef<HistoryState<T>>({
    entries: [snapshot],
    index: 0,
  });

  const currentRef = useRef(serialized);
  const restoreRef = useRef(restore);

  const [availability, setAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });

  const syncAvailability = useCallback((history: HistoryState<T>) => {
    setAvailability({
      canUndo: history.index > 0,
      canRedo: history.index < history.entries.length - 1,
    });
  }, []);

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

    const nextHistory: HistoryState<T> = {
      entries: nextEntries,
      index: nextEntries.length - 1,
    };

    historyRef.current = nextHistory;
    syncAvailability(nextHistory);
  }, [serialized, snapshot, syncAvailability]);

  const undo = useCallback(() => {
    const history = historyRef.current;

    if (history.index <= 0) {
      return;
    }

    const nextIndex = history.index - 1;
    const previous = history.entries[nextIndex];

    const nextHistory: HistoryState<T> = {
      ...history,
      index: nextIndex,
    };

    historyRef.current = nextHistory;

    currentRef.current = JSON.stringify(previous);

    restoreRef.current(previous);

    syncAvailability(nextHistory);
  }, [syncAvailability]);

  const redo = useCallback(() => {
    const history = historyRef.current;

    if (history.index >= history.entries.length - 1) {
      return;
    }

    const nextIndex = history.index + 1;
    const next = history.entries[nextIndex];

    const nextHistory: HistoryState<T> = {
      ...history,
      index: nextIndex,
    };

    historyRef.current = nextHistory;

    currentRef.current = JSON.stringify(next);

    restoreRef.current(next);

    syncAvailability(nextHistory);
  }, [syncAvailability]);

  return {
    undo,
    redo,
    canUndo: availability.canUndo,
    canRedo: availability.canRedo,
  };
}
