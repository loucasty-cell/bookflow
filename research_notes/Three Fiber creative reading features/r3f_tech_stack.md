# React Three Fiber (R3F) Tech Stack and Ecosystem, evaluated for Bookflow (as of 2026-10-10)

Method note: package versions, publish dates, and peer ranges were pulled directly from the npm registry JSON (`https://registry.npmjs.org/<pkg>`) on 2026-10-10. Bundle sizes were **measured** by bundling minimal entry files with esbuild (`--bundle --minify --format=esm`, `NODE_ENV=production`, gzip -9) in a scratch directory; they are not bundlephobia figures. Rollup/Vite output will be close but not identical. The `r3f.docs.pmnd.rs` and `threejs.org` hosts did not resolve from this environment (DNS `ENOTFOUND`), so the docs were read from the pmndrs GitHub sources and the installed `three` package source instead.

Bookflow facts used below (read from the repo in this session):
- `package.json:28-29` pins `react`/`react-dom` `19.0.0`; `package.json:33` has `three` `^0.186.0`.
- The ambient layer is `src/shared/components/AmbientDustCanvas.jsx` (1107 lines). It uses raw `import * as THREE from "three"` (line 2) and `new THREE.WebGLRenderer` (line 221). It checks `prefers-reduced-motion` and a STATIC quality tier to pick a still frame (lines 194-199). It pauses on `visibilitychange` (line 740) and uses an IntersectionObserver (around line 861). It disposes the renderer and textures on unmount (lines 1069-1079).
- It is lazy-loaded with `React.lazy` from `src/features/landing/components/LandingPage.jsx:24-26`, so today it appears only on the landing page.

## 1. Current versions of R3F and pmndrs packages, and React 19 compatibility

### Takeaway
R3F 9.x is the stable, React-19-only line (latest 9.8.1, 2026-09-24), and it works with Bookflow's React 19.0.0. R3F v10 (WebGPU-first) is still alpha. Drei 10, postprocessing 3, and rapier 2 all target React 19 / R3F 9. `@react-three/a11y` and `@react-three/offscreen` have not been published since 2022-2023 and declare only R3F `>=8`, so treat them as unmaintained or unverified for R3F 9.

### Cited Findings
Version table, all from the npm registry on 2026-10-10:

| Package | Latest (dist-tag) | Published | Peer deps (latest) | Other tags |
|---|---|---|---|---|
| @react-three/fiber | 9.8.1 | 2026-09-24 | react/react-dom `>=19 <19.4`, three `>=0.156` | alpha 10.0.0-alpha.5 (2026-09-08), canary 10.0.0-canary |
| @react-three/drei | 10.7.9 | 2026-09-25 | react `^19`, three `>=0.159`, fiber `^9.0.0` | alpha 11.0.0-alpha.7 |
| @react-three/postprocessing | 3.2.0 | 2026-10-10 | react `^19.0.0`, fiber `>=9.7.0`, postprocessing `^6.36.0`, three `>=0.156` | — |
| postprocessing (vanilla) | 6.39.5 | 2026-09-09 | three `>=0.168.0 <0.187.0` | beta 7.0.0-beta.16, alpha 7.0.0-alpha.4 |
| @react-three/rapier | 2.2.0 | 2025-11-03 | react `^19`, fiber `^9.0.4`, three `>=0.159` | canary 2.0.0-canary.0 |
| @react-three/a11y | 3.0.0 | **2022-05-15** | react `>=18`, fiber `>=8`, three `>=0.133` | alpha 2.2.0-alpha.1 |
| @react-three/offscreen | 0.0.8 | **2023-05-11** | react `>=18`, fiber `>=8.0.0` | rc 1.0.0-rc.1 |
| @react-three/uikit | 1.0.76 | 2026-09-01 | fiber `>=8`, react `>=18` | — |
| @react-three/test-renderer | 9.1.1 | 2026-07-31 | — | — |
| leva | 0.10.1 | 2025-10-31 | — | — |
| r3f-perf | 7.2.3 | 2024-11-08 | — | — |
| maath | 0.10.8 | 2024-07-07 | — | — |
| three | 0.186.1 | 2026-09-24 | — | — |
| react (for reference) | 19.3.0 | 2026-09-09 | — | — |

Source for every row: the npm registry, for example [registry.npmjs.org/@react-three/fiber](https://registry.npmjs.org/@react-three/fiber).

- R3F 9.0.0 was published 2025-02-19 and 10.0.0-alpha.1 on 2026-01-17 — [npm registry](https://registry.npmjs.org/@react-three/fiber)
- 10.0.0-alpha.5 has peer deps `react >=19.0 <19.3` and `three >=0.185.0`, and exports `.`, `./legacy`, and `./webgpu` — [npm registry](https://registry.npmjs.org/@react-three/fiber/10.0.0-alpha.5)
- R3F v9.5.0 added React 19.2 support, including `<Activity>`. "The reconciler is bundled, so R3F works with React 19.0 through 19.2" — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- R3F v9.8.0 (22 Sep) added React 19.3.0 compatibility, noting that "not all new React APIs are fully supported". It configures roots synchronously and gates them on async renderers such as `WebGPURenderer`, and it fixes Strict Mode Canvas issues — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- R3F v9.8.1 (24 Sep) fixes `<Activity>` wrapping a Canvas across React DOM boundaries. It also disposes renderers that R3F created when the root unmounts, and preserves visibility across Activity/Suspense hiding — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- R3F v9.7.0 (31 Jul) hardened the reconciler: event priorities now match react-dom, and reconciler microtasks are supported. v9.6.0 (13 Apr) made ShaderMaterial uniforms stable references, which enables pierce props like `uniforms-uColor-value` — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- Verified in the installed package: `@react-three/fiber@9.8.1` ships its own `react-reconciler` directory and declares `"sideEffects": false` (local `node_modules/@react-three/fiber/package.json`, measured in scratch install).
- Community skill pages say R3F v10 and Drei v11 are both in alpha for WebGPU support, and that alpha APIs differ from upstream docs — [skills.sh r3f-v10-webgpu-hooks](https://www.skills.sh/prag-matt-ic/threenix-plugin/r3f-v10-webgpu-hooks) (third-party, lower authority)

### Inferences
- Bookflow's React 19.0.0 falls inside R3F 9.8.1's peer range (`>=19 <19.4`). Adopting R3F would not force a React upgrade. Upgrading React to 19.3 is also covered by 9.8.x.
- R3F pins an upper bound on React minors because it bundles the reconciler. Each React minor bump may need a matching R3F release before peer installs are clean. This is a recurring maintenance coupling that raw three.js does not have.
- The `@react-three/postprocessing` 3.2.0 → `postprocessing` 6.39.5 chain caps three at `<0.187.0`. Bookflow's `^0.186.0` fits today, but a three r187 bump could be blocked until postprocessing updates.
- `@react-three/a11y`'s last publish was 2022-05, and it declares only R3F `>=8` / React `>=18`. Peer ranges would technically allow React 19, but I found no evidence it was tested with R3F 9's bundled reconciler. Treat it as **unverified** for R3F 9.

### Gaps
- No official pmndrs statement was found on a v10 stable date. The docs host `r3f.docs.pmnd.rs` was unreachable (DNS failure), so v10 migration docs were not read.
- `@react-three/rapier` has had no stable release since 2025-11-03. Its compatibility with three 0.186 was not tested.
- `@react-three/uikit` peers allow fiber `>=8`; its runtime behavior with v9.8 was not verified.

## 2. WebGPU in Three.js (WebGPURenderer, TSL) and in R3F; browser support

### Takeaway
Three.js ships `three/webgpu` (WebGPURenderer plus node materials) and `three/tsl`. WebGPURenderer falls back to a WebGL 2 backend automatically. WebGPU is now on by default in Chrome/Edge desktop and Android (with GPU caveats), Safari 26 on macOS/iOS/iPadOS, and Firefox on Windows and macOS. Firefox Linux and Android still lack it in stable releases. R3F 9 can host a WebGPURenderer through an async `gl` factory. First-class WebGPU/TSL hooks exist only in the R3F v10 alpha.

### Cited Findings
- Verified in installed `three@0.186` source: "If not, `WebGPURenderer` falls backs to a WebGL 2 backend"; `forceWebGL=false` option "uses a WebGL 2 backend no matter if WebGPU is supported" — `node_modules/three/src/renderers/webgpu/WebGPURenderer.js:24,41` (local); build files present: `three.core.js`, `three.module.js`, `three.webgpu.js`, `three.webgpu.nodes.js`, `three.tsl.js` (`node_modules/three/build/`, local).
- three r186 (24 Sep 2026) changes:
  - WebGPURenderer gained `compileComputeAsync()`, a `DirectRenderPipeline`, and material blend color/alpha.
  - TSL gained `updateBefore`/`updateAfter` for compute.
  - `Renderer.dispose()` became async.
  - `Source` was renamed to `TextureSource`.
  - Top-level side effects were removed "for better tree-shaking".
  - Source: [three.js releases](https://github.com/mrdoob/three.js/releases)
- three r185 (01 Jul 2026): WebGPURenderer gained WebXR, render to texture arrays, and surfaced WGSL diagnostics. r184 (16 Apr 2026): non-blocking `compileAsync()`, a NodeMaterial compatibility layer in WebGLRenderer, and a reported 3.0x TSL compilation speedup. r183 (20 Feb 2026) deprecated `Clock` — [three.js releases](https://github.com/mrdoob/three.js/releases)
- Browser status from the gpuweb Implementation Status wiki, last edited 2026-10-02 — [gpuweb wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status):
  - Chrome desktop (Mac, Windows x86/x64, ChromeOS): shipped in 113.
  - Chrome Android 12+ on ARM, Qualcomm, and Intel GPUs: shipped in 121. Imagination GPUs on Android 16+: Chrome 139. Samsung Xclipse and other GPUs: still pending.
  - Chrome Linux: Intel Gen12+ in 144; NVIDIA on Wayland in 147; other configurations behind a flag. Windows ARM64: behind a flag.
  - Firefox: Windows in 141; macOS 26+ in 145; all macOS versions in 147. Linux is Nightly-only (expected in 2026). Android is behind a flag.
  - Safari: on by default from version 26 on macOS Tahoe, iOS, iPadOS, and visionOS.
- web.dev's "WebGPU is now supported in major browsers" post (Nov 2025) confirms Safari 26 and Firefox 141 (Windows) / 145 (macOS ARM) — [web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- R3F 9 Canvas docs on WebGPU: import `WebGPURenderer` from `three/webgpu`, create it inside an async `gl` factory, `await renderer.init()`, then call `extend(THREE)` with `ThreeToJSXElements` typings so node materials work in JSX. R3F awaits a promise returned from `gl` — [R3F canvas.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/API/canvas.mdx)
- R3F v10 alpha:
  - alpha.1 (17 Jan 2026) supports both WebGL and WebGPU renderers, renames `state.gl` to `state.renderer` (breaking), and adds the TSL hooks `useUniforms`, `useNodes`, `useLocalNodes`, and `usePostProcessing`.
  - alpha.4 (28 Aug 2026) adds `useBuffers`/`useGPUStorage`/`useTextures` and replaces `usePostProcessing` with `useRenderPipeline`. It moves the scheduler to `pmndrs/scheduler` (useFrame can run outside Canvas, with phases and FPS limits) and lets WebGPU canvases share one renderer and GPU context. It requires three ≥0.185.
  - Source: [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- A 2026 third-party guide says most engines still treat WebGPU as opt-in and recommends WebGL2 as the baseline — [cinevva guide](https://app.cinevva.com/guides/webgpu-vs-webgl-games) (secondary, lower authority)

### Inferences
- For a calm ambient particle layer, WebGPU brings little benefit and adds weight. The measured `three/webgpu` + TSL minimal bundle is ~245 KB gzip vs ~132 KB for a tree-shaken WebGLRenderer points scene (see section 3). WebGL2 remains the right baseline for Bookflow, especially since Firefox Linux/Android and some Android GPUs still lack WebGPU.
- If Bookflow wants WebGPU later, the stable route is raw `three/webgpu` (auto-falls back to WebGL2) or R3F 9 with an async `gl` factory. R3F v10's TSL hooks are alpha with breaking renames still landing, so they are not ready for production.

### Gaps
- Real-world WebGPU vs WebGL performance numbers for small particle effects on mobile were not found.
- The gpuweb wiki does not clearly split Intel vs Apple Silicon Macs for Firefox 145/147.

## 3. Bundle size and performance techniques

### Takeaway
R3F's `<Canvas>` calls `extend(THREE)` on the entire three namespace, which defeats three.js tree-shaking. A minimal R3F scene measured **~308 KB gzip** (incl. React DOM) versus **~193 KB gzip** for React DOM + a tree-shaken raw three points scene. The R3F tax is roughly 115 KB gzip in the worst case, or about 59 KB if three is already fully bundled. Runtime cost is controlled with `frameloop="demand"`, `dpr` clamping, `PerformanceMonitor`/`performance.regress` + `AdaptiveDpr`, instancing, and lazy-loading the Canvas.

### Cited Findings
Measured sizes (esbuild minify + gzip -9; scratch install; 2026-10-10):

| Entry | Contents | min | gzip |
|---|---|---|---|
| react | `react-dom/client` render `<div/>` (React 19.2.x) | 194 KB | 60.2 KB |
| three_points | raw three named imports: WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, Points, ShaderMaterial | 531 KB | 132.4 KB |
| three_star | `import * as THREE` fully retained | 743 KB | 188.9 KB |
| three_react | react-dom + three_points | 726 KB | 192.9 KB |
| r3f | react-dom + `@react-three/fiber` 9.8.1 `<Canvas frameloop="demand">` with points | 1,123 KB | 308.3 KB |
| r3f_drei | r3f + drei `PerformanceMonitor`, `AdaptiveDpr`, `Sparkles` | 1,130 KB | 310.7 KB |
| r3f_pp | r3f + `@react-three/postprocessing` `EffectComposer`, `Bloom`, `Vignette` | 1,222 KB | 334.5 KB |
| three_webgpu | `three/webgpu` WebGPURenderer + MeshBasicNodeMaterial + `three/tsl` `color` | 896 KB | 245.1 KB |
| ogl | OGL Renderer/Mesh/Program points | 47 KB | 13.4 KB |
| regl | regl point draw | 123 KB | 41.2 KB |
| pixi | pixi.js 8.22.0 Application + Graphics | 528 KB | 152.6 KB |

- R3F bundle composition (esbuild metafile, minified bytes): three 744 KB, react-dom 181 KB, @react-three/fiber 169 KB (includes bundled reconciler), scheduler 7 KB, react-use-measure 3 KB, its-fine 3 KB, zustand 0.6 KB. Source: local measurement.
- Verified in the installed R3F 9.8.1 dist: `import * as THREE from 'three'` and `React.useMemo(() => extend(THREE), [])` appear in `react-three-fiber.esm.js:40`. Every three export is therefore registered into the JSX catalogue and retained. Source: local file.
- three r186 removed top-level side effects for better tree-shaking — [three.js releases](https://github.com/mrdoob/three.js/releases)
- `frameloop="demand"` renders only when props change, whereas the default loop runs 60 times a second. `invalidate()` from `useThree` schedules a single frame, and repeated calls coalesce. Drei controls call it automatically — [R3F scaling-performance.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)
- Canvas defaults: `dpr` `[1, 2]`, `frameloop` `always`, `resize` `{ scroll: true, debounce: { scroll: 50, resize: 0 } }`. The default renderer is a `WebGLRenderer` with `antialias`, `alpha`, and `powerPreference="high-performance"`. `frameloop` also accepts `never`. A `fallback` prop provides DOM content if GL is unsupported — [R3F canvas.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/API/canvas.mdx)
- The `performance` prop takes `{ current: 1, min: 0.1, max: 1, debounce: 200 }`. `regress()` alone changes nothing; the app must read `performance.current`. Adaptive DPR is done via `setDpr(window.devicePixelRatio * current)` — [scaling-performance.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)
- Drei `PerformanceMonitor` props: `onIncline`, `onDecline`, `onChange` (with a `factor` from 0 to 1, starting at 0.5), `flipflops`, `onFallback`. The documented example maps the factor to DPR via `round(0.5 + 1.5 * factor, 1)`. After the flip-flop limit is reached, `onFallback` fires and the monitor shuts down — [scaling-performance.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)
- Drei `<AdaptiveDpr pixelated />` "cut[s] the pixel-ratio on regress according to the canvas's performance min/max settings" — [drei adaptive-dpr.mdx](https://raw.githubusercontent.com/pmndrs/drei/master/docs/performances/adaptive-dpr.mdx)
- Instancing: `<instancedMesh args={[null, null, count]}>` draws many objects in one call. The guidance is "no more than 1000 [draw calls] as the very maximum", ideally a few hundred. Geometries and materials should be reused; `useLoader` caches by URL — [scaling-performance.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)
- Concurrency: creating 510 `TextGeometry` instances at once caused about 1.5 s of jank on an M1. With `startTransition`, React stayed near 60 fps while plain three.js ran at 5-20 fps — [scaling-performance.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)
- `@react-three/offscreen` runs an R3F scene in a Web Worker on an OffscreenCanvas, with a `worker` prop and a main-thread `fallback`. The README calls it "experimental", says it is "mostly useful for self-contained webgl apps", and notes that Safari lacks WebGL OffscreenCanvas. Its Vite guidance pins `@vitejs/plugin-react` 3.1.0 with fast refresh disabled — [react-three-offscreen](https://github.com/pmndrs/react-three-offscreen). The last npm publish was 2023-05-11 — [npm](https://registry.npmjs.org/@react-three/offscreen)

### Inferences
- Bookflow's `AmbientDustCanvas` already uses static `THREE.X` member access on a namespace import. Rollup (Vite) can usually tree-shake static namespace member access, so today's chunk is likely nearer the tree-shaken figure than the full-namespace figure. This is **inferred**: confirm by inspecting the current Vite build's Three.js chunk size with `npm run build`. Moving to R3F would push the three portion to the full ~189 KB gzip and add ~59 KB gzip of fiber/reconciler. That worsens the existing large-chunk build warning.
- The R3F chunk can still be kept off the reader's critical path, as the existing pattern does: `React.lazy` + Suspense, a still-image fallback, and mounting only when the ambient layer is enabled.
- The offscreen worker path is poorly suited: the package is stale, its Vite instructions are dated, and the Safari limitation is noted in a README that may be outdated. That Safari claim is **unverified for 2026**.
- For a decorative layer, `frameloop="demand"` (or `"never"` plus a manual `invalidate()` for a still frame) together with `dpr={[1, 1.5]}` is the main power lever. Bookflow already does the raw-three equivalent (quality tiers, `setPixelRatio(quality.dpr)`, visibility and IntersectionObserver pauses).

### Gaps
- Bundlephobia/pkg-size figures were not consulted, because the measured esbuild numbers were used instead. Vite/Rollup output for the same entries was not measured.
- Bookflow's current production Three.js chunk size was not measured in this session (`npm run build` not run).

## 4. Should Bookflow migrate its raw Three.js ambient layer to R3F?

### Takeaway
Probably not for the ambient layer alone. It already handles reduced motion, quality tiers, visibility pausing, and disposal in ~1,100 lines of imperative code. R3F would add measurable bundle weight and a React-minor coupling. R3F earns its cost only if Bookflow plans several declarative, interactive 3D surfaces (e.g., a 3D bookshelf or page-turn scene). Even then, adoption should be incremental: a new lazy island with the existing component left in place.

### Cited Findings
- R3F's Canvas `gl` prop accepts renderer props, an existing renderer instance, or a sync/async factory. With an instance, "You, by calling `dispose()`" own its disposal. This allows reuse of an existing imperative renderer — [R3F canvas.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/API/canvas.mdx)
- R3F lets you pass your own `THREE.Scene` and `THREE.Camera` via the `scene` and `camera` props, which enables incremental wrapping of existing objects (e.g., `<primitive object={...}>`) — [R3F canvas.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/API/canvas.mdx)
- The `eventSource` prop lets the Canvas subscribe to events on another DOM element, which helps for a background layer sitting under DOM content — [R3F canvas.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/API/canvas.mdx)
- R3F v10 alpha.4 lets `useFrame` run outside the Canvas through a standalone scheduler (`pmndrs/scheduler`) with phases and FPS limits — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- Measured bundle delta: about +115 KB gzip versus tree-shaken raw three, or +59 KB gzip versus full-namespace three (section 3 table; local measurement).
- R3F peer range caps React minors (`>=19 <19.4` on 9.8.1) — [npm registry](https://registry.npmjs.org/@react-three/fiber)

### Inferences
- Benefits for Bookflow:
  - Declarative scene composition tied to Zustand state, such as theme changes driving uniforms through pierce props (v9.6.0).
  - Automatic disposal of R3F-created objects.
  - The drei helper ecosystem.
  - Easier testing with `@react-three/test-renderer` 9.1.1.
- Costs:
  - Bundle weight on an already-flagged chunk.
  - A second abstraction over three.
  - Upgrade coupling to React minors and to the postprocessing/three cap.
  - v10 will bring breaking renames (`state.gl` to `state.renderer`).
- Incremental path, if adopted:
  1. Leave `AmbientDustCanvas.jsx` unchanged.
  2. Build any new 3D feature as a separate `React.lazy` R3F island inside its own feature folder, respecting the AGENTS.md feature-boundary rules.
  3. Share three via Vite chunking so only one copy loads.
  4. Optionally port the dust layer later by wrapping its existing `Points`/`ShaderMaterial` in `<primitive>` and moving its RAF loop into `useFrame`, with `frameloop="demand"` for static tiers.
- Adding `@react-three/fiber` is a new dependency, so AGENTS.md requires explicit user approval.

### Gaps
- No published case study of migrating a background-only three layer to R3F, with before/after metrics, was found.

## 5. Alternatives for lightweight effects

### Takeaway
For a calm, small decorative effect, OGL (~13 KB gzip measured) or regl (~41 KB) are an order of magnitude lighter than three-based stacks. PixiJS v8 suits 2D sprite/particle effects with WebGPU/WebGL. Babylon and Spline are heavyweight. Threlte (Svelte) and TresJS (Vue) are the R3F equivalents for other frameworks and are irrelevant to a React app.

### Cited Findings
- Versions from npm registry, 2026-10-10:
  - `ogl` 1.0.11 (2025-01-27)
  - `regl` 2.1.1 (2024-11-12)
  - `pixi.js` 8.22.0 (2026-10-01)
  - `@babylonjs/core` 9.30.0 (2026-10-08)
  - `@splinetool/runtime` 2.0.75 (2026-10-07)
  - `@splinetool/react-spline` 4.1.0 (2025-07-15; peers include `next >=14.2.0`)
  - `@threlte/core` 8.6.1 (2026-09-24; peers svelte `>=5`, three `>=0.172`)
  - `@tresjs/core` 5.9.3 (2026-10-06; peers vue `>=3.4`, three `>=0.133`)
  - Source: [npm registry](https://registry.npmjs.org/)
- Measured gzip sizes (local esbuild):
  - OGL minimal points: 13.4 KB.
  - regl: 41.2 KB.
  - PixiJS 8 Application + Graphics: 152.6 KB.
  - Babylon `@babylonjs/core` deep imports (Engine, Scene, FreeCamera, ParticleSystem): 67.1 KB entry, 235.5 KB including its 54 code-split chunks.
  - Spline runtime: 38.1 KB entry, but 1,089 KB gzip across 109 lazily split chunks.
- PixiJS v8 claims to be faster than v7 on both renderers. In its 100k-sprite bunny test, CPU frame time fell from about 50 ms to 15 ms and GPU time from about 9 ms to 2 ms. These are vendor figures, and the table was garbled in the search snippet, so verify them on the original page — [PixiJS v8 launch](https://pixijs.com/blog/pixi-v8-launches)
- The PixiJS v8 beta supports WebGPU and "gracefully falls back to the WebGL renderer" — [PixiJS v8 beta](https://pixijs.com/blog/pixi-v8-beta)
- Threlte 8 fully supports Svelte 5, according to a 2025-01-25 Svelte Society episode — [Svelte Society](https://sveltesociety.dev/video/this-week-in-svelte-ep-91-changelog-threlte-8-d15bc0ef3f9a7d47)

### Inferences
When to choose each:
- **OGL**: a tiny WebGL abstraction with a three-like API. Choose it for a single shader or particle background where bytes matter. The trade-off is a small ecosystem, and its last release was Jan 2025.
- **regl**: functional and stateless WebGL. Good for custom shaders and data-viz-style effects, but it is not maintained actively (last release Nov 2024).
- **PixiJS v8**: 2D sprites, text, and particles with a WebGPU or WebGL renderer. Overkill for one dust layer, but strong for 2D page-like effects.
- **Babylon.js**: a full engine. Choose it for game-like scenes, not ambient decoration.
- **Spline runtime**: designer-authored scenes. Its total payload is very large, and scenes are typically loaded from Spline-hosted URLs. That external fetch needs privacy review under Bookflow's local-first rules: **inferred**, since the network behavior was not tested.
- **Three.js/R3F**: choose when you need the three ecosystem (loaders, postprocessing, drei).
- For Bookflow's existing ambient layer, a raw three→OGL port could cut most of the Three.js chunk. That would be a separate trade-off decision.

### Gaps
- No independent 2026 benchmarks comparing these libraries for tiny effects were found.
- Spline runtime network and telemetry behavior was not verified.
- Babylon's actual runtime-loaded chunk subset was not measured, only the totals.

## 6. Accessibility and reduced-motion patterns in R3F scenes

### Takeaway
R3F has no built-in reduced-motion handling. The pmndrs a11y package (`@react-three/a11y`) provides focus/role emulation and an `A11yUserPreferences` component, but it was last published in 2022. For a decorative layer, the practical pattern is to hide the canvas from assistive tech and respect `prefers-reduced-motion` with `frameloop="never"`/`"demand"` and a single still frame. Bookflow's raw implementation already does this.

### Cited Findings
- `@react-three/a11y` adds emulated focus, keyboard navigation, screen-reader support, roles (`content`, `button`, `togglebutton`, `link`), and `A11yAnnouncer`/`A11ySection` to R3F objects. It also documents an `A11yUserPreferences` component for `prefers-reduced-motion` and `prefers-color-scheme` — [react-three-a11y](https://github.com/pmndrs/react-three-a11y)
- The `@react-three/a11y` repo shows 627 stars, 10 open issues, and 7 open PRs — [GitHub](https://github.com/pmndrs/react-three-a11y). The latest npm version is 3.0.0, published 2022-05-15 with peer fiber `>=8` — [npm](https://registry.npmjs.org/@react-three/a11y)
- Canvas `frameloop` accepts `always`, `demand`, and `never`, and `fallback` renders DOM content when GL is unsupported. Runtime changes to `frameloop` and `dpr` apply when the props change — [R3F canvas.mdx](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/API/canvas.mdx)
- R3F 9.8.1 preserves Canvas visibility across React `<Activity>`/Suspense hiding, which is useful for pausing a hidden ambient layer — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- Bookflow's current layer reads `matchMedia("(prefers-reduced-motion: reduce)")` and renders a still frame for reduced motion or the STATIC tier (`src/shared/components/AmbientDustCanvas.jsx:194-199`, verified). It also pauses on `visibilitychange` (line 740).

### Inferences
- Recommended R3F pattern, if adopted:
  1. Subscribe to `matchMedia('(prefers-reduced-motion: reduce)')` (Framer Motion's `useReducedMotion` is already a dependency).
  2. Map reduced motion to `frameloop="never"` or `"demand"` and call `invalidate()` once for a static frame.
  3. Clamp `dpr` and gate on `PerformanceMonitor.onFallback`.
  4. Put `aria-hidden="true"` and `role="presentation"` on the decorative canvas wrapper, give it `pointer-events: none`, and provide a CSS gradient as `fallback`.
  5. Never put readable book text inside WebGL; keep text in React DOM nodes, per AGENTS.md invariant 2.
- These are standard web practices, not R3F-documented APIs.
- Because `@react-three/a11y` has gone over four years without a release, any interactive 3D UI (for example a 3D shelf) should use DOM-overlay controls (real buttons) for keyboard and screen-reader access rather than depend on it.

### Gaps
- No official pmndrs guidance on reduced motion was found in the R3F docs that were readable (the docs host was unreachable).
- `@react-three/a11y` was not tested with R3F 9.8 / React 19.
