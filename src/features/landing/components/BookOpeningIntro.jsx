import { useCallback, useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    const handleKeyDown = () => finish();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timerRef.current);
    };
  }, [finish]);

  return (
    <div
      className={`book-opening-intro ${isExiting ? "is-exiting" : ""}`}
      aria-hidden="true"
      onClick={finish}
      style={{ cursor: "pointer" }}
    >
      <video
        autoPlay
        muted
        playsInline
        className="book-opening-video"
        src="/bookflow-opening-intro.mp4"
        onEnded={finish}
        onError={finish}
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime >= HANDOFF_TIME_SECONDS) finish();
        }}
      />
      <div className="book-opening-video-scrim" />
      <button
        type="button"
        className="intro-skip-button"
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
        aria-label="Skip intro"
        style={{
          position: "absolute",
          bottom: "2rem",
          right: "2rem",
          zIndex: 10,
          background: "rgba(0, 0, 0, 0.6)",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "9999px",
          padding: "0.5rem 1.25rem",
          fontSize: "0.875rem",
          fontWeight: "500",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
        }}
      >
        Skip
      </button>
    </div>
  );
}
