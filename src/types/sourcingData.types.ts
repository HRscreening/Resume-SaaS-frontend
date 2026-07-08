


export type SourcingPlatform = {
  platform: PlatformName;
  icon: string;
  href: string;
};
export enum PlatformName {
  HIRIST = "HIRIST",
  LINKEDIN = "LINKEDIN",
  NAUKRI = "NAUKRI",
  IIMJOBS = "IIMJOBS",
}

export type SourcingData = {
  platform: PlatformName;
  new_applications_cnt: number;
  total_fetched_applications: number;
  last_fetched_at: string | null;
}

