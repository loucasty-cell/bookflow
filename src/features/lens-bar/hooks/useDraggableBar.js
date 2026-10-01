import { useCallback, useEffect, useRef } from 'react';
import { clampPx, snapPx, toPixels, toRatio } from '../lib/position.js';

const THRESHOLD = 4;

function viewport() {
  const v = window.visualViewport;
  return { width: v ? v.width : window.innerWidth, height: v ? v.height : window.innerHeight };
}

export function useDraggableBar({ ratio, setRatio, watch }) {
  const nodeRef = useRef(null);
  const drag = useRef(null);

  const size = () => {
    const r = nodeRef.current?.getBoundingClientRect();
    return { width: r?.width || 400, height: r?.height || 48 };
  };

  const place = useCallback((px) => {
    if (nodeRef.current) {
      nodeRef.current.style.transform =
        'translate3d(' + Math.round(px.x) + 'px,' + Math.round(px.y) + 'px,0)';
    }
  }, []);

  const layout = useCallback(() => {
    const s = size();
    place(clampPx(toPixels(ratio, s, viewport()), s, viewport()));
  }, [ratio, place]);

  /**
   * A callback ref rather than a plain ref, because the bar mounts after this
   * hook. A plain ref would leave the effect with a null node and no reason to
   * run again, and the bar would sit unplaced at the CSS top-left origin.
   */
  const ref = useCallback(
    (node) => {
      nodeRef.current = node;
      if (node) layout();
    },
    [layout],
  );

  useEffect(() => {
    layout();
  }, [layout, watch]);

  useEffect(() => {
    const vv = window.visualViewport;
    window.addEventListener('resize', layout);
    vv?.addEventListener('resize', layout);
    return () => {
      window.removeEventListener('resize', layout);
      vv?.removeEventListener('resize', layout);
    };
  }, [layout]);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const s = size();
      const vp = viewport();
      const origin = clampPx(toPixels(ratio, s, vp), s, vp);
      drag.current = { x0: e.clientX, y0: e.clientY, origin, s, vp, last: origin, moved: false };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [ratio],
  );
  const onPointerMove = useCallback(
    (e) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      if (!d.moved && Math.hypot(dx, dy) < THRESHOLD) return;
      d.moved = true;
      d.last = clampPx({ x: d.origin.x + dx, y: d.origin.y + dy }, d.s, d.vp);
      place(d.last);
    },
    [place],
  );

  const end = useCallback(
    (e) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      if (d.moved) setRatio(toRatio(snapPx(d.last, d.s, d.vp), d.s, d.vp));
    },
    [setRatio],
  );

  const onKeyDown = useCallback(
    (e) => {
      const step = e.shiftKey ? 48 : 12;
      const delta = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }[e.key];
      if (!delta) return;
      e.preventDefault();
      e.stopPropagation();
      const s = size();
      const vp = viewport();
      const cur = clampPx(toPixels(ratio, s, vp), s, vp);
      setRatio(toRatio(clampPx({ x: cur.x + delta[0], y: cur.y + delta[1] }, s, vp), s, vp));
    },
    [ratio, setRatio],
  );

  return {
    ref,
    gripProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onKeyDown,
      role: 'button',
      tabIndex: 0,
      'aria-label': 'Move assistant. Arrow keys move it; Shift for bigger steps.',
    },
  };
}
