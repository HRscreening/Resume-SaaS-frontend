import { createContext, useCallback, useContext, useMemo, useState } from "react";

// A round has independent surfaces that can write to it: the chat
// composer's turn ("chat", Task 12), an inline question edit ("edit",
// Task 13), and publish ("publish", Task 14, not yet wired). The backend's
// guard on a write is status-only -- save_round_draft
// (backend/app/modules/interview/repository.py) blocks a write once the
// round is published, but has no per-write version check while it is still
// a draft. Both the chat and tool-calls handlers read the row fresh,
// mutate an in-memory draft, then UPDATE. If two writes are in flight at
// once, whichever UPDATE lands second wins outright: it was built from a
// draft read before the other write landed, so the first write is not
// merged, not conflicted, just silently gone. No error surfaces to either
// caller.
//
// This context is a client-side mutual-exclusion lock, not a fix for that
// race -- it only closes the overlap the UI itself can create within a
// single browser tab (a hiring manager firing a chat turn and an inline
// edit at once). Two people in two tabs can still race each other; that
// needs optimistic concurrency server-side (a `version` column and a
// migration) and is deliberately not attempted here -- see Task 13 fix
// round 1 notes.
//
// Each write surface registers itself busy under a stable key while its
// own mutation is in flight (typically via a `useEffect` mirroring the
// mutation's `isPending`, so the key clears automatically on success OR
// error -- a failed write is no longer "in flight"). Every surface then
// asks `isBlocked(ownKey)` -- true when some OTHER key is busy -- to decide
// whether to disable its own submit control. A surface should never block
// on its own key; it already reflects its own pending state directly.
//
// Task 14: register publish the same way. Call `useRoundWriteLock()`,
// drive `setBusy("publish", publishMutation.isPending)` off the publish
// mutation, and gate the publish button's `disabled` on
// `isBlocked("publish")` in addition to its own pending/frozen checks. No
// prop drilling or restructuring of RoundAuthoring/RoundView/AuthoringChat
// is needed to add a third writer -- that is the point of lifting this
// here instead of wiring two ad hoc boolean props between two components.
interface RoundWriteLock {
  isBlocked: (key: string) => boolean;
  setBusy: (key: string, busy: boolean) => void;
}

const RoundWriteLockContext = createContext<RoundWriteLock | null>(null);

export function RoundWriteLockProvider({ children }: { children: React.ReactNode }) {
  const [activeKeys, setActiveKeys] = useState<ReadonlySet<string>>(() => new Set());

  const setBusy = useCallback((key: string, busy: boolean) => {
    setActiveKeys((current) => {
      const alreadyBusy = current.has(key);
      if (busy === alreadyBusy) return current;
      const next = new Set(current);
      if (busy) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const value = useMemo<RoundWriteLock>(
    () => ({
      isBlocked: (key: string) =>
        Array.from(activeKeys).some((activeKey) => activeKey !== key),
      setBusy,
    }),
    [activeKeys, setBusy],
  );

  return (
    <RoundWriteLockContext.Provider value={value}>{children}</RoundWriteLockContext.Provider>
  );
}

// Throws outside a RoundWriteLockProvider rather than silently no-op'ing:
// a write surface that can't see the lock would have no way to know it
// should defer to another in-flight write, which is exactly the bug this
// exists to prevent.
export function useRoundWriteLock(): RoundWriteLock {
  const ctx = useContext(RoundWriteLockContext);
  if (!ctx) {
    throw new Error("useRoundWriteLock must be used within a RoundWriteLockProvider");
  }
  return ctx;
}
