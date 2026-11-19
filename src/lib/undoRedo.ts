// Values are immutable JSON data. Keep at most 100 undo steps per editor.
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  group?: string;
  time: number;
}
export type HistoryAction<T> =
  | { type: "set"; value: T | ((previous: T) => T); group?: string; time: number }
  | { type: "reset"; value: T }
  | { type: "undo" | "redo" | "break" };

export function initialHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], time: 0 };
}

export function historyReducer<T>(state: History<T>, action: HistoryAction<T>): History<T> {
  switch (action.type) {
    case "reset": return initialHistory(action.value);
    case "break": return { ...state, group: undefined };
    case "undo":
      if (!state.past.length) return state;
      return {
        ...initialHistory(state.past[state.past.length - 1]),
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
      };
    case "redo":
      if (!state.future.length) return state;
      return {
        ...initialHistory(state.future[0]),
        past: [...state.past, state.present].slice(-100),
        future: state.future.slice(1),
      };
    case "set": {
      const next = typeof action.value === "function"
        ? (action.value as (previous: T) => T)(state.present)
        : action.value;
      if (JSON.stringify(next) === JSON.stringify(state.present)) return state;
      const grouped = action.group !== undefined && action.group === state.group
        && action.time - state.time < 800 && state.future.length === 0;
      return {
        past: grouped ? state.past : [...state.past, state.present].slice(-100),
        present: next,
        future: [],
        group: action.group,
        time: action.time,
      };
    }
  }
}
