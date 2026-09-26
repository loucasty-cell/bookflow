import React, { useEffect, useRef } from "react";
import { createWidgetScope, tweenNumber, tweenRing } from "./widgetMotion.js";

/**
 * Counts up to `value`. The tween runs on a proxy object and writes textContent
 * directly, so the animation never re-renders React.
 */
export function AnimatedValue({ value, format, duration = 900, className }) {
  const nodeRef = useRef(null);
  const currentRef = useRef(0);
  const scopeRef = useRef(null);
  const firstRef = useRef(true);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return undefined;

    if (!scopeRef.current) scopeRef.current = createWidgetScope(node);
    const scope = scopeRef.current;

    if (firstRef.current) {
      firstRef.current = false;
      currentRef.current = value;
      node.textContent = format ? format(value) : String(value);
      return undefined;
    }

    const animation = tweenNumber(node, currentRef.current, value, { format, duration, scope });
    currentRef.current = value;
    return () => animation?.revert?.();
  }, [value, format, duration]);

  useEffect(() => () => scopeRef.current?.revert?.(), []);

  return (
    <span className={className} ref={nodeRef}>
      {format ? format(value) : value}
    </span>
  );
}

export function AnimatedRing({ circumference, ratio, size, stroke }) {
  const nodeRef = useRef(null);
  const ratioRef = useRef(ratio);

  useEffect(() => {
    ratioRef.current = ratio;
    const node = nodeRef.current;
    if (!node) return undefined;
    const scope = createWidgetScope(node);
    const animation = tweenRing(node, circumference, ratio, { scope });
    return () => {
      animation?.revert?.();
      scope?.revert?.();
    };
  }, [circumference, ratio]);

  return (
    <circle
      ref={nodeRef}
      className="widget-ring__value"
      cx={size / 2}
      cy={size / 2}
      r={(size - stroke) / 2}
      fill="none"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeDasharray={circumference}
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
    />
  );
}
