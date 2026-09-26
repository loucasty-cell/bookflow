import React, { useEffect, useRef } from "react";

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = `
precision mediump float;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;

void main() {
  vec2 p = vUv - 0.5;
  float t = uTime * 0.18;

  float waveA = sin((p.x * 2.6 + t) * 3.14159) * 0.5 + 0.5;
  float waveB = cos((p.y * 2.2 - t * 0.8) * 3.14159) * 0.5 + 0.5;

  float d = distance(p, uPointer);
  float glow = smoothstep(0.55, 0.0, d);

  vec3 col = mix(uColorA, uColorB, waveA * 0.55 + waveB * 0.45);
  col += glow * 0.22;
  col += waveA * waveB * 0.06;

  float edge = smoothstep(0.78, 0.34, length(p));
  gl_FragColor = vec4(col, edge * 0.5);
}
`;

/**
 * A single shader plane behind the focus bar. Deliberately small: one plane,
 * one draw call, same disposal discipline as the landing dust canvas. Only
 * mounted while the bar is expanded, so the landing page never holds two WebGL
 * contexts at once.
 */
export function FocusBarBackdrop({ className = "" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      let THREE;
      try {
        THREE = await import("three");
      } catch {
        return;
      }
      if (disposed || !mount.isConnected) return;

      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }

      const isMobile = typeof window !== "undefined" && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1, false);
      renderer.domElement.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
      mount.appendChild(renderer.domElement);

      const disposables = [];
      const pointer = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      let frame = 0;
      let visible = true;
      let isContextLost = false;

      const onPointerMove = (event) => {
        const rect = mount.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 1.4;
        target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 1.4;
      };

      const handleContextLost = (event) => {
        event.preventDefault();
        isContextLost = true;
        cancelAnimationFrame(frame);
      };

      const handleContextRestored = () => {
        isContextLost = false;
        if (visible && !disposed) {
          resize();
          frame = requestAnimationFrame(render);
        }
      };

      renderer.domElement.addEventListener("webglcontextlost", handleContextLost, false);
      renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored, false);

      let lastW = 0;
      let lastH = 0;

      const resize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (!w || !h) return;
        if (w === lastW && h === lastH) return;
        lastW = w;
        lastH = h;
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
      };

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
      camera.position.z = 1;

      const geometry = new THREE.PlaneGeometry(1, 1);
      disposables.push(geometry);

      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uColorA: { value: new THREE.Color("#0f2a3d") },
          uColorB: { value: new THREE.Color("#123a4d") },
        },
      });
      disposables.push(material);

      scene.add(new THREE.Mesh(geometry, material));

      const render = (time) => {
        if (disposed || !visible || isContextLost) return;
        resize();
        pointer.x += (target.x - pointer.x) * 0.06;
        pointer.y += (target.y - pointer.y) * 0.06;
        material.uniforms.uPointer.value.set(pointer.x, pointer.y);
        material.uniforms.uTime.value = reduced ? 0 : time * 0.001;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };

      let observer = null;
      if (typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(
          (entries) => {
            const next = entries.some((entry) => entry.isIntersecting);
            if (next === visible) return;
            visible = next;
            cancelAnimationFrame(frame);
            if (visible) frame = requestAnimationFrame(render);
          },
          { threshold: 0.05 }
        );
        observer.observe(mount);
      }

      let resizeObserver = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
      }

      window.addEventListener("pointerdown", onPointerMove, { passive: true });
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerMove, { passive: true });
      window.addEventListener("resize", resize);
      resize();
      frame = requestAnimationFrame(render);

      cleanup = () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer?.disconnect();
        resizeObserver?.disconnect();
        window.removeEventListener("pointerdown", onPointerMove);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerMove);
        window.removeEventListener("resize", resize);
        renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
        for (const item of disposables) item.dispose?.();
        renderer.forceContextLoss?.();
        renderer.dispose?.();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    })().catch(() => {});

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div className={`focus-bar-backdrop${className ? ` ${className}` : ""}`} ref={mountRef} aria-hidden="true" />;
}
