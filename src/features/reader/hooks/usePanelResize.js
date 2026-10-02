import { useCallback, useEffect, useRef, useState } from "react";

import {
  PANEL_DRAG_THRESHOLD_PX,
  PANEL_KEYBOARD_STEP,
  PANEL_RATIO_DEFAULT,
  PANEL_RATIO_MAX,
  PANEL_RATIO_MIN,
  PANEL_REFERENCE_WIDTH,
  clampPanelRatio,
  ratioFromPointer,
  ratioToPercent,
  ratioToPx,
} from "../lib/panelRatio.js";

/**
 * usePanelResize: pointer and keyboard resizing for the reader navigator.
 *
 * The committed ratio lives in the persisted reader store and is written once,
 * on release. While the pointer is down the draft is written straight to a CSS
 * custom property on the panel element, bypassing React entirely, for two
 * reasons. A drag fires pointermove far faster than a render, and the panel is
 * the first thing on screen, so it has to track the pointer smoothly. And the
 * store is backed by localStorage, so committing per frame would write to disk
 * per frame.
 *
 * The split is deliberate and is the only reason this is not simply
 * "setState on every move": the user sees every intermediate width, and storage
 * sees exactly one value.
 *
 * Keyboard handling calls stopPropagation on every handled key. The reader
 * binds ArrowUp, ArrowDown, J and K globally in useReaderInput, so without that
 * a single arrow press on the grip would both move the panel and move the
 * reading focus.
 */
export function usePanelResize({ ratio, onRatioChange, panelRef, disabled = false }) {
  const dragRef = useRef(null);
  const [draft, setDraft] = useState(null);

  const committed = clampPanelRatio(ratio);
  const active = disabled ? null : draft ?? committed;

  const commit = useCallback(
    (next) => {
      const value = clampPanelRatio(next);
      setDraft(null);
      // Clearing the override first matters: if the panel is left carrying an
      // inline draft, it will disagree with the store the moment the store
      // changes from somewhere else.
      if (panelRef?.current) panelRef.current.style.removeProperty("--panel-ratio");
      onRatioChange?.(value);
    },
    [onRatioChange, panelRef],
  );

  const layoutWidth = useCallback(() => {
    const panel = panelRef?.current;
    const measured = panel?.parentElement?.getBoundingClientRect().width;
    return Number.isFinite(measured) && measured > 0 ? measured : null;
  }, [panelRef]);

  useEffect(() => {
    if (draft === null) return undefined;
    const panel = panelRef?.current;
    panel?.style.setProperty("--panel-ratio", ratioToPercent(draft));
    return () => panel?.style.removeProperty("--panel-ratio");
  }, [draft, panelRef]);

  // A drag in flight must not survive the panel being hidden, or the pointerup
  // lands on nothing and the panel keeps the draft width forever.
  useEffect(() => {
    if (!disabled) return undefined;
    setDraft(null);
    return undefined;
  }, [disabled]);

  const onPointerDown = useCallback(
    (event) => {
      if (disabled || event.button !== 0) return;
      const width = layoutWidth();
      if (width === null) return;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startRatio: committed,
        width,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [committed, disabled, layoutWidth],
  );

  const onPointerMove = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const travel = event.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(travel) < PANEL_DRAG_THRESHOLD_PX) return;
        drag.moved = true;
      }
      setDraft(ratioFromPointer(drag.startX + travel, drag.width));
    },
    [],
  );

  const endDrag = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (!drag.moved) return;
      commit(ratioFromPointer(drag.startX + (event.clientX - drag.startX), drag.width));
    },
    [commit],
  );

  const onKeyDown = useCallback(
    (event) => {
      if (disabled) return;
      const step = event.shiftKey ? PANEL_KEYBOARD_STEP * 4 : PANEL_KEYBOARD_STEP;
      let next = null;
      if (event.key === "ArrowLeft") next = committed - step;
      else if (event.key === "ArrowRight") next = committed + step;
      else if (event.key === "Home") next = PANEL_RATIO_DEFAULT;
      if (next === null) return;
      event.preventDefault();
      // Without this the reader's global arrow navigation fires as well.
      event.stopPropagation();
      commit(next);
    },
    [commit, committed, disabled],
  );

  const width = layoutWidth();
  // The readout has to be a number even before the panel has been measured, or
  // the separator announces nothing on first paint. The reference width is the
  // documented fallback for exactly that window.
  const readoutWidth = width || PANEL_REFERENCE_WIDTH;

  const gripProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onKeyDown,
    role: "separator",
    "aria-orientation": "vertical",
    "aria-label": "Resize navigator. Arrow keys resize, Shift for larger steps, Home to reset.",
    "aria-valuenow": ratioToPx(active, readoutWidth),
    "aria-valuemin": ratioToPx(PANEL_RATIO_MIN, readoutWidth),
    "aria-valuemax": ratioToPx(PANEL_RATIO_MAX, readoutWidth),
    tabIndex: 0,
  };

  return { active, gripProps };
}