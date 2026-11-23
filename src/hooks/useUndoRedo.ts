import { useCallback, useReducer, type KeyboardEvent } from "react";
import { historyReducer, initialHistory } from "@/lib/undoRedo";

export function useUndoRedo<T>(initial: T) {
  const [history, dispatch] = useReducer(historyReducer<T>, initialHistory(initial));
  const set = useCallback((value: T | ((previous: T) => T), group?: string) => {
    dispatch({ type: "set", value, group, time: Date.now() });
  }, []);
  const reset = useCallback((value: T) => dispatch({ type: "reset", value }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const endGroup = useCallback(() => dispatch({ type: "break" }), []);

  // Scope shortcuts to the editor, including its controlled text fields.
  // Prevent native text undo from competing with the rubric's history.
  function editorProps(enabled: boolean) {
    return {
      onBlurCapture: endGroup,
      onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => {
        if (event.nativeEvent.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
        const key = event.key.toLowerCase();
        const isUndo = key === "z" && !event.shiftKey;
        const isRedo = (key === "z" && event.shiftKey) || (key === "y" && !event.shiftKey);
        if (!isUndo && !isRedo) return;
        event.preventDefault();
        event.stopPropagation();
        if (enabled) (isUndo ? undo : redo)();
      },
    };
  }

  return { value: history.present, set, reset, undo, redo,
    canUndo: history.past.length > 0, canRedo: history.future.length > 0, editorProps };
}
