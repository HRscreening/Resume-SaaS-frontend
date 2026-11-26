import { useState } from "react";
import { cn } from "@/lib/utils";
import { avatarState } from "../logic";

interface ProspectAvatarProps {
  name: string | null;
  photoUrl: string | null;
  size?: "sm" | "lg";
}

// Vendor photo URLs (often signed LinkedIn CDN links) expire; on error we fall
// back to initials, and to a blank tile when there is no name either.
export function ProspectAvatar({ name, photoUrl, size = "sm" }: ProspectAvatarProps) {
  const [failed, setFailed] = useState(false);
  const state = avatarState(name, photoUrl, failed);
  const box = size === "lg" ? "h-14 w-14 text-base" : "h-9 w-9 text-xs";

  if (state.kind === "img" && photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(box, "rounded-full object-cover shrink-0 bg-[#F0EEEA]")}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(box, "rounded-full shrink-0 flex items-center justify-center font-semibold bg-[#F0EEEA] text-[#5C5C5C]")}
    >
      {state.initials}
    </div>
  );
}
