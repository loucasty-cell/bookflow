import React, { useEffect, useRef, useState } from "react";
import { FocusBarBackdrop } from "./FocusBarBackdrop.jsx";

/**
 * Spline scene slot for the focus bar.
 *
 * The Spline runtime only accepts a `.splinecode` file exported from the Spline
 * editor, which is an authored binary asset. Until one is supplied there is
 * nothing to load, so the procedural shader stands in and the runtime is never
 * fetched. Set VITE_SPLINE_SCENE to a `.splinecode` URL to switch over.
 */
const SCENE_URL = import.meta.env?.VITE_SPLINE_SCENE ?? "";

export function FocusBarAmbient({ className = "" }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState(SCENE_URL ? "loading" : "procedural");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!SCENE_URL) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let app = null;
    let cancelled = false;

    (async () => {
      try {
        const { Application } = await import("@splinetool/runtime");
        if (cancelled || !canvas.isConnected) return;
        app = new Application(canvas);
        await app.load(SCENE_URL);
        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("procedural");
        }
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
      app?.dispose?.();
    };
  }, []);

  if (status === "ready") {
    return <canvas className={className} ref={canvasRef} aria-hidden="true" />;
  }

  return (
    <>
      {error ? (
        <span className="visually-hidden" role="status">
          Spline scene unavailable, using the procedural backdrop.
        </span>
      ) : null}
      <FocusBarBackdrop className={className} />
    </>
  );
}

export const SPLINE_SCENE_CONFIGURED = Boolean(SCENE_URL);
