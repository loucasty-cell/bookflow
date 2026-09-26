import { useEffect, useRef } from "react";

/**
 * Staggered widget entrance driven by ScrollTrigger. The trigger is created
 * once and reverted on unmount, and it never runs when the user asked for
 * reduced motion, where the grid is simply present.
 */
export function useWidgetReveal(enabled = true) {
  const gridRef = useRef(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !enabled) return undefined;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      return undefined;
    }

    let trigger = null;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !grid.isConnected) return;

      gsap.registerPlugin(ScrollTrigger);

      const cards = Array.from(grid.querySelectorAll(".widget-frame"));
      if (cards.length === 0) return;

      gsap.set(cards, { opacity: 0, y: 18 });

      trigger = ScrollTrigger.create({
        trigger: grid,
        start: "top 92%",
        once: true,
        onEnter: () => {
          gsap.to(cards, {
            opacity: 1,
            y: 0,
            duration: 0.62,
            ease: "power3.out",
            stagger: { each: 0.055, from: "start" },
            overwrite: true,
          });
        },
      });
    })().catch(() => {});

    return () => {
      cancelled = true;
      trigger?.kill();
    };
  }, [enabled]);

  return gridRef;
}
