import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { safeNext } from "@/lib/utils";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F3EE" }}>
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    const here = window.location.pathname + window.location.search;
    const next = safeNext(here);
    return <Navigate to="/login" search={next ? { next } : undefined} replace />;
  }

  return <>{children}</>;
}
