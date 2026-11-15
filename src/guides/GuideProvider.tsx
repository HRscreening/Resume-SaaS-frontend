
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useJoyride } from "react-joyride";
import { useQueryClient } from "@tanstack/react-query";

import { GuideContext } from "./GuideContext";
import { guideRegistry } from "./guideRegistry";
import { GuideArrow } from "./GuideArrow";
import { GuideTooltip } from "./GuideTooltip";
import "./guide.css";
import { getProfile, updateProfile } from "@/lib/api";
import { useProfileQueryKey } from "@/hooks/useProfile";
import { toast } from "sonner";
import type { GuideDefinition, GuideId } from "./types";
import type { Profile } from "@/types";

const COMPACT_SCREEN_QUERY = "(max-width: 640px)";

interface GuideProviderProps {
  children: ReactNode;
}

export function GuideProvider({ children }: GuideProviderProps) {
  const queryClient = useQueryClient();
  const profileQueryKey = useProfileQueryKey();
  const [activeGuide, setActiveGuide] = useState<GuideDefinition | null>(null);
  const [startRequest, setStartRequest] = useState(0);
  const [isCompactScreen, setIsCompactScreen] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.(COMPACT_SCREEN_QUERY).matches === true
  );

  const steps = useMemo(
    () =>
      isCompactScreen
        ? []
        : activeGuide?.steps.map((step, index) => ({
            ...step,
            placement: step.placement ?? "bottom",
            ...(index === 0 ? { skipBeacon: true } : {}),
          })) ?? [],
    [activeGuide, isCompactScreen]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(COMPACT_SCREEN_QUERY);
    const updateCompactScreen = (event: MediaQueryListEvent) =>
      setIsCompactScreen(event.matches);

    mediaQuery.addEventListener("change", updateCompactScreen);
    return () => mediaQuery.removeEventListener("change", updateCompactScreen);
  }, []);

  const { controls, on, state, Tour } = useJoyride({
    continuous: true,
    steps,
    tooltipComponent: GuideTooltip,
    arrowComponent: GuideArrow,
    options: {
      primaryColor: "#171411",
      overlayColor: "rgba(0, 0, 0, 0.48)",
      spotlightRadius: 11,
      spotlightPadding: 2,
      offset: 24,
      arrowBase: 28,
      arrowSize: 24,
      zIndex: 1200,
      buttons: ["back", "close", "primary"],
      closeButtonAction: "skip",
      blockTargetInteraction: false,
      overlayClickAction: false,
      dismissKeyAction: false,
    },
    styles: {
      spotlight: {
        stroke: "#FFFFFF",
        strokeWidth: 2,
        strokeLinecap: "round",
        filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.24))",
      },
    },
  });

  const startGuide = useCallback(
    (id: GuideId) => {
      if (isCompactScreen) return;

      const guide = guideRegistry.get(id);

      if (!guide) {
        console.warn(`Guide "${id}" not found.`);
        return;
      }

      const start = () => {
        setActiveGuide(guide);
        setStartRequest((prev) => prev + 1);
      };
      const profile = queryClient.getQueryData<Profile>(profileQueryKey);

      if (profile) {
        if (!profile.guide?.[id]) start();
        return;
      }

      void queryClient.ensureQueryData({
        queryKey: profileQueryKey,
        queryFn: getProfile,
      })
        .then((loadedProfile) => {
          if (!loadedProfile.guide?.[id]) start();
        })
        .catch((error: unknown) => {
          toast.error(
            error instanceof Error ? error.message : "Could not load guide status."
          );
        });
    },
    [isCompactScreen, profileQueryKey, queryClient]
  );

  // Start after the new guide's steps have been supplied.
  useEffect(() => {
    if (!activeGuide || startRequest === 0 || isCompactScreen) return;

    controls.reset();
    controls.start();
  }, [activeGuide, startRequest, controls, isCompactScreen]);

  useEffect(() => {
    if (!isCompactScreen || !activeGuide) return;

    if (state.status === "running" || state.status === "waiting") {
      controls.stop();
    }

    setActiveGuide(null);
  }, [activeGuide, controls, isCompactScreen, state.status]);

  // Clear the active guide after it is completed.
  useEffect(() => {
    return on("tour:end", (data) => {
      const status =
        data.status === "finished"
          ? "completed"
          : data.status === "skipped"
            ? "skipped"
            : null;

      // API CALL TO MARK DONE/SKIPPED
      if (activeGuide && status) {
        void (async () => {
          try {
            const profile = await queryClient.ensureQueryData({
              queryKey: profileQueryKey,
              queryFn: getProfile,
            });
            const updatedProfile = await updateProfile({
              guide: {
                ...profile.guide,
                [activeGuide.id]: status,
              },
            });
            queryClient.setQueryData(profileQueryKey, updatedProfile);
          } catch (error: unknown) {
            toast.error(
              error instanceof Error ? error.message : "Could not save tour status."
            );
          }
        })();
      }

      setActiveGuide(null);
    });
  }, [activeGuide, on, profileQueryKey, queryClient]);

  const isRunning =
    state.status === "running" ||
    state.status === "waiting";

  const contextValue = useMemo(
    () => ({
      startGuide,
      isRunning,
      activeGuide,
    }),
    [startGuide, isRunning, activeGuide]
  );

  return (
    <GuideContext.Provider value={contextValue}>
      {children}
      {Tour}
    </GuideContext.Provider>
  );
}
