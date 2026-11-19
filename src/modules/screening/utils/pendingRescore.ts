import { z } from "zod";

const pendingSchema = z.object({
  screeningId: z.string(),
  userId: z.string(),
  resumeIds: z.array(z.string()).min(1),
  ready: z.boolean(),
  createdAt: z.number(),
});
const key = (token: string) => `pending-rescore:${token}`;
const lifetime = 2 * 60 * 60 * 1000;

export function createPendingRescore(screeningId: string, userId: string, resumeIds: string[]) {
  if (!resumeIds.length) throw new Error("Select at least one candidate to rescore.");
  const token = crypto.randomUUID();
  sessionStorage.setItem(key(token), JSON.stringify({ screeningId, userId, resumeIds: [...new Set(resumeIds)], ready: false, createdAt: Date.now() }));
  return token;
}

export function readPendingRescore(token: string | undefined, screeningId: string, userId: string) {
  if (!token) return null;
  try {
    const parsed = pendingSchema.safeParse(JSON.parse(sessionStorage.getItem(key(token)) ?? "null"));
    if (!parsed.success || parsed.data.screeningId !== screeningId || parsed.data.userId !== userId) return null;
    if (Date.now() - parsed.data.createdAt > lifetime) {
      discardPendingRescore(token);
      return null;
    }
    return parsed.data;
  } catch { return null; }
}

export function discardPendingRescore(token: string | undefined) {
  if (token) sessionStorage.removeItem(key(token));
}

export function markPendingRescoreReady(token: string, screeningId: string, userId: string) {
  const pending = readPendingRescore(token, screeningId, userId);
  if (!pending) return false;
  sessionStorage.setItem(key(token), JSON.stringify({ ...pending, ready: true }));
  return true;
}

// Consume synchronously before starting any async request (including in StrictMode).
export function consumePendingRescore(token: string, screeningId: string, userId: string) {
  const pending = readPendingRescore(token, screeningId, userId);
  if (!pending) return null;
  discardPendingRescore(token);
  return pending.ready ? pending : null;
}
