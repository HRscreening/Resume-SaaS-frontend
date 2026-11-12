import { ConnectionQuality } from "livekit-client";

// Only the two states a candidate can act on get a badge. "Good" and
// "Excellent" need no announcement, and "Unknown" is the pre-measurement
// default, which would flash a false alarm at the start of every call.
export function connectionLabel(quality: ConnectionQuality): string | null {
  switch (quality) {
    case ConnectionQuality.Poor:
      return "Weak connection";
    case ConnectionQuality.Lost:
      return "Connection lost";
    default:
      return null;
  }
}
