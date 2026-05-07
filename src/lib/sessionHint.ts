/**
 * Cross-subdomain "logged-in" hint cookie.
 *
 * Backend sets/clears `hs_auth=1` scoped to the parent domain so the marketing
 * site can detect logged-in state. Advisory only — never gate sensitive UI on it.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function setSessionHint(accessToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/session-hint/set`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Hint is advisory; failure must not break auth flow.
  }
}

export async function clearSessionHint(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/session-hint/clear`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort.
  }
}
