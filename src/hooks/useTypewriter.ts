import { useCallback, useEffect, useRef } from "react";

interface UseTypewriterOptions {
  // Fired with the growing visible text every frame the reveal advances.
  onReveal: (text: string) => void;
  // Fired once the buffer is fully revealed *and* the producer called finish().
  onDone?: () => void;
  // Reveal pace. Tune this if the typing feels too fast / too slow.
  charsPerSecond?: number;
}

// Decouples how fast text *arrives* from how fast it's *shown*. A producer (e.g.
// a streaming fetch that lands in big bursts) pushes the full accumulated string
// via `push`; the hook reveals it at a steady chars-per-second pace using
// requestAnimationFrame, so it reads like a chat response being typed out rather
// than dumping all at once.
//
// Lifecycle: `reset()` before a run, `push(fullText)` as text arrives,
// `finish()` when the source is exhausted (keeps revealing until it catches up,
// then fires onDone), `cancel()` to stop immediately.
export function useTypewriter({ onReveal, onDone, charsPerSecond = 350 }: UseTypewriterOptions) {
  const targetRef = useRef("");      // latest full text from the producer
  const shownRef = useRef(0);        // chars currently revealed
  const doneRef = useRef(false);     // producer has called finish()
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  // Hold the latest callbacks in refs so the rAF loop never closes over stale
  // versions and we don't have to restart it when they change.
  const onRevealRef = useRef(onReveal);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onRevealRef.current = onReveal; }, [onReveal]);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  }, []);

  const tick = useCallback((ts: number) => {
    const target = targetRef.current;
    if (shownRef.current >= target.length) {
      // Caught up: finish if the source is exhausted, else pause until the next
      // push() restarts the loop.
      stop();
      if (doneRef.current) onDoneRef.current?.();
      return;
    }
    if (lastTsRef.current == null) lastTsRef.current = ts;
    const dt = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;
    const advance = Math.max(1, Math.round(charsPerSecond * dt));
    shownRef.current = Math.min(target.length, shownRef.current + advance);
    onRevealRef.current(target.slice(0, shownRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, [charsPerSecond, stop]);

  const ensureRunning = useCallback(() => {
    if (rafRef.current == null) {
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const push = useCallback((fullText: string) => {
    targetRef.current = fullText;
    ensureRunning();
  }, [ensureRunning]);

  const finish = useCallback(() => {
    doneRef.current = true;
    // Restart the loop in case it had paused after catching up, so onDone fires.
    ensureRunning();
  }, [ensureRunning]);

  const reset = useCallback(() => {
    stop();
    targetRef.current = "";
    shownRef.current = 0;
    doneRef.current = false;
  }, [stop]);

  const cancel = useCallback(() => {
    stop();
    doneRef.current = false;
  }, [stop]);

  // Cancel any in-flight animation if the component unmounts mid-reveal.
  useEffect(() => stop, [stop]);

  return { push, finish, reset, cancel };
}
