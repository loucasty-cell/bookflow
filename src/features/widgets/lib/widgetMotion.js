import { animate, createScope, utils } from "animejs";

const reduced = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

/**
 * anime.js owns the widget value tween. The animated number lives on a plain
 * proxy object and is written straight to the node, so a 60fps tween never
 * re-renders the React tree.
 */
export function tweenNumber(node, from, to, { format, duration = 900, scope } = {}) {
  if (!node) return null;
  const write = (v) => {
    node.textContent = format ? format(v) : String(Math.round(v));
  };

  if (reduced() || from === to) {
    write(to);
    return null;
  }

  const proxy = { value: from };
  return animate(proxy, {
    value: to,
    duration,
    ease: "out(3)",
    onUpdate: () => write(proxy.value),
    scope,
  });
}

export function tweenRing(node, circumference, ratio, { duration = 780, scope } = {}) {
  if (!node) return null;
  const to = circumference * (1 - Math.max(0, Math.min(1, ratio)));
  if (reduced()) {
    node.style.strokeDashoffset = String(to);
    return null;
  }
  utils.set(node, { strokeDashoffset: node.style.strokeDashoffset || String(circumference) });
  return animate(node, { strokeDashoffset: to, duration, ease: "out(2)", scope });
}

export function createWidgetScope(node) {
  if (!node) return null;
  return createScope({ node });
}

export { animate, createScope, utils };
