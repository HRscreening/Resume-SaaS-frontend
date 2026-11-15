// Credit and quota refusals the user can fix by upgrading. The server words the
// message (which situation they are in, and whether anything renews); the client
// shows it as-is and only decides whether to offer an Upgrade action.
const UPGRADE_ERROR_CODES = new Set([
  "FREE_CREDITS_EXHAUSTED",
  "CREDITS_EXHAUSTED",
  "INSUFFICIENT_CREDITS",
  "QUOTA_EXCEEDED",
]);

export type UpgradeAction = { label: "Upgrade"; to: "/upgrade" };

export function upgradeActionFor(error: unknown): UpgradeAction | null {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === "string" && UPGRADE_ERROR_CODES.has(code)
    ? { label: "Upgrade", to: "/upgrade" }
    : null;
}
