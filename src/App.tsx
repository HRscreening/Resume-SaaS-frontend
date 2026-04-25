import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";

// ─── Eager imports (small pages — no spinner flash) ─────────
import Landing from "@/routes/Landing";
import Login from "@/routes/Login";
import Signup from "@/routes/Signup";
import ForgotPassword from "@/routes/ForgotPassword";
import ResetPassword from "@/routes/ResetPassword";
import AuthCallback from "@/routes/AuthCallback";
import Onboarding from "@/routes/Onboarding";
import Dashboard from "@/routes/Dashboard";
import Screenings from "@/routes/Screenings";
import Settings from "@/routes/Settings";
import NewScreening from "@/routes/NewScreening";

// ─── Eager imports — these are the most-visited pages, no lazy delay ──
import ScreeningDetail from "@/routes/ScreeningDetail";
import ResumeDetail from "@/routes/ResumeDetail";

// ─── Layouts ────────────────────────────────────────────────

function RootLayout() {
  return <Outlet />;
}

function AppLayout() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0" style={{ backgroundColor: "#F5F3EE" }}>
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  );
}

// Import AuthLayout eagerly too
import { AuthLayout } from "@/components/layout/AuthLayout";

// ─── Route tree ─────────────────────────────────────────────

const rootRoute = createRootRoute({ component: RootLayout });

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Landing,
});

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth-layout",
  component: AuthLayout,
});

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/login",
  component: Login,
});

const signupRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/signup",
  component: Signup,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/forgot-password",
  component: ForgotPassword,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/reset-password",
  component: ResetPassword,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: AuthCallback,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: Onboarding,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app-layout",
  component: AppLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/dashboard",
  component: Dashboard,
});

const screeningsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/screenings",
  component: Screenings,
});

const newScreeningRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/screenings/new",
  component: NewScreening,
});

const screeningDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/screenings/$id",
  component: ScreeningDetail,
});

const resumeDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/screenings/$id/$resumeId",
  component: ResumeDetail,
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: Settings,
});

// ─── Build router ───────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  landingRoute,
  authLayoutRoute.addChildren([loginRoute, signupRoute, forgotPasswordRoute, resetPasswordRoute]),
  authCallbackRoute,
  onboardingRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    screeningsRoute,
    newScreeningRoute,
    screeningDetailRoute,
    resumeDetailRoute,
    settingsRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App ────────────────────────────────────────────────────

export function App() {
  return <RouterProvider router={router} />;
}
