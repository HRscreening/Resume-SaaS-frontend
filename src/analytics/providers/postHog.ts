import posthog from "posthog-js";
import { POSTHOG_PROJECT_TOKEN, POSTHOG_HOST } from "../constants";
import type { Analytics } from "../interface";
import type { AnalyticsEventProperties } from "../events";


posthog.init(POSTHOG_PROJECT_TOKEN, {
  api_host: POSTHOG_HOST,
  defaults: "2026-05-30",
  autocapture: false,
  capture_pageview: true,
  capture_pageleave: true,

});

export class PostHogAnalytics implements Analytics {
  track(
    event: string,
    properties?: Record<string, unknown>
  ): void {
    posthog.capture(event, properties);
  }

  identify(
    userId: string,
    properties?: Record<string, unknown>
  ): void {
    posthog.identify(userId, properties);
  }

  page(
    properties?: Record<string, unknown>
  ): void {
    posthog.capture("$pageview", properties);
  }

  reset(): void {
    posthog.reset();
  }
}