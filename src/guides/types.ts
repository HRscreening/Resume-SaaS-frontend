import type {GuideId} from "./constants"
export type { GuideId };

export interface GuideStep {
  target: string;
  content: string;

  title?: string;

  placement?: 
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "auto";

  skipBeacon?: boolean;

  disableBeacon?: boolean;

  // Prevent Joyride from scrolling the target into view.
  skipScroll?: boolean;
}

export interface GuideDefinition {
  id: GuideId;
  title: string;
  description?: string;

  steps: GuideStep[];

  // Version helps identify updated guides.
  version?: number;
}