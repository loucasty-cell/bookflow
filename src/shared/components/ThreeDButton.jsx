import React from "react";

/**
 * ThreeDButton: VisionOS & Apple-inspired 3D tactile button component.
 * Features physical Z-depth depression, specular rim lighting,
 * and hardware-accelerated 60/120fps spring response.
 */
export function ThreeDButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  type = "button",
  haptic = true,
  icon: Icon,
  ...props
}) {
  const handleClick = (e) => {
    if (disabled) return;
    if (haptic && typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch {
        // Safe fallback if vibration API is restricted
      }
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`btn-3d-tactile btn-3d-${variant} btn-3d-${size} ${className}`}
      {...props}
    >
      <span className="btn-3d-sheen" aria-hidden="true" />
      <span className="btn-3d-content">
        {Icon && <Icon className="btn-3d-icon" size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />}
        {children}
      </span>
      <span className="btn-3d-shadow" aria-hidden="true" />
    </button>
  );
}
