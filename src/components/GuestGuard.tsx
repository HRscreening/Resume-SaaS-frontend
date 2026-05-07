import { useEffect } from "react";
import { Navigate } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";
import { safeNext } from "@/lib/utils";

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Inverse of AuthGuard — keeps already-authenticated users out of pages
 * meant for guests (login, signup). Redirects to /dashboard on hit, unless
 * a safe ?next= is provided (e.g. they followed a marketing link to /checkout
 * while already signed in).
 */
export function GuestGuard({ children }: GuestGuardProps) {
  const authed = isAuthenticated();
  const params = authed ? new URLSearchParams(window.location.search) : null;
  const next = params ? safeNext(params.get("next")) : null;

  // `next` includes a query string (e.g. /checkout/pro?cycle=yearly), which
  // <Navigate> doesn't parse. For that case, do a full-page redirect.
  useEffect(() => {
    if (authed && next) window.location.replace(next);
  }, [authed, next]);

  if (authed) {
    if (next) return null;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
