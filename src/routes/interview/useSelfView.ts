import { useEffect, useRef, useState } from "react";

// The candidate's own camera, shown back to them in the stage's corner. A
// local preview only: nothing here publishes the track or records it.
// Opened only when the round asks for a camera, and stopped on unmount so
// the camera light goes off with the interview.
export function useSelfView(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 360 }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setLive(true);
      })
      // The pre-join check already proved the camera works; failing here
      // (another app took it) just leaves the tile on its placeholder.
      .catch(() => setLive(false));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      setLive(false);
    };
  }, [enabled]);

  return { videoRef, live };
}
