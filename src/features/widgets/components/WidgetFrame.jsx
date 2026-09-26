import React from "react";
import { WIDGET_RADIUS, widgetBox } from "../lib/tokens.js";
import "../lib/widgets.css";

export function WidgetFrame({
  size = "small",
  surface = "dark",
  gradient,
  accent,
  title,
  meta,
  value,
  caption,
  children,
  className = "",
  ...rest
}) {
  const box = widgetBox(size);
  const style = {
    "--widget-surface": gradient ?? undefined,
    "--widget-accent": accent ?? undefined,
  };

  return (
    <section
      className={`widget-frame ${className}`.trim()}
      data-size={size}
      data-surface={gradient ? "gradient" : surface}
      style={{ ...style, aspectRatio: `${box.width} / ${box.height}`, borderRadius: `${WIDGET_RADIUS}px` }}
      aria-label={title ?? undefined}
      {...rest}
    >
      <span className="widget-frame__sheen" aria-hidden="true" />
      <div className="widget-frame__body">
        {(title || meta) && (
          <header className="widget-frame__head">
            {title ? <h3 className="widget-frame__title">{title}</h3> : <span />}
            {meta ? <span className="widget-frame__meta">{meta}</span> : null}
          </header>
        )}
        {value ? <p className="widget-frame__value">{value}</p> : null}
        {children}
        {caption ? <p className="widget-frame__caption">{caption}</p> : null}
      </div>
    </section>
  );
}

export function WidgetRing({ ratio = 0, size = 52, stroke = 6, accent, label }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));

  return (
    <div className="widget-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <circle
          className="widget-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="widget-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={accent ?? "var(--widget-accent, #ffd422)"}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label ? <span className="widget-ring__label">{label}</span> : null}
    </div>
  );
}

export function WidgetMeter({ ratio = 0, accent }) {
  const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
  return (
    <div className="widget-meter">
      <div
        className="widget-meter__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped * 100)}
      >
        <span
          className="widget-meter__fill"
          style={{ width: `${clamped * 100}%`, background: accent ?? undefined }}
        />
      </div>
    </div>
  );
}
