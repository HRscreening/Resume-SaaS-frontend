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

// ─── Eager imports (small pages — no spinner flash) ─────────
import Landing from "@/routes/Landing";
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
  validateSearch: (search: Record<string, unknown>): { rescore?: 1 } => {
    // When set, the screening page will kick off a rescore on mount.
    // Used after the EditRubric page saves a new rubric.
    if (search.rescore === 1 || search.rescore === "1") return { rescore: 1 };
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

const router = createRouter({ routeTree, defaultNotFoundComponent: NotFound });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App ────────────────────────────────────────────────────

export function App() {
  return <RouterProvider router={router} />;
}
