import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  redirect,
  Outlet,
  stripSearchParams,
  parseSearchWith,
  stringifySearchWith,
} from "@tanstack/react-router";
import qs from 'query-string'

import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";
import {
  getScreening, getResumeDetailFull,
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
import Screenings from "@/modules/screening/routes/Screenings";
import Settings from "@/routes/Settings";
import Profile from "@/routes/Profile";
import ChangePassword from "@/routes/ChangePassword";
import NewScreening from "@/routes/NewScreening";
import NotFound from "@/routes/NotFound";

// Candidates
// import Candidates from "@/routes/Candidates";
import Candidates from "@/routes/NewCandidatePage";




// ─── Eager imports — these are the most-visited pages, no lazy delay ──
// import ScreeningDetail from "@/routes/ScreeningDetail"; // Old one
import ScreeningDetail from "@/modules/screening/routes/screening"; // New one
import { Sections, sectionTabs } from "@/modules/screening/routes/screening";
import { searchSchema, screeningsSearchSchema, screeningDetailsSearchSchema } from "@/modules/screening/types/searchSchema"; // New one

import ResumeDetail from "@/routes/ResumeDetail";
import EditRubric from "@/modules/screening/routes/EditRubric";
import VoiceConfigPage from "@/routes/VoiceConfig";
import VoiceCalls from "@/routes/VoiceCalls";
import TranscriptPage from "@/routes/TranscriptPage";



// 
import UgradePlan from "@/routes/pricing/ugradePlan";
import Checkout from "@/routes/pricing/Checkout";
import ContactUs from "@/routes/ContactUs";

// ─── Layouts ────────────────────────────────────────────────

function RootLayout() {
  return <Outlet />;
}

function AppLayout({ isSidebarRequired = true }: { isSidebarRequired?: boolean }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        {/*
          Sidebar (desktop, ≥md) sits inline at full viewport height;
          MobileNav (<md) is fixed-position above the main column. Both
          share state-bearing SidebarInner so logic isn't duplicated.
        */}
        {isSidebarRequired && (
          <>
            <Sidebar />
            <MobileNav />
          </>
        )}
        {/*
          Main is the scroll container — page-level scrolling happens here,
          not on the window, so the sidebar stays put at full height.
          pt-14 reserves space for the fixed mobile top bar; md:pt-0
          reclaims it on desktop where the sidebar is inline.
        */}
        <main
          className={cn(
            "flex-1 min-w-0 h-screen overflow-y-auto",
            isSidebarRequired && "pt-14 md:pt-0",
          )}
          style={{ backgroundColor: "#F5F3EE" }}
        >
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
  validateSearch: screeningsSearchSchema, // Zod schema for search params validation
  component: Screenings,

  search: {
    middlewares: [
      stripSearchParams({
        search: undefined,
        type: "Active",
      }),
    ],
  },
});

// const candidatesRoute = createRoute({
//   getParentRoute: () => appLayoutRoute,
//   path: "/candidates",
//   component: Candidates,
// });

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
  // loader: ({ params }) => {
  //   const { id } = params;
  //   queryClient.prefetchQuery({ queryKey: ["screening", id], queryFn: () => getScreening(id) });
  //   queryClient.prefetchQuery({ queryKey: ["results", id], queryFn: () => getResults(id) });
  //   // queryClient.prefetchQuery({ queryKey: ["batch-progress", id], queryFn: () => getBatchProgress(id) });
  // },
  validateSearch: screeningDetailsSearchSchema, // Zod schema for search params validation

  search: {
    middlewares: [
      stripSearchParams(screeningDetailsSearchSchema.parse({}))
    ],
  },

});

const editRubricRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/screenings/$id/rubric",
  component: EditRubric,
});

const voiceConfigRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/screenings/$id/voice",
  component: VoiceConfigPage,
});

const voiceCallsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/screenings/$id/voice/calls",
  component: VoiceCalls,
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

const transcriptRoute = createRoute({
  getParentRoute: () => authOnlyLayoutRoute,
  path: "/screenings/$id/voice/calls/$callId/transcript",
  component: TranscriptPage,
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

const contactUsRoute = createRoute({
  getParentRoute: () => appLayoutNoSidebarRoute,
  path: "/contact",
  component: ContactUs,
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
    contactUsRoute,
    checkoutRoute,
  ]),
  authOnlyLayoutRoute.addChildren([
    resumeDetailRoute,
    transcriptRoute,
  ]),
  appLayoutRoute.addChildren([
    dashboardRoute,
    screeningsRoute,
    // candidatesRoute,
    newScreeningRoute,
    screeningDetailRoute,
    editRubricRoute,
    voiceConfigRoute,
    voiceCallsRoute,
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
      <Toaster position="top-right" richColors={true} />
    </>
  );
}
