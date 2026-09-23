import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Three.js Atmospheric & Floating New Romantics Letter Canvas
 *
 * Implements:
 * - Bespoke Three.js WebGL scene with undulating atmospheric mesh and floating reading motes.
 * - Floating New Romantics 3D letterforms (A to Z with randomized cap sizes and literary words).
 * - Interactive mouse physics: repulsion, 3D aerodynamic curl/tilt, and luminous awakening glow.
 * - Smooth spring restitution returning letters to organic floating orbits.
 * - Dynamic theme color interpolation across paper, dusk, kyoto, monocodex, and remix.
 * - Multi-layered power & accessibility safeguards (paused in background, IntersectionObserver, prefers-reduced-motion).
 */

const THEME_PALETTES = {
  paper: {
    bg: new THREE.Color("#fbf9f4"),
    warm: new THREE.Color("#f4ede0"),
    cool: new THREE.Color("#ebf0f7"),
    highlight: new THREE.Color("#fffaf0"),
    motes: new THREE.Color("#b89972"),
    moteOpacity: 0.24,
    letterInk: new THREE.Color("#523f30"),
    letterGlow: new THREE.Color("#9e6b28"),
    letterBaseOpacity: 0.25,
  },
  dusk: {
    bg: new THREE.Color("#090b10"),
    warm: new THREE.Color("#221810"),
    cool: new THREE.Color("#0e131d"),
    highlight: new THREE.Color("#362518"),
    motes: new THREE.Color("#f59e0b"),
    moteOpacity: 0.32,
    letterInk: new THREE.Color("#e2a03f"),
    letterGlow: new THREE.Color("#fef08a"),
    letterBaseOpacity: 0.32,
  },
  kyoto: {
    bg: new THREE.Color("#0c100e"),
    warm: new THREE.Color("#19241b"),
    cool: new THREE.Color("#101614"),
    highlight: new THREE.Color("#253629"),
    motes: new THREE.Color("#84a98c"),
    moteOpacity: 0.28,
    letterInk: new THREE.Color("#6c8c72"),
    letterGlow: new THREE.Color("#a7d7b0"),
    letterBaseOpacity: 0.28,
  },
  monocodex: {
    bg: new THREE.Color("#090b0d"),
    warm: new THREE.Color("#0f1d17"),
    cool: new THREE.Color("#0c1210"),
    highlight: new THREE.Color("#162c21"),
    motes: new THREE.Color("#34d399"),
    moteOpacity: 0.26,
    letterInk: new THREE.Color("#2bb882"),
    letterGlow: new THREE.Color("#6ee7b7"),
    letterBaseOpacity: 0.26,
  },
  remix: {
    bg: new THREE.Color("#100c0a"),
    warm: new THREE.Color("#291514"),
    cool: new THREE.Color("#18110f"),
    highlight: new THREE.Color("#3a1d1a"),
    motes: new THREE.Color("#d97706"),
    moteOpacity: 0.3,
    letterInk: new THREE.Color("#c4644a"),
    letterGlow: new THREE.Color("#fca5a5"),
    letterBaseOpacity: 0.3,
  },
};

const MID_ALPHABETS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z"
];

const ALPHABET_A_TO_Z = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z"
];

const STARDUST_GLYPHS = [
  "a", "e", "f", "g", "h", "i", "j", "k",
  "l", "m", "o", "q", "r", "s", "x", "z"
];

function pickRandomAlphabets(count = 12) {
  const pool = [...ALPHABET_A_TO_Z];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function createMoteTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.55)");
  gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.12)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createGlyphTexture(char, fontSize, maxAnisotropy = 4, canvasSize = 512) {
  if (typeof document === "undefined") return null;
  const size = canvasSize;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Solid, crisp typography from New Romantics with classic serif fallbacks
  // Using 400 normal weight matching the true @font-face definition for vector-crisp glyphs
  ctx.font = `400 ${fontSize}px "New Romantics", "Cinzel Decorative", "Cormorant Garamond", "Playfair Display", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#ffffff";
  ctx.fillText(char, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return { texture, aspect: 1.0 };
}

export function AmbientDustCanvas({ active = true, particleCount = 36, theme = "paper" }) {
  const containerRef = useRef(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !active) return undefined;

    let isDisposed = false;
    let renderer = null;
    let animId = null;
    let resizeObserver = null;
    let intersectionObserver = null;
    const disposables = [];

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function initScene() {
      // Ensure New Romantics font is ready for canvas rendering
      if (typeof document !== "undefined" && document.fonts) {
        try {
          await Promise.all([
            document.fonts.load('400 48px "New Romantics"'),
            document.fonts.load('400 160px "New Romantics"'),
            document.fonts.load('400 360px "New Romantics"'),
            document.fonts.ready,
          ]);
        } catch {
          // Fallback font stack will take over safely
        }
      }

      if (isDisposed || !container) return;

      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }

      const isMobile = typeof window !== "undefined" && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, isMobile ? 1.5 : 2);
      renderer.setPixelRatio(dpr);

      const width = container.offsetWidth || window.innerWidth || 1200;
      const height = container.offsetHeight || window.innerHeight || 800;
      renderer.setSize(width, height);

      const canvasElement = renderer.domElement;
      canvasElement.style.position = "absolute";
      canvasElement.style.inset = "0";
      canvasElement.style.width = "100%";
      canvasElement.style.height = "100%";
      canvasElement.style.pointerEvents = "none";
      canvasElement.style.zIndex = "0";
      container.appendChild(canvasElement);

      const handleContextLost = (event) => {
        event.preventDefault();
        if (animId) cancelAnimationFrame(animId);
        animId = null;
      };

      const handleContextRestored = () => {
        if (!reducedMotion && !animId) {
          animId = requestAnimationFrame(animate);
        }
      };

      canvasElement.addEventListener("webglcontextlost", handleContextLost, false);
      canvasElement.addEventListener("webglcontextrestored", handleContextRestored, false);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0, 14);

      // Background atmospheric shader
      const planeGeo = new THREE.PlaneGeometry(36, 24, 24, 24);
      disposables.push(planeGeo);

      const initialPalette = THEME_PALETTES[themeRef.current] || THEME_PALETTES.paper;
      const currentPalette = {
        bg: initialPalette.bg.clone(),
        warm: initialPalette.warm.clone(),
        cool: initialPalette.cool.clone(),
        highlight: initialPalette.highlight.clone(),
        motes: initialPalette.motes.clone(),
        moteOpacity: initialPalette.moteOpacity,
        letterInk: initialPalette.letterInk.clone(),
        letterGlow: initialPalette.letterGlow.clone(),
        letterBaseOpacity: initialPalette.letterBaseOpacity,
      };

      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uColorBg: { value: currentPalette.bg },
          uColorWarm: { value: currentPalette.warm },
          uColorCool: { value: currentPalette.cool },
          uColorHighlight: { value: currentPalette.highlight },
        },
        vertexShader: `
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vUv = uv;
            vec3 pos = position;
            float wave = sin(pos.x * 0.28 + uTime * 0.22) * cos(pos.y * 0.28 + uTime * 0.18) * 0.26;
            pos.z += wave;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColorBg;
          uniform vec3 uColorWarm;
          uniform vec3 uColorCool;
          uniform vec3 uColorHighlight;
          uniform vec2 uMouse;
          uniform float uTime;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;
            vec2 light1 = vec2(0.24, 0.76) + vec2(sin(uTime * 0.14) * 0.08, cos(uTime * 0.18) * 0.06) + uMouse * 0.05;
            vec2 light2 = vec2(0.78, 0.32) + vec2(cos(uTime * 0.16) * 0.06, sin(uTime * 0.12) * 0.07) - uMouse * 0.04;
            
            float d1 = length(uv - light1);
            float d2 = length(uv - light2);
            
            float glow1 = smoothstep(0.92, 0.04, d1);
            float glow2 = smoothstep(0.86, 0.04, d2);
            
            vec3 col = uColorBg;
            col = mix(col, uColorWarm, glow1 * 0.32);
            col = mix(col, uColorCool, glow2 * 0.22);
            
            float mouseDist = length(uv - (uMouse * 0.5 + 0.5));
            float mouseGlow = smoothstep(0.55, 0.04, mouseDist);
            col = mix(col, uColorHighlight, mouseGlow * 0.14);
            
            gl_FragColor = vec4(col, 0.88);
          }
        `,
        transparent: true,
        depthWrite: false,
      });
      disposables.push(shaderMaterial);

      const atmosphereMesh = new THREE.Mesh(planeGeo, shaderMaterial);
      atmosphereMesh.position.set(0, 0, -3.8);
      scene.add(atmosphereMesh);

      // Ambient motes
      const moteTexture = createMoteTexture();
      if (moteTexture) disposables.push(moteTexture);

      const particlePositions = new Float32Array(particleCount * 3);
      const particleSpeeds = new Float32Array(particleCount * 2);
      const particlePhases = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        particlePositions[i * 3 + 0] = (Math.random() - 0.5) * 26;
        particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 18;
        particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 6;

        particleSpeeds[i * 2 + 0] = (Math.random() - 0.5) * 0.003;
        particleSpeeds[i * 2 + 1] = Math.random() * 0.004 + 0.002;
        particlePhases[i] = Math.random() * Math.PI * 2;
      }

      const particlesGeo = new THREE.BufferGeometry();
      particlesGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      disposables.push(particlesGeo);

      const particlesMat = new THREE.PointsMaterial({
        size: 0.42,
        map: moteTexture,
        transparent: true,
        opacity: currentPalette.moteOpacity,
        color: currentPalette.motes,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });
      disposables.push(particlesMat);

      const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
      scene.add(particlesMesh);

      // Floating New Romantics 3D Letters with Random Sizes
      const letterDataList = [];
      const maxAnisotropy = renderer ? Math.min(renderer.capabilities.getMaxAnisotropy(), 8) : 4;
      const letterPlaneGeo = new THREE.PlaneGeometry(1, 1);
      disposables.push(letterPlaneGeo);

      // 1. Midground Romantic Alphabets (Full 26 letters A to Z)
      MID_ALPHABETS.forEach((char, index) => {
        // Individualized organic size roll
        const sizeRoll = Math.random();
        let fontSize;
        let baseScale;

        if (sizeRoll < 0.28) {
          // Grand Romantic Initial
          fontSize = Math.floor(Math.random() * 30 + 265);
          baseScale = Math.random() * 0.22 + 0.86;
        } else if (sizeRoll < 0.76) {
          // Standard Display Alphabet
          fontSize = Math.floor(Math.random() * 25 + 195);
          baseScale = Math.random() * 0.16 + 0.60;
        } else {
          // Subtle Whispering Alphabet
          fontSize = Math.floor(Math.random() * 20 + 135);
          baseScale = Math.random() * 0.10 + 0.40;
        }

        const glyph = createGlyphTexture(char, fontSize, maxAnisotropy);
        if (!glyph) return;
        disposables.push(glyph.texture);

        const mat = new THREE.MeshBasicMaterial({
          map: glyph.texture,
          transparent: true,
          opacity: currentPalette.letterBaseOpacity,
          color: currentPalette.letterInk,
          depthWrite: false,
          blending: THREE.NormalBlending,
        });
        disposables.push(mat);

        const mesh = new THREE.Mesh(letterPlaneGeo, mat);

        // Distribute harmoniously across 3 depth tiers
        const ringTier = index % 3;
        const tierIndex = Math.floor(index / 3);
        const baseAngle = (tierIndex / 9) * Math.PI * 2;
        const angle = baseAngle + (Math.random() - 0.5) * 0.45;
        let radiusX, radiusY, homeZ;

        if (ringTier === 0) {
          radiusX = Math.random() * 3.4 + 3.2;
          radiusY = Math.random() * 2.6 + 1.8;
          homeZ = Math.random() * 1.8 - 0.6;
        } else if (ringTier === 1) {
          radiusX = Math.random() * 4.2 + 5.5;
          radiusY = Math.random() * 3.0 + 2.8;
          homeZ = Math.random() * 2.2 - 1.4;
        } else {
          radiusX = Math.random() * 4.6 + 7.8;
          radiusY = Math.random() * 3.2 + 3.6;
          homeZ = Math.random() * 2.4 - 2.0;
        }

        const homeX = Math.cos(angle) * radiusX;
        const homeY = Math.sin(angle) * radiusY;

        const baseRotZ = (Math.random() - 0.5) * 0.32;
        const baseRotX = (Math.random() - 0.5) * 0.22;
        const baseRotY = (Math.random() - 0.5) * 0.22;

        const maxDim = Math.max(baseScale * glyph.aspect, baseScale);
        const boundingRadius = maxDim * 0.85 + 0.6;

        mesh.position.set(homeX, homeY, homeZ);
        mesh.rotation.set(baseRotX, baseRotY, baseRotZ);
        mesh.scale.set(baseScale * glyph.aspect, baseScale, 1);
        scene.add(mesh);

        letterDataList.push({
          mesh,
          char,
          tier: "mid",
          homeX,
          homeY,
          homeZ,
          currX: homeX,
          currY: homeY,
          vx: 0,
          vy: 0,
          baseScale,
          scaleMod: 1.0,
          targetScaleMod: 1.0,
          aspect: glyph.aspect,
          boundingRadius,
          isPaused: false,
          baseRotX,
          baseRotY,
          baseRotZ,
          targetTiltX: 0,
          targetTiltY: 0,
          targetTiltZ: 0,
          targetZOffset: 0,
          baseOpacityFactor: 1.0,
          targetOpacity: currentPalette.letterBaseOpacity,
          breathSpeed: Math.random() * 0.5 + 0.5,
          breathPhase: Math.random() * Math.PI * 2,
          floatSpeed: Math.random() * 0.35 + 0.25,
          floatPhase: Math.random() * Math.PI * 2,
          floatAmpX: Math.random() * 0.25 + 0.1,
          floatAmpY: Math.random() * 0.3 + 0.15,
          floatAmpRot: Math.random() * 0.06 + 0.03,
          isHovered: false,
          hoverIntensity: 0,
          resonanceGlow: 0,
        });
      });

      // 2. Monumental Big Letter Alphabets in Deep Floating Background (12 sample letters)
      const bigLetters = pickRandomAlphabets(12);
      bigLetters.forEach((char, index) => {
        const baseScale = Math.random() * 0.80 + 1.55;
        const fontSize = Math.floor(Math.random() * 40 + 340);

        const glyph = createGlyphTexture(char, fontSize, maxAnisotropy);
        if (!glyph) return;
        disposables.push(glyph.texture);

        const bigMat = new THREE.MeshBasicMaterial({
          map: glyph.texture,
          transparent: true,
          opacity: currentPalette.letterBaseOpacity * 0.45,
          color: currentPalette.letterInk,
          depthWrite: false,
          blending: THREE.NormalBlending,
        });
        disposables.push(bigMat);

        const mesh = new THREE.Mesh(letterPlaneGeo, bigMat);

        const angle = (index / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const radiusX = Math.random() * 5.5 + 6.0;
        const radiusY = Math.random() * 3.8 + 3.0;
        const homeZ = -(Math.random() * 1.8 + 2.0); // Deep background: -2.0 to -3.8

        const homeX = Math.cos(angle) * radiusX;
        const homeY = Math.sin(angle) * radiusY;

        const baseRotZ = (Math.random() - 0.5) * 0.28;
        const baseRotX = (Math.random() - 0.5) * 0.16;
        const baseRotY = (Math.random() - 0.5) * 0.16;

        const maxDim = Math.max(baseScale * glyph.aspect, baseScale);
        const boundingRadius = maxDim * 0.85 + 0.8;

        mesh.position.set(homeX, homeY, homeZ);
        mesh.rotation.set(baseRotX, baseRotY, baseRotZ);
        mesh.scale.set(baseScale * glyph.aspect, baseScale, 1);
        scene.add(mesh);

        letterDataList.push({
          mesh,
          char,
          tier: "big",
          homeX,
          homeY,
          homeZ,
          currX: homeX,
          currY: homeY,
          vx: 0,
          vy: 0,
          baseScale,
          scaleMod: 1.0,
          targetScaleMod: 1.0,
          aspect: glyph.aspect,
          boundingRadius,
          isPaused: false,
          baseRotX,
          baseRotY,
          baseRotZ,
          targetTiltX: 0,
          targetTiltY: 0,
          targetTiltZ: 0,
          targetZOffset: 0,
          baseOpacityFactor: 0.45,
          targetOpacity: currentPalette.letterBaseOpacity * 0.45,
          breathSpeed: Math.random() * 0.3 + 0.3,
          breathPhase: Math.random() * Math.PI * 2,
          floatSpeed: Math.random() * 0.14 + 0.10,
          floatPhase: Math.random() * Math.PI * 2,
          floatAmpX: Math.random() * 0.35 + 0.15,
          floatAmpY: Math.random() * 0.40 + 0.20,
          floatAmpRot: Math.random() * 0.04 + 0.02,
          isHovered: false,
          hoverIntensity: 0,
          resonanceGlow: 0,
        });
      });

      // 3. Delicate Foreground Stardust Glyphs (16 whispering flourish letters)
      STARDUST_GLYPHS.forEach((char, index) => {
        const baseScale = Math.random() * 0.14 + 0.26; // 0.26 - 0.40
        const fontSize = Math.floor(Math.random() * 25 + 120);

        const glyph = createGlyphTexture(char, fontSize, maxAnisotropy, 256);
        if (!glyph) return;
        disposables.push(glyph.texture);

        const stardustMat = new THREE.MeshBasicMaterial({
          map: glyph.texture,
          transparent: true,
          opacity: currentPalette.letterBaseOpacity * 0.75,
          color: currentPalette.letterInk,
          depthWrite: false,
          blending: THREE.NormalBlending,
        });
        disposables.push(stardustMat);

        const mesh = new THREE.Mesh(letterPlaneGeo, stardustMat);

        const angle = (index / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const radiusX = Math.random() * 4.0 + 3.8;
        const radiusY = Math.random() * 2.8 + 2.2;
        const homeZ = Math.random() * 1.6 - 0.2; // Foreground volume: -0.2 to +1.4

        const homeX = Math.cos(angle) * radiusX;
        const homeY = Math.sin(angle) * radiusY;

        const baseRotZ = (Math.random() - 0.5) * 0.36;
        const baseRotX = (Math.random() - 0.5) * 0.25;
        const baseRotY = (Math.random() - 0.5) * 0.25;

        const maxDim = Math.max(baseScale * glyph.aspect, baseScale);
        const boundingRadius = maxDim * 0.85 + 0.5;

        mesh.position.set(homeX, homeY, homeZ);
        mesh.rotation.set(baseRotX, baseRotY, baseRotZ);
        mesh.scale.set(baseScale * glyph.aspect, baseScale, 1);
        scene.add(mesh);

        letterDataList.push({
          mesh,
          char,
          tier: "stardust",
          homeX,
          homeY,
          homeZ,
          currX: homeX,
          currY: homeY,
          vx: 0,
          vy: 0,
          baseScale,
          scaleMod: 1.0,
          targetScaleMod: 1.0,
          aspect: glyph.aspect,
          boundingRadius,
          isPaused: false,
          baseRotX,
          baseRotY,
          baseRotZ,
          targetTiltX: 0,
          targetTiltY: 0,
          targetTiltZ: 0,
          targetZOffset: 0,
          baseOpacityFactor: 0.75,
          targetOpacity: currentPalette.letterBaseOpacity * 0.75,
          breathSpeed: Math.random() * 0.7 + 0.8,
          breathPhase: Math.random() * Math.PI * 2,
          floatSpeed: Math.random() * 0.25 + 0.35,
          floatPhase: Math.random() * Math.PI * 2,
          floatAmpX: Math.random() * 0.20 + 0.10,
          floatAmpY: Math.random() * 0.25 + 0.12,
          floatAmpRot: Math.random() * 0.08 + 0.04,
          isHovered: false,
          hoverIntensity: 0,
          resonanceGlow: 0,
        });
      });

      // Staggered materialize: each letter fades in turn after mount
      letterDataList.forEach((letter, letterIndex) => {
        letter.appearAt = 0.4 + letterIndex * 0.05;
        letter.mesh.material.opacity = 0;
      });

      // Mouse tracking & 3D raycasting
      const targetMouse = { x: 0, y: 0 };
      const currentMouse = { x: 0, y: 0 };
      const pointerNDC = new THREE.Vector2(0, 0);
      const raycaster = new THREE.Raycaster();
      const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const mouse3D = new THREE.Vector3(0, 0, 0);
      const prevMouse3D = new THREE.Vector3(0, 0, 0);
      const mouseVelocity = new THREE.Vector2(0, 0);

      // Camera frustum culling optimization structures
      const cameraFrustum = new THREE.Frustum();
      const projScreenMatrix = new THREE.Matrix4();
      const letterBoundingSphere = new THREE.Sphere();

      const handlePointerMove = (e) => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        targetMouse.x = (e.clientX / w - 0.5) * 2;
        targetMouse.y = -(e.clientY / h - 0.5) * 2;
        pointerNDC.x = targetMouse.x;
        pointerNDC.y = targetMouse.y;
      };

      const handlePointerDown = (e) => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        targetMouse.x = (e.clientX / w - 0.5) * 2;
        targetMouse.y = -(e.clientY / h - 0.5) * 2;
        pointerNDC.x = targetMouse.x;
        pointerNDC.y = targetMouse.y;
      };

      const handlePointerUp = (e) => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        targetMouse.x = (e.clientX / w - 0.5) * 2;
        targetMouse.y = -(e.clientY / h - 0.5) * 2;
        pointerNDC.x = targetMouse.x;
        pointerNDC.y = targetMouse.y;
      };

      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerdown", handlePointerDown, { passive: true });
      window.addEventListener("pointerup", handlePointerUp, { passive: true });

      // Resize handling
      const handleResize = () => {
        if (!container || !renderer) return;
        const nw = container.offsetWidth || window.innerWidth;
        const nh = container.offsetHeight || window.innerHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
      } else {
        window.addEventListener("resize", handleResize, { passive: true });
      }

      // Visibility & Lifecycle
      let isVisible = true;
      const timer = THREE.Timer ? new THREE.Timer() : null;
      if (timer) disposables.push(timer);

      const handleVisibilityChange = () => {
        if (document.hidden) {
          isVisible = false;
        } else {
          isVisible = true;
          if (timer) timer.reset();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      if (typeof IntersectionObserver !== "undefined") {
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            isVisible = entries[0]?.isIntersecting && !document.hidden;
          },
          { threshold: 0.05 }
        );
        intersectionObserver.observe(container);
      }

      // Animation Render Loop
      const animate = (timestamp) => {
        animId = requestAnimationFrame(animate);

        if (!isVisible || isDisposed) return;

        if (timer) {
          timer.update(timestamp);
        }
        const elapsedTime = timer ? timer.getElapsed() : (timestamp || performance.now()) * 0.001;

        // Mouse spring tracking
        currentMouse.x += (targetMouse.x - currentMouse.x) * 0.045;
        currentMouse.y += (targetMouse.y - currentMouse.y) * 0.045;

        // Camera parallax
        camera.position.x = currentMouse.x * 0.65;
        camera.position.y = currentMouse.y * 0.45;
        camera.lookAt(0, 0, 0);

        // Update frustum for camera viewport culling
        camera.updateMatrixWorld();
        projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        cameraFrustum.setFromProjectionMatrix(projScreenMatrix);

        // Project mouse to 3D world space at z = 0
        raycaster.setFromCamera(pointerNDC, camera);
        raycaster.ray.intersectPlane(planeZ, mouse3D);

        // Calculate smooth mouse movement velocity for fluid aerodynamic drag
        const rawVx = mouse3D.x - prevMouse3D.x;
        const rawVy = mouse3D.y - prevMouse3D.y;
        prevMouse3D.copy(mouse3D);

        mouseVelocity.x += (rawVx - mouseVelocity.x) * 0.14;
        mouseVelocity.y += (rawVy - mouseVelocity.y) * 0.14;
        const mouseSpeed = Math.hypot(mouseVelocity.x, mouseVelocity.y);

        // Update shader uniforms
        shaderMaterial.uniforms.uTime.value = reducedMotion ? 0 : elapsedTime;
        shaderMaterial.uniforms.uMouse.value.set(currentMouse.x, currentMouse.y);

        // Smooth theme palette interpolation (live ref: no scene rebuild on toggle)
        const targetPalette = THEME_PALETTES[themeRef.current] || THEME_PALETTES.paper;
        currentPalette.bg.lerp(targetPalette.bg, 0.06);
        currentPalette.warm.lerp(targetPalette.warm, 0.06);
        currentPalette.cool.lerp(targetPalette.cool, 0.06);
        currentPalette.highlight.lerp(targetPalette.highlight, 0.06);
        currentPalette.motes.lerp(targetPalette.motes, 0.06);
        currentPalette.moteOpacity += (targetPalette.moteOpacity - currentPalette.moteOpacity) * 0.06;
        currentPalette.letterInk.lerp(targetPalette.letterInk, 0.06);
        currentPalette.letterGlow.lerp(targetPalette.letterGlow, 0.06);
        currentPalette.letterBaseOpacity += (targetPalette.letterBaseOpacity - currentPalette.letterBaseOpacity) * 0.06;

        particlesMat.color.copy(currentPalette.motes);
        particlesMat.opacity = currentPalette.moteOpacity;

        // Animate floating reading motes with atmospheric cursor dispersion
        if (!reducedMotion) {
          const positions = particlesGeo.attributes.position.array;
          for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;
            particlePhases[i] += 0.02;

            positions[idx + 0] +=
              particleSpeeds[i * 2 + 0] + Math.sin(elapsedTime * 0.6 + particlePhases[i]) * 0.003;
            positions[idx + 1] += particleSpeeds[i * 2 + 1];

            // Atmospheric dispersion wave: golden dust motes gently part around moving cursor
            const pdx = positions[idx + 0] - mouse3D.x;
            const pdy = positions[idx + 1] - mouse3D.y;
            const pdist = Math.hypot(pdx, pdy);
            if (pdist < 2.5 && pdist > 0.001) {
              const pforce = (1 - pdist / 2.5) * 0.032;
              positions[idx + 0] += (pdx / pdist) * pforce;
              positions[idx + 1] += (pdy / pdist) * pforce;
            }

            if (positions[idx + 1] > 10) {
              positions[idx + 1] = -10;
              positions[idx + 0] = (Math.random() - 0.5) * 26;
            }
            if (positions[idx + 0] > 14) positions[idx + 0] = -14;
            if (positions[idx + 0] < -14) positions[idx + 0] = 14;
          }
          particlesGeo.attributes.position.needsUpdate = true;
        }

        // Animate Floating New Romantics 3D Constellation of Alphabets
        for (let i = 0; i < letterDataList.length; i++) {
          const letter = letterDataList[i];

          // Frustum culling check: pause letters outside the camera viewport
          letterBoundingSphere.center.set(letter.currX, letter.currY, letter.homeZ);
          letterBoundingSphere.radius = letter.boundingRadius;
          const isInFrustum = cameraFrustum.intersectsSphere(letterBoundingSphere);

          if (!isInFrustum) {
            if (letter.mesh.visible) {
              letter.mesh.visible = false;
            }
            letter.isPaused = true;
            continue;
          }

          // Unpause and restore visibility when entering the viewport
          if (letter.isPaused) {
            letter.isPaused = false;
            letter.mesh.visible = true;
          }

          if (!reducedMotion) {
            // Distance from cursor in 3D world space
            const dx = letter.currX - mouse3D.x;
            const dy = letter.currY - mouse3D.y;
            const dist = Math.hypot(dx, dy);

            // Refined, humanized interaction radius scaled gracefully with tier and cap size
            let interactRadius;
            if (letter.tier === "big") {
              interactRadius = 2.8 + letter.baseScale * 0.5;
            } else if (letter.tier === "stardust") {
              interactRadius = 1.6 + letter.baseScale * 0.9;
            } else {
              interactRadius = 2.0 + letter.baseScale * 0.8;
            }

            const baseFactor = letter.baseOpacityFactor || 1.0;
            const currentBase = currentPalette.letterBaseOpacity * baseFactor;

            if (dist < interactRadius && dist > 0.001) {
              // Hermite smoothstep falloff: strictly 0 at boundary, 1 at center
              const t = 1 - dist / interactRadius;
              const smooth = t * t * (3 - 2 * t);

              const nx = dx / dist;
              const ny = dy / dist;

              // 1. Soft radial repulsion
              const pushStrength = smooth * (letter.tier === "big" ? 0.045 : (letter.tier === "stardust" ? 0.085 : 0.072));
              letter.vx += nx * pushStrength;
              letter.vy += ny * pushStrength;

              // 2. Fluid slipstream / vortex wake from mouse movement
              if (mouseSpeed > 0.002) {
                const drag = Math.min(mouseSpeed, 0.35) * smooth * (letter.tier === "big" ? 0.09 : 0.14);
                letter.vx += (mouseVelocity.x * 0.65 - ny * 0.35) * drag;
                letter.vy += (mouseVelocity.y * 0.65 + nx * 0.35) * drag;
              }

              // 3. Tactile 3D card tilt & aerodynamic vortex curl
              const tiltStrength = letter.tier === "big" ? 0.20 : (letter.tier === "stardust" ? 0.38 : 0.35);
              letter.targetTiltX = (ny * tiltStrength + letter.vy * 0.4) * smooth;
              letter.targetTiltY = (-nx * tiltStrength - letter.vx * 0.4) * smooth;

              // Aerodynamic vortex swirl around cursor velocity
              const crossCurl = nx * mouseVelocity.y - ny * mouseVelocity.x;
              const torque = crossCurl * smooth * (letter.tier === "big" ? 0.08 : 0.22);
              letter.targetTiltZ = (nx - ny) * 0.18 * smooth + torque;

              // 4. Subtle forward lift in depth
              letter.targetZOffset = smooth * (letter.tier === "big" ? 0.45 : (letter.tier === "stardust" ? 0.70 : 0.62));

              // 5. Silky luminous awakening glow and soft scale lift
              const maxGlow = letter.tier === "big" ? 0.55 : (letter.tier === "stardust" ? 0.90 : 0.85);
              letter.targetOpacity = Math.min(
                maxGlow,
                currentBase + smooth * (letter.tier === "big" ? 0.28 : 0.45)
              );
              letter.targetScaleMod = 1.0 + smooth * (letter.tier === "big" ? 0.06 : (letter.tier === "stardust" ? 0.16 : 0.12));
              letter.isHovered = true;
              letter.hoverIntensity = smooth;
            } else {
              letter.targetTiltX = 0;
              letter.targetTiltY = 0;
              letter.targetTiltZ = 0;
              letter.targetZOffset = 0;
              letter.targetOpacity = currentBase;
              letter.targetScaleMod = 1.0;
              letter.isHovered = false;
              letter.hoverIntensity = 0;
            }

            // Smooth spring restitution towards home anchor
            const spring = letter.tier === "big" ? 0.016 : (letter.tier === "stardust" ? 0.026 : 0.022);
            letter.vx += (letter.homeX - letter.currX) * spring;
            letter.vy += (letter.homeY - letter.currY) * spring;

            // Natural viscous air drag
            letter.vx *= 0.90;
            letter.vy *= 0.90;

            letter.currX += letter.vx;
            letter.currY += letter.vy;

            // Gentle harmonic idle floating
            const idleTime = elapsedTime * letter.floatSpeed + letter.floatPhase;
            const idleBobX = Math.sin(idleTime * 0.7) * letter.floatAmpX;
            const idleBobY = Math.cos(idleTime * 0.9) * letter.floatAmpY;
            const idleBobRot = Math.sin(idleTime * 0.5) * letter.floatAmpRot;

            letter.mesh.position.x = letter.currX + idleBobX;
            letter.mesh.position.y = letter.currY + idleBobY;
            letter.mesh.position.z = letter.homeZ + letter.targetZOffset;

            // Smooth rotational interpolation
            letter.mesh.rotation.x = THREE.MathUtils.lerp(
              letter.mesh.rotation.x,
              letter.baseRotX + letter.targetTiltX,
              0.06
            );
            letter.mesh.rotation.y = THREE.MathUtils.lerp(
              letter.mesh.rotation.y,
              letter.baseRotY + letter.targetTiltY,
              0.06
            );
            letter.mesh.rotation.z = THREE.MathUtils.lerp(
              letter.mesh.rotation.z,
              letter.baseRotZ + letter.targetTiltZ + idleBobRot,
              0.06
            );

            // Interpolate scale mod with delicate starlight breathing
            const breath = Math.sin(elapsedTime * letter.breathSpeed + letter.breathPhase);
            const breathScale = 1.0 + breath * (letter.tier === "stardust" ? 0.03 : 0.015);

            letter.scaleMod = THREE.MathUtils.lerp(
              letter.scaleMod,
              letter.targetScaleMod * breathScale,
              0.08
            );
            const currentScale = letter.baseScale * letter.scaleMod;
            letter.mesh.scale.set(currentScale * letter.aspect, currentScale, 1);
          } else {
            // Still mode for prefers-reduced-motion
            letter.mesh.position.set(letter.homeX, letter.homeY, letter.homeZ);
            letter.targetOpacity = currentPalette.letterBaseOpacity * (letter.baseOpacityFactor || 1.0) * 0.8;
          }

          // Idle breathing shimmer
          const breathTwinkle = Math.sin(elapsedTime * letter.breathSpeed + letter.breathPhase);
          const breathOpacityMod = 1.0 + breathTwinkle * (letter.tier === "stardust" ? 0.12 : 0.05);
          const appearK = reducedMotion
            ? 1
            : Math.min(1, Math.max(0, (elapsedTime - (letter.appearAt ?? 0)) / 1.4));

          // Smooth opacity & interactive ink glow
          letter.mesh.material.opacity = THREE.MathUtils.lerp(
            letter.mesh.material.opacity,
            letter.targetOpacity * (reducedMotion ? 1.0 : breathOpacityMod) * appearK,
            0.07
          );

          // Smooth luminous golden ink blend when hovered
          const targetColor = letter.isHovered
            ? currentPalette.letterGlow
            : currentPalette.letterInk;
          letter.mesh.material.color.lerp(targetColor, 0.07);
        }

        renderer.render(scene, camera);
      };

      if (reducedMotion) {
        renderer.render(scene, camera);
      } else {
        animId = requestAnimationFrame(animate);
      }

      // Cleanup registration
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", handleResize);
        if (intersectionObserver) intersectionObserver.disconnect();
        canvasElement.removeEventListener("webglcontextlost", handleContextLost);
        canvasElement.removeEventListener("webglcontextrestored", handleContextRestored);
      };
    }

    let cleanupListeners = null;
    initScene().then((cleanup) => {
      cleanupListeners = cleanup;
    });

    return () => {
      isDisposed = true;
      if (animId) cancelAnimationFrame(animId);
      if (cleanupListeners) cleanupListeners();
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();

      disposables.forEach((item) => {
        if (item) {
           if (typeof item.dispose === "function") {
               item.dispose();
           } else if (item.texture && typeof item.texture.dispose === "function") {
               item.texture.dispose();
           }
        }
      });

      if (renderer) {
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [active, particleCount]);

  return (
    <div
      ref={containerRef}
      className="ambient-dust-canvas"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    />
  );
}


