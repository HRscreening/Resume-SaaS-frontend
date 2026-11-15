import { createContext } from "react";
import type { GuideDefinition, GuideId } from "./types";

export interface GuideContextType {
  startGuide: (id: GuideId) => void;

  isRunning: boolean;
  activeGuide: GuideDefinition | null;
}

export const GuideContext = createContext<GuideContextType | null>(null);