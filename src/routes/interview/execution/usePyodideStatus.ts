import { useEffect, useState } from "react";

import { pyodideManager, type PyodideStatus } from "./pyodideManager";

// Subscribes a component to the one shared Pyodide worker's status, without
// owning or re-triggering its lifecycle: `preload()` is called separately
// (from useCodingQuestions, once, as soon as the interview starts), not from
// here, so this hook can be read from anywhere without risking a second
// unwanted load.
export function usePyodideStatus(): PyodideStatus {
  const [status, setStatus] = useState(pyodideManager.getStatus());
  useEffect(() => pyodideManager.subscribe(setStatus), []);
  return status;
}
