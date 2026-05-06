import { Navigate } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Inverse of AuthGuard — keeps already-authenticated users out of pages
 * meant for guests (login, signup). Redirects to /dashboard on hit.
 *
 * Reads auth synchronously: initAuth() runs before first render in main.tsx,
 * so the cached session is always available here — no loader needed.
 */
export function GuestGuard({ children }: GuestGuardProps) {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" />;
  }
  return <>{children}</>;
}
