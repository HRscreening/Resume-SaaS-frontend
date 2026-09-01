/**
 * Client-side mirror of the server's read-only viewer guard.
 *
 * Hiding buttons one by one does not work: there are 17 components holding
 * mutations, and every one of them is a chance to miss a control. This is the
 * single place every API call passes through, so a write that slips past the UI
 * still stops here with a message that says why.
 *
 * This is NOT the access control — the server's deny-by-default guard is, and it
 * runs whatever the browser believes. This exists so a viewer gets "read-only
 * access" instead of a raw 403, and so a control I forgot to hide cannot appear
 * to work.
 */

// Set from the profile response rather than held in React state, because
// request() is called from plain functions outside the component tree.
let viewerSession = false;

export function setViewerSession(value: boolean): void {
  viewerSession = value;
}

export function isViewerSession(): boolean {
  return viewerSession;
}

/**
 * Reads that have to be POSTs because they carry a filter body. Kept in step
 * with READ_ONLY_ROUTES in the backend's app/core/viewer.py — if the two drift,
 * the server is the one that decides.
 */
const READ_ONLY_POST_PATTERNS: RegExp[] = [
  /\/results(\?|$)/,
  /\/get-applications(\?|$)/,
  /\/export(\?|$)/,
  /\/export-selected(\?|$)/,
  /\/export\/applications\/selected(\?|$)/,
  /\/resumes\/download(\?|$)/,
  /\/session-hint\/(set|clear)(\?|$)/,
];

export class ReadOnlyError extends Error {
  constructor() {
    super("This account has read-only access and cannot make changes.");
    this.name = "ReadOnlyError";
  }
}

/** Throw if this request would write and the session is read-only. */
export function assertWritable(path: string, method?: string): void {
  if (!viewerSession) return;
  const verb = (method ?? "GET").toUpperCase();
  if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") return;
  if (verb === "POST" && READ_ONLY_POST_PATTERNS.some((re) => re.test(path))) return;
  throw new ReadOnlyError();
}
