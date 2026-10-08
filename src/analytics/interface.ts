import  type { AnalyticsEventName,AnalyticsEventProperties } from "./events";
import type { AnalyticsProperties } from "./types";

export interface Analytics {
  track<E extends AnalyticsEventName>(
    event: E,
    properties?: E extends keyof AnalyticsEventProperties ? AnalyticsEventProperties[E] : Record<string, unknown>
  ): void;

  identify(
    userId: string,
    properties?: AnalyticsProperties
  ): void;

  // group(
  //   groupType: string,
  //   groupId: string,
  //   properties?: AnalyticsProperties
  // ): void;

  page(
    properties?: AnalyticsProperties
  ): void;

  reset(): void;
}