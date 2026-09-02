/**
 * Client mirror of the server's permission rule. Presentation only: the
 * server is the access control. This stops a viewer being offered actions
 * that cannot succeed, and stops a control someone forgot to hide from
 * appearing to work. Latched from the profile response because request()
 * runs outside React.
 */
export type AccountRole = "owner" | "viewer";

let role: AccountRole = "owner";
export function setAccountRole(r: AccountRole | undefined): void { role = r ?? "owner"; }
export function accountRole(): AccountRole { return role; }

// Mirrors READ_ONLY_ROUTES in backend app/api/deps.py. Server decides on drift.
const READ_ONLY_POST = [
  /\/results(\?|$)/, /\/get-applications(\?|$)/, /\/file-url(\?|$)/,
  /\/export(\?|$)/, /\/export-selected(\?|$)/, /\/export\/applications\/selected(\?|$)/,
  /\/resumes\/download(\?|$)/, /\/session-hint\/(set|clear)(\?|$)/,
];

export class ReadOnlyError extends Error {
  constructor() { super("This account has read-only access and cannot make changes."); this.name = "ReadOnlyError"; }
}

export function assertWritable(path: string, method?: string): void {
  if (role !== "viewer") return;
  const m = (method ?? "GET").toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return;
  if (m === "POST" && READ_ONLY_POST.some((re) => re.test(path))) return;
  throw new ReadOnlyError();
}
