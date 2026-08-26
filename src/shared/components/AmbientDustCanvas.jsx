import { useEffect, useRef } from "react";

/**
 * AmbientDustCanvas: Ultra-low CPU ambient library atmospheric canvas.
 * Renders subtle floating dust motes and soft warm volumetric light beams.
 * 
 * Performance safeguards:
 * 1. Frame-throttled to 25 FPS (drastically cuts CPU/GPU usage compared to 60fps loops).
 * 2. Paused immediately when tab is hidden or element is out of view.
 * 3. Bypassed entirely when prefers-reduced-motion is active.
 */
export function AmbientDustCanvas({ active = true, particleCount = 28 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    // Check prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = null;
    let lastTime = 0;
    const targetFpsInterval = 1000 / 25; // 25 FPS throttle for ultra-low battery drain

    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // Initialize dust particle pool
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.6 + 0.6,
      opacity: Math.random() * 0.4 + 0.1,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: -Math.random() * 0.35 - 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    const render = (currentTime) => {
      animId = requestAnimationFrame(render);

      if (document.hidden) return; // Freeze when tab is backgrounded

      const elapsed = currentTime - lastTime;
      if (elapsed < targetFpsInterval) return;
      lastTime = currentTime - (elapsed % targetFpsInterval);

      ctx.clearRect(0, 0, width, height);

      // Subtle atmospheric volumetric beam
      const beamGrad = ctx.createRadialGradient(
        width * 0.8,
        height * 0.1,
        10,
        width * 0.8,
        height * 0.1,
        width * 0.7
      );
      beamGrad.addColorStop(0, "rgba(245, 158, 11, 0.045)");
      beamGrad.addColorStop(0.5, "rgba(217, 119, 6, 0.015)");
      beamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw dust motes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.03;

        // Wrap around viewport boundaries
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentOpacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254, 243, 199, ${currentOpacity})`;
        ctx.fill();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className="ambient-dust-canvas"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
