import { useCallback, useEffect, useRef, useState } from "react";
import openingBookVideo from "../../../assets/bookflow-opening-intro.mp4";

const HANDOFF_TIME_SECONDS = 9.15;
const HANDOFF_DURATION = 520;

export function BookOpeningIntro({ onComplete }) {
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);
  const timerRef = useRef(null);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsExiting(true);
    timerRef.current = window.setTimeout(onComplete, HANDOFF_DURATION);
  }, [onComplete]);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div
      className={`book-opening-intro ${isExiting ? "is-exiting" : ""}`}
      aria-hidden="true"
    >
      <video
        className="book-opening-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime >= HANDOFF_TIME_SECONDS) finish();
        }}
      >
        <source src={openingBookVideo} type="video/mp4" />
      </video>
      <div className="book-opening-video-scrim" />
    </div>
  );
}
