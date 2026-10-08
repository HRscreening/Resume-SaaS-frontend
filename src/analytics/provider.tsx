import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { Analytics } from "./interface";
import { PostHogAnalytics } from "./providers/postHog";

const analytics = new PostHogAnalytics();

const AnalyticsContext = createContext<Analytics | null>(null);




/** */
export function AnalyticsProvider({
  children,
}: {
  children: ReactNode;
}) {



  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): Analytics {
  const value = useContext(AnalyticsContext);

  if (!value) {
    throw new Error(
      "useAnalytics must be used inside AnalyticsProvider"
    );
  }

  return value;
}