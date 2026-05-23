import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";
import {
  getScreening, getResults, getBatchProgress, getResumeDetailFull,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

// ─── Eager imports (small pages — no spinner flash) ─────────
// import Landing from "@/routes/Landing";
import Login from "@/routes/Login";
import Signup from "@/routes/Signup";
import ForgotPassword from "@/routes/ForgotPassword";
import ResetPassword from "@/routes/ResetPassword";
import AuthCallback from "@/routes/AuthCallback";
import Onboarding from "@/routes/Onboarding";
import Terms from "@/routes/Terms";
import Privacy from "@/routes/Privacy";
import Dashboard from "@/routes/Dashboard";
import Screenings from "@/routes/Screenings";
import Settings from "@/routes/Settings";
import Profile from "@/routes/Profile";
import ChangePassword from "@/routes/ChangePassword";
import NewScreening from "@/routes/NewScreening";
import NotFound from "@/routes/NotFound";

// ─── Eager imports — these are the most-visited pages, no lazy delay ──
import ScreeningDetail from "@/routes/ScreeningDetail";
import ResumeDetail from "@/routes/ResumeDetail";
import EditRubric from "@/routes/EditRubric";



// 
import UgradePlan from "@/routes/pricing/ugradePlan";
import Checkout from "@/routes/pricing/Checkout";

// ─── Layouts ────────────────────────────────────────────────

function RootLayout() {
  return <Outlet />;
}

function AppLayout({isSidebarRequired = true}: {isSidebarRequired?: boolean}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        {isSidebarRequired && <Sidebar />}
        <main className="flex-1 min-w-0" style={{ backgroundColor: "#F5F3EE" }}>
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  );
}

function AuthOnlyLayout() {
  return (
    <AuthGuard>
      <Outlet />
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
  beforeLoad: () => {
    throw redirect({
      to: "/login",
    });
  },
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

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: Terms,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: Privacy,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app-layout",
  component: AppLayout,
});

const appLayoutNoSidebarRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app-layout-no-sidebar",
  component: (props) => <AppLayout {...props} isSidebarRequired={false} />,
});

const authOnlyLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth-only-layout",
  component: AuthOnlyLayout,
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
  // Fire-and-forget prefetch on Link hover (defaultPreload: "intent").
  // All three queries fire in parallel and populate React Query's cache,
  // so by the time the user clicks, the page renders from warm cache.
  loader: ({ params }) => {
    const { id } = params;
    queryClient.prefetchQuery({ queryKey: ["screening", id], queryFn: () => getScreening(id) });
    queryClient.prefetchQuery({ queryKey: ["results", id], queryFn: () => getResults(id) });
    queryClient.prefetchQuery({ queryKey: ["batch-progress", id], queryFn: () => getBatchProgress(id) });
  },
  validateSearch: (search: Record<string, unknown>): { saved?: 1 } => {
    // When set, the screening page will show a "Rubric saved" toast.
    if (search.saved === 1 || search.saved === "1") return { saved: 1 };
    return {};
  },
});

const editRubricRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/screenings/$id/rubric",
  component: EditRubric,
});

const resumeDetailRoute = createRoute({
  getParentRoute: () => authOnlyLayoutRoute,
  path: "/screenings/$id/$resumeId",
  component: ResumeDetail,
  // Two-pronged prefetch: the combined `resume-full` endpoint covers
  // detail + signed PDF URL in one HTTP round-trip; the screening query
  // is usually a cache-hit (came from /screenings/$id) but we prefetch
  // it too in case the user landed here via direct URL paste.
  loader: ({ params }) => {
    const { id, resumeId } = params;
    queryClient.prefetchQuery({
      queryKey: queryKeys.screening(id, resumeId),
      queryFn: () => getResumeDetailFull(id, resumeId),
    });
    queryClient.prefetchQuery({ queryKey: ["screening", id], queryFn: () => getScreening(id) });
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: Settings,
});

const profileRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/profile",
  component: Profile,
});

const changePasswordRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings/password",
  component: ChangePassword,
});



const upgradePlanRoute = createRoute({
  getParentRoute: () => appLayoutNoSidebarRoute,
  path: "/upgrade",
  component: UgradePlan,
});

const checkoutRoute = createRoute({
  getParentRoute: () => appLayoutNoSidebarRoute,
  path: "/checkout/$plan",
  component: Checkout,
  validateSearch: (search: Record<string, unknown>) => ({
    cycle: search.cycle === "yearly" ? "yearly" : "monthly",
    from: typeof search.from === "string" ? search.from : undefined,
  }),
});

// ─── Build router ───────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  landingRoute,
  authLayoutRoute.addChildren([loginRoute, signupRoute, forgotPasswordRoute, resetPasswordRoute]),
  authCallbackRoute,
  onboardingRoute,
  termsRoute,
  privacyRoute,
  appLayoutNoSidebarRoute.addChildren([
    upgradePlanRoute,
    checkoutRoute,
  ]),
  authOnlyLayoutRoute.addChildren([
    resumeDetailRoute,
  ]),
  appLayoutRoute.addChildren([
    dashboardRoute,
    screeningsRoute,
    newScreeningRoute,
    screeningDetailRoute,
    editRubricRoute,
    settingsRoute,
    profileRoute,
    changePasswordRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
  // Begin route prep on link hover/touch-start so click → render is instant.
  // Components are eagerly imported, so this primarily warms router state and
  // any beforeLoad resolves; component-level useQuery still runs on mount, but
  // by then the route is mounted earlier.
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App ────────────────────────────────────────────────────

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
