# Creative Coding Techniques Beyond React Three Fiber for Bookflow (as of 2026-10-10)

Method note: In this session, WebFetch and direct curl to most documentation hosts (developer.chrome.com, MDN, rive.app, gsap.com, webkit.org, codrops, p5js.org, jsDelivr, unpkg, bundlephobia) failed with DNS errors or proxy 403s. The data below comes from four kinds of source:
(a) **npm registry metadata**, queried live on 2026-10-10 (version, publish date, license).
(b) **Sizes I measured myself**: I downloaded each official npm tarball from registry.npmjs.org and ran `wc -c` and `gzip -9` on the shipped dist file. These are gzip-9 sizes of whole UMD/min builds. Real Vite tree-shaken costs will differ, and usually come out smaller for ESM-modular libraries.
(c) **MDN browser-compat-data (BCD) v8.1.5**, the dataset behind MDN and caniuse-style tables, read from the `@mdn/browser-compat-data` npm tarball.
(d) **WebSearch result snippets**. I could not open these pages to read them in full, so treat them as secondary.
Where a claim comes only from a search snippet, it says so.

Repo context, checked in this session: `package.json:21` `"framer-motion": "^13.1.1"`, `:22` `"gsap": "^3.15.0"`, `:33` `"three": "^0.186.0"`. `src/shared/lib/haptics.js:14` already calls `navigator.vibrate`, and `:6-7` holds a TODO saying it is not yet gated on prefers-reduced-motion. A grep of `src` found no Web Audio or `speechSynthesis` usage.

Size and version table (measured, 2026-10-10):

| Package | Latest (npm) | Published | Measured file | min bytes | gzip-9 bytes |
|---|---|---|---|---|---|
| tone | 15.1.22 (`next` 15.5.57, 2026-10-04) | 2025-04-27 | build/Tone.js | 345,500 | 79,213 |
| howler | 2.2.4 | 2023-09-19 | dist/howler.core.min.js / howler.min.js | 26,924 / 36,173 | 7,951 / 9,709 |
| p5 | 2.3.4 | 2026-09-25 | lib/p5.min.js | 990,638 | 284,317 |
| pixi.js | 8.22.0 | 2026-10-01 | dist/pixi.min.js | 840,663 | 236,838 |
| roughjs | 4.6.6 | 2023-11-20 | bundled/rough.js (unminified) | n/a | 8,928 |
| paper | 0.12.18 | 2024-07-17 | dist/paper-core.min.js | 208,492 | 70,205 |
| two.js | 0.8.24 | 2026-08-29 | build/two.min.js | 205,366 | 49,691 |
| gsap core | 3.15.0 | 2026-04-13 | dist/gsap.min.js | 72,927 | 28,268 |
| gsap SplitText | 3.15.0 | 2026-04-13 | dist/SplitText.min.js | 7,732 | 3,658 |
| gsap DrawSVGPlugin | 3.15.0 | | dist/DrawSVGPlugin.min.js | 4,351 | 2,211 |
| gsap MorphSVGPlugin | 3.15.0 | | dist/MorphSVGPlugin.min.js | 21,195 | 9,553 |
| gsap ScrollTrigger | 3.15.0 | | dist/ScrollTrigger.min.js | 44,575 | 17,998 |
| motion | 14.1.0 | 2026-10-09 | dist/motion.js (full UMD) | 144,870 | 47,944 |
| lottie-web | 5.13.0 | 2025-05-21 | lottie_light.min.js / lottie.min.js | 168,394 / 305,704 | 46,410 / 76,054 |
| @lottiefiles/dotlottie-web | 0.81.0 | 2026-10-06 | dist/index.js + dotlottie-player.wasm | 165,443 + 1,238,072 | 32,933 + 496,347 |
| @rive-app/canvas | 2.44.1 | 2026-10-09 | rive.js + rive.wasm | 570,066 + 2,052,644 | 124,669 + 848,354 |
| @rive-app/canvas-lite | 2.44.1 | | rive.js + rive.wasm | 489,769 + 767,758 | 109,204 + 313,470 |
| ogl | 1.0.11 | 2025-01-27 | src/core + src/math (unminified ESM, concatenated) | 306,632 (all src) | 27,856 (core+math) |
| glslCanvas | 0.2.6 | 2022-11-23 | dist/GlslCanvas.min.js | 28,168 | 8,998 |
| curtainsjs | 8.1.6 | 2024-05-02 | dist/curtains.umd.min.js | 125,310 | 26,122 |
| shader-park-core | 0.2.8 | 2024-05-28 | (not measured) | | |
| splitting | 1.1.0 | 2024-05-31 | dist/splitting.min.js | 3,871 | 1,778 |
| d3 (full) | 7.9.0 | 2024-03-12 | dist/d3.min.js | 279,706 | 92,370 |
| @visx/visx, @visx/heatmap | 4.0.0 | 2026-06-11 | (not measured) | | |
| web-haptics | 0.0.6 | 2026-03-02 | (not measured) | | |
| kokoro-js | 1.2.1 | 2025-05-03 | (model download dominates, see below) | | |
| @mintplex-labs/piper-tts-web | 1.0.5 | 2026-08-11 | (not measured) | | |

Sources for the table: npm registry pages, e.g. [tone](https://registry.npmjs.org/tone), [howler](https://registry.npmjs.org/howler), [p5](https://registry.npmjs.org/p5), [pixi.js](https://registry.npmjs.org/pixi.js), [roughjs](https://registry.npmjs.org/roughjs), [paper](https://registry.npmjs.org/paper), [two.js](https://registry.npmjs.org/two.js), [gsap](https://registry.npmjs.org/gsap), [motion](https://registry.npmjs.org/motion), [lottie-web](https://registry.npmjs.org/lottie-web), [@lottiefiles/dotlottie-web](https://registry.npmjs.org/@lottiefiles/dotlottie-web), [@rive-app/canvas](https://registry.npmjs.org/@rive-app/canvas), [ogl](https://registry.npmjs.org/ogl), [glslCanvas](https://registry.npmjs.org/glslCanvas), [curtainsjs](https://registry.npmjs.org/curtainsjs), [shader-park-core](https://registry.npmjs.org/shader-park-core), [splitting](https://registry.npmjs.org/splitting), [d3](https://registry.npmjs.org/d3), [@visx/visx](https://registry.npmjs.org/@visx/visx), [web-haptics](https://registry.npmjs.org/web-haptics), [kokoro-js](https://registry.npmjs.org/kokoro-js), [@mintplex-labs/piper-tts-web](https://registry.npmjs.org/@mintplex-labs/piper-tts-web). I measured sizes from the tarballs at `https://registry.npmjs.org/<pkg>/-/<pkg>-<ver>.tgz`.

Browser support table (MDN BCD v8.1.5, [npm](https://registry.npmjs.org/@mdn/browser-compat-data); same data as [MDN](https://developer.mozilla.org/)). "preview" means Firefox Nightly or Technology Preview only. "False" means not supported.

| Feature (BCD key) | Chrome/Edge | Firefox | Safari / iOS |
|---|---|---|---|
| `document.startViewTransition` (same-document) | 111 | 144 | 18 |
| `@view-transition` (cross-document) | 126 | False | 18.2 |
| ViewTransition `types` | 125 | 147 | 18.2 |
| `animation-timeline` (scroll()/view()) | 115 | preview | 26 |
| `animation-trigger` | 146 | False | False |
| `@property` | 85 | 128 | 16.4 |
| `@container` | 105 | 110 | 16 |
| `text-wrap: pretty` | 117 (text-wrap-style 130) | False | 26 |
| `text-wrap-style: balance` | 130 | 124 | 17.5 |
| `font-variation-settings` | 62 / Edge 17 | 62 | 11 |
| CSS Paint API (`CSS.paintWorklet`, `paint()`) | 65 / Edge 79 | False | False |
| CSS Custom Highlight API (`Highlight`) | 105 | 140 (`::highlight` 149) | 17.2 |
| `@scope` | 118 | 146 | 26.4 |
| `interpolate-size` / `calc-size()` | 129 | False | False |
| `document.caretPositionFromPoint` | 128 | 20 | 26.2 |
| `navigator.vibrate` | 32 / Edge 79 | 16 desktop; Android 79 partial | False |
| `SpeechSynthesis` | 33 | 49 | 7 |
| `SpeechRecognition` | 139 | preview | 14.1 / iOS 14.5 |
| `AudioWorklet` | 66 | 76 | 14.1 / iOS 14.5 |
| `DeviceMotionEvent` | 31 | 6 | 17 / iOS 4.2 |
| `DeviceOrientationEvent.requestPermission()` | 152 | False | iOS 14.5 only |

---

## 1. Audio: Web Audio API, Tone.js, Howler, Web Speech, on-device TTS

### Takeaway
For page-turn foley and a few loopable ambient beds, Howler's core (~8 KB gzip) or raw Web Audio covers the need. Tone.js (~79 KB gzip full build) only pays off for truly generative or scheduled soundscapes. Web Speech `speechSynthesis` is supported everywhere, but whether a voice is local depends on the OS. Fully on-device neural TTS (Kokoro-82M, Piper) is possible, but it costs tens to hundreds of MB of model download.

### Cited Findings
- Tone.js: latest stable is 15.1.22 (2025-04-27). A `next` dist-tag at 15.5.57 was published on 2026-10-04, so development is active but the stable tag is about 18 months old. Description: "A Web Audio framework for making interactive music in the browser." — [npm registry: tone](https://registry.npmjs.org/tone)
- Tone.js full `build/Tone.js` measures 345,500 B min / 79,213 B gzip-9 (measured from the 15.1.22 tarball) — [tone 15.1.22 tarball](https://registry.npmjs.org/tone/-/tone-15.1.22.tgz)
- Howler 2.2.4 is the latest release and was published 2023-09-19, with no newer versions. It works fine but is effectively in maintenance mode. `howler.core.min.js` measures 7,951 B gzip, and the full build with the spatial plugin is 9,709 B gzip — [npm registry: howler](https://registry.npmjs.org/howler); measured from [tarball](https://registry.npmjs.org/howler/-/howler-2.2.4.tgz)
- `AudioWorklet` is supported in Chrome 66, Firefox 76 and Safari 14.1 / iOS 14.5, which makes custom DSP (noise generators, brown noise) viable everywhere — [MDN BCD 8.1.5](https://registry.npmjs.org/@mdn/browser-compat-data)
- `SpeechSynthesis` is supported in Chrome 33, Firefox 49 and Safari 7. `SpeechRecognition` is in Chrome 139 and Safari 14.1, but Firefox has it only in preview — [MDN BCD 8.1.5](https://registry.npmjs.org/@mdn/browser-compat-data)
- kokoro-js 1.2.1 (2025-05-03) loads `onnx-community/Kokoro-82M-v1.0-ONNX` with dtype options fp32/fp16/q8/q4/q4f16 and a WebGPU device option. It recommends fp32 on WebGPU — [kokoro-js README (jsDelivr)](https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/README.md) (search snippet); [npm registry](https://registry.npmjs.org/kokoro-js)
- Kokoro model download size: the smallest quantized variant is reported at about 86 MB, down from 326 MB. Third-party apps cite about 300 MB for the q4/fp32 builds commonly used on WebGPU. Sources conflict — [kokoro-js npm](https://npmjs.com/package/kokoro-js); [OfflineTTS guide](https://offlinetts.com/blog/kokoro-tts-complete-guide/); [StreamingKokoroJS](https://www.sourcepulse.org/projects/10607885) (all from search snippets, unverified)
- WebGPU Kokoro is reported as Chromium-only for now, and one project says Firefox does not currently work — [StreamingKokoroJS](https://www.sourcepulse.org/projects/10607885) (search snippet)
- Piper in the browser: `@mintplex-labs/piper-tts-web` 1.0.5 (2026-08-11) is a "Fork of @diffusion-studio/vits-web for easier built-in PiperTTS use". The upstream `@diffusionstudio/vits-web` was last published 2024-09-09 — [npm registry](https://registry.npmjs.org/@mintplex-labs/piper-tts-web); [npm registry](https://registry.npmjs.org/@diffusionstudio/vits-web)

### Inferences
- Feature ideas:
  - **Page or chapter-turn foley**: a soft paper rustle at chapter boundaries, using Howler core or one `AudioBufferSourceNode` with about 3 short samples and randomized playbackRate.
  - **Generative focus bed**: brown, pink or rain noise built from an AudioWorklet noise generator plus a slow-LFO filter, with no samples needed.
  - **Pace-reactive ambience**: the filter cutoff drifts gently with words per minute, keeping progress deterministic with no reward sounds.
  - **Read-aloud**: `speechSynthesis` with sentence-boundary events that drive the existing focus rail.
  - **Neural voice pack**: an opt-in, explicitly downloaded and cached Kokoro or Piper model.
- Privacy caveat: for `speechSynthesis`, voices may be OS-network-backed on some platforms; `SpeechSynthesisVoice.localService` is the documented flag for this. I could not open MDN this session to confirm the exact semantics, so mark it **unverified**. Bookflow should filter to `localService === true` to keep book text on device.
- Recommended stack: raw Web Audio plus AudioWorklet, with no dependency, for noise and filters. Add Howler only if sprite or format fallback is needed. Avoid Tone.js unless musical scheduling is a real requirement. Its 79 KB gzip is too heavy for a calm reader's main chunk, so lazy-load it if adopted.
- Every sound must be off by default, start only after a user gesture (autoplay policy), and offer a volume control.

### Gaps
- I did not measure Tone.js tree-shaken ESM size, so I cannot say how small a "noise + filter + LFO" subset gets.
- No 2026 primary source confirmed `SpeechSynthesisVoice.localService` behavior per platform (macOS, iOS, Android, Windows), or which voices are cloud-backed. Resolve by reading MDN SpeechSynthesisVoice and testing on devices.
- I could not verify Piper web model sizes because the documentation hosts were unreachable.

## 2. 2D canvas, generative libraries, SVG animation, and Lottie vs Rive

### Takeaway
The repo already ships GSAP 3.15, whose formerly paid plugins (SplitText, DrawSVG, MorphSVG) are now free and each add only 2-10 KB gzip. That makes GSAP plus inline SVG the best cost/benefit path for micro-interactions. Rough.js (~9 KB gzip) is a cheap "hand-drawn" accent. p5 (284 KB gzip) and PixiJS (237 KB gzip full) are too heavy for incidental UI. Rive's runtime is about 1 MB gzip (JS plus WASM, measured) and dotLottie's is about 530 KB gzip, so both cost a lot for a few badges.

### Cited Findings
- GSAP is now free including formerly members-only plugins such as SplitText and MorphSVG, under a no-charge "Standard" license (Webflow-owned). The `gsap-trial` package is deprecated — [GSAP Standard License](https://gsap.com/community/standard-license/); [gsap-trial deprecation README](https://cdn.jsdelivr.net/npm/gsap-trial@3.13.0/README.md) (search snippets)
- The npm `gsap` license field reads: "Standard 'no charge' license: https://gsap.com/standard-license." The latest version is 3.15.0 (2026-04-13) — [npm registry: gsap](https://registry.npmjs.org/gsap)
- Measured gsap 3.15.0 gzip sizes: core 28,268 B; SplitText 3,658 B; DrawSVGPlugin 2,211 B; MorphSVGPlugin 9,553 B; ScrollTrigger 17,998 B — [gsap tarball](https://registry.npmjs.org/gsap/-/gsap-3.15.0.tgz)
- motion (the successor package to framer-motion) is at 14.1.0, published 2026-10-09. Its full UMD build `dist/motion.js` measures 47,944 B gzip, and the package exports `./mini`, `react-mini` and `react-m` entry points for smaller builds — [npm registry: motion](https://registry.npmjs.org/motion); measured from [tarball](https://registry.npmjs.org/motion/-/motion-14.1.0.tgz)
- p5 2.3.4 (2026-09-25, LGPL-2.1) measures 284,317 B gzip for `lib/p5.min.js` — [npm registry: p5](https://registry.npmjs.org/p5); measured
- PixiJS 8.22.0 (2026-10-01, MIT) measures 236,838 B gzip for `dist/pixi.min.js`. It is very actively maintained — [npm registry: pixi.js](https://registry.npmjs.org/pixi.js); measured
- Rough.js 4.6.6 was last published 2023-11-20. Its unminified `bundled/rough.js` measures 8,928 B gzip — [npm registry: roughjs](https://registry.npmjs.org/roughjs); measured
- Paper.js 0.12.18 was last published 2024-07-17. `paper-core.min.js` measures 70,205 B gzip — [npm registry: paper](https://registry.npmjs.org/paper); measured
- two.js 0.8.24 (2026-08-29) measures 49,691 B gzip — [npm registry: two.js](https://registry.npmjs.org/two.js); measured
- lottie-web 5.13.0 (2025-05-21): `lottie_light.min.js` 46,410 B gzip (SVG renderer only), full build 76,054 B gzip — [npm registry: lottie-web](https://registry.npmjs.org/lottie-web); measured
- @lottiefiles/dotlottie-web 0.81.0 (2026-10-06): JS 32,933 B gzip plus `dotlottie-player.wasm` 496,347 B gzip — [npm registry](https://registry.npmjs.org/@lottiefiles/dotlottie-web); measured
- @rive-app/canvas 2.44.1 (2026-10-09): `rive.js` 124,669 B plus `rive.wasm` 848,354 B gzip. The `canvas-lite` variant is 109,204 B plus 313,470 B gzip — [npm registry](https://registry.npmjs.org/@rive-app/canvas); measured
- Rive's file-size claim: .riv files are "typically 10-15x smaller" than equivalent Lottie JSON, e.g. 240 KB Lottie vs 16 KB Rive. This is a vendor claim — [Rive blog](https://rive.app/blog/rive-as-a-lottie-alternative) (search snippet); LottieFiles concedes the same 10-15x range versus uncompressed .json — [LottieFiles blog](https://lottiefiles.com/blog/working-with-lottie-animations/lottiefiles-or-rive) (search snippet)
- In Callstack's mobile benchmark, total memory was Lottie 246 MB vs Rive 276 MB. Rive won on native memory (25 vs 49 MB) and lost on graphics memory (184 vs 123 MB) — [Callstack](https://callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation) (search snippet; React Native, not web)
- LottieFiles has added a native State Machine in Lottie Creator, bundled into .lottie, which narrows Rive's state-machine advantage — [LottieFiles blog](https://lottiefiles.com/blog/working-with-lottie-animations/lottiefiles-or-rive) (search snippet)

### Inferences
- Feature ideas:
  - **Hand-drawn margin marks**: Rough.js underlines, circles and brackets for notes and bookmarks, rendered as SVG next to (not inside) text nodes.
  - **DrawSVG ink stroke**: animate the bookmark ribbon or an achievement emblem being "inked" when earned.
  - **MorphSVG**: the bookmark icon morphs from outline to filled, or the play/pause control for read-aloud morphs between states.
  - **Generative cover art for imported books with no cover**: a seeded Canvas 2D or SVG pattern derived from a hash of the title.
  - **Rive or Lottie**: use only for a small number of opt-in achievement badges. Rive's state machine fits "badge idle → hover → unlocked". Given about 0.4-1 MB gzip of runtime, lazy-load it only inside the BadgeGallery, or prefer GSAP-on-SVG with zero new dependencies.
- p5 and PixiJS are unjustified for a reader UI. If a generative "reading fingerprint" canvas is desired, raw Canvas 2D (no dependency) is enough.
- The GSAP license is "no charge" but not OSI-MIT. It is already a dependency, so no new licensing decision is needed for its plugins (inferred).

### Gaps
- I could not confirm the tree-shaken ESM cost of `motion/mini` or the `animate()` export, because bundlephobia was unreachable.
- I could not confirm whether `rive.js` embeds an inline WASM fallback, which may double-count size, or whether only the .wasm is fetched at runtime.
- No independent web (browser) benchmark of Rive vs Lottie was found.

## 3. CSS-native creative techniques in 2026

### Takeaway
Same-document View Transitions are now in all three engines (Chrome 111, Firefox 144, Safari 18). Cross-document transitions are still missing in Firefox, which does not matter for an SPA like Bookflow. Scroll-driven animations are in Chrome 115 and Safari 26 but not stable Firefox, so they must be progressive enhancement. `@property`, container queries and `text-wrap: balance` are baseline. `text-wrap: pretty` is missing in Firefox. The CSS Paint API (Houdini) is Chromium-only and should be avoided.

### Cited Findings
- All support data in this section comes from the BCD table above — [MDN BCD 8.1.5](https://registry.npmjs.org/@mdn/browser-compat-data).
- Chrome's docs list cross-document view transitions in Chrome/Edge 126 and Safari 18.2, with Firefox not supported. A 2026 third-party guide says Firefox cross-document support is "in development" — [Chrome for Developers](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document); [devtoolbox 2026 guide](https://devtoolbox.dedyn.io/blog/css-view-transitions-complete-guide) (search snippets). BCD 8.1.5 still shows Firefox `@view-transition` = False.
- Cross-document view transitions are reportedly part of Interop 2026 — [ecorpit Interop 2026 summary](https://ecorpit.com/interop-2026-web-platform-developer-guide/) (search snippet; secondary, unverified)
- The `animation-trigger` property (scroll-triggered, distinct from scroll-driven) is in Chrome/Edge 146 (March 2026). One article says Safari 26.6 and Firefox 154 do not support it "as of August 2026" — [buildmvpfast](https://www.buildmvpfast.com/blog/css-scroll-driven-animations-replace-js-2026) (search snippet); BCD confirms Chrome 146 only.
- WebKit's `text-wrap: pretty` reportedly adjusts the whole paragraph, while Chromium's adjusts only the last few lines — [ppc.land](https://ppc.land/safaris-text-wrap-pretty-brings-superior-web-typography/) (search snippet)
- Superseded info: a gwern.net mirror says `pretty` is unsupported in Safari. That is outdated, because BCD shows Safari 26 — [gwern mirror](https://gwern.net/doc/www/codersblock.com/7f18480d28ae9cd718b34cbbd1272c2384a97cc6.html)

### Inferences
- Feature ideas:
  - **View Transitions**: library → reader open as a shared-element "book lifts off the shelf" (cover `view-transition-name`); chapter change as a soft cross-fade; settings theme switch as a circular reveal from the toggle. Use `types` (now in Chrome 125, Firefox 147, Safari 18.2) to pick a "forward" or "back" animation, and wrap the call in a reduced-motion check that falls back to instant updates.
  - **Scroll-driven animations**: a chapter progress hairline driven by `animation-timeline: scroll()`, and gentle fade-in of paragraphs approaching the focus rail with `view()`. These run off the main thread with zero JavaScript where supported. In Firefox, keep the existing JavaScript focus rail as the source of truth and treat CSS as decoration only.
  - **`@property`**: typed, animatable custom properties for smooth gradient or "ink" color transitions on the active sentence, and an animated `--progress` conic ring for chapter completion.
  - **Container queries**: make the reader card and side panels adapt at 320px independently of the viewport.
  - **`text-wrap: balance`** on headings and chapter titles (baseline). **`text-wrap: pretty`** on body paragraphs as progressive enhancement; it is ignored in Firefox. Measure the performance cost on long chapters, because pretty wrapping is more expensive (inferred, unmeasured).
  - **Avoid Houdini `paint()`**: there is no Firefox or Safari support. Use SVG or CSS gradient grain instead.
- The Bookflow focus rail (`FOCUS_RAIL_RATIO = 0.38`) could get a CSS-only visual companion via `view()` timeline ranges keyed to the rail band. This is an untested idea.

### Gaps
- I did not verify the official Interop 2026 feature list, because webkit.org and web.dev were unreachable.
- There is no measured cost of `text-wrap: pretty` on 10k-word chapters.

## 4. Shader-on-DOM techniques without full 3D

### Takeaway
Bookflow already ships `three` 0.186. For paper grain or fragment-shader backgrounds, OGL (about 28 KB gzip for unminified core and math, and tree-shakeable) or a hand-written ~100-line WebGL quad is far lighter than adding curtains.js (26 KB gzip, last release 2024-05) or glslCanvas (9 KB gzip, last release 2022-11, effectively unmaintained). For paper and grain, static CSS or SVG `feTurbulence` textures cost nothing at runtime and are the calmest choice.

### Cited Findings
- OGL 1.0.11 was last published 2025-01-27 under the Unlicense. Its `src/core` plus `src/math` (unminified ESM) concatenates to 27,856 B gzip — [npm registry: ogl](https://registry.npmjs.org/ogl); measured from [tarball](https://registry.npmjs.org/ogl/-/ogl-1.0.11.tgz)
- curtainsjs 8.1.6 was last published 2024-05-02. `curtains.umd.min.js` measures 26,122 B gzip — [npm registry: curtainsjs](https://registry.npmjs.org/curtainsjs); measured
- glslCanvas 0.2.6 was last published 2022-11-23 and measures 8,998 B gzip — [npm registry: glslCanvas](https://registry.npmjs.org/glslCanvas); measured
- shader-park-core 0.2.8 was last published 2024-05-28 (Apache-2.0) — [npm registry: shader-park-core](https://registry.npmjs.org/shader-park-core)
- Repo: `three` ^0.186.0 is already a dependency — `/home/user/bookflow/package.json:33` (verified this session)

### Inferences
- Feature ideas:
  - **Paper grain or vellum background**: a fragment-shader noise layer under the reader at very low contrast, paused when the tab is hidden, rendered at DPR ≤1.5, and replaced by a static texture under `prefers-reduced-motion` or a low-power mode.
  - **Ink-bleed highlight**: rather than a shader on the text, which would require rasterizing or cloning text and risks breaking React text nodes and selection, draw the highlight as a shader or SVG blob behind the paragraph's bounding rects from `Range.getClientRects()`. Text stays real DOM.
  - **Candlelight or night-mode vignette**: a full-screen quad with a slow radial falloff.
  - **Reuse existing Three.js**: a `ShaderMaterial` on an orthographic full-screen quad adds no new dependency. Lazy-load it so it stays off the main chunk, which is already flagged as large in AGENTS.md.
- curtains.js's DOM-synced planes appeal for image effects, but Bookflow has few images, and its maintenance cadence has stalled.

### Gaps
- No measured GPU or battery cost for an always-on background shader on mid-range Android. This needs device profiling.
- I could not fetch Codrops examples (host unreachable).

## 5. Typography-centric creative coding with React text nodes and accessibility

### Takeaway
The safest high-impact primitive is the **CSS Custom Highlight API**. It styles arbitrary `Range`s without splitting or wrapping text, so React text nodes, screen readers and selection are untouched. It is now in Chrome 105, Firefox 140 (`::highlight` 149) and Safari 17.2. Use GSAP SplitText (3.7 KB gzip) or splitting.js only for short decorative strings like titles and badges, never for book body text.

### Cited Findings
- Custom Highlight API support: `Highlight` is in Chrome 105, Firefox 140 and Safari 17.2. The `::highlight()` selector is in Firefox 149 — [MDN BCD 8.1.5](https://registry.npmjs.org/@mdn/browser-compat-data)
- The API styles text ranges defined in JavaScript via `::highlight()` without altering the DOM — [MDN CSS custom highlight API](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_custom_highlight_API) (search snippet)
- The allowed properties are limited to roughly the `::selection` set (background-color, color, text-decoration, etc.), so transform and opacity effects on the highlight itself are not available — [LogRocket](https://blog.logrocket.com/getting-started-css-custom-highlight-api) (search snippet; confirm against spec [CSSWG draft](https://drafts.csswg.org/css-highlight-api))
- `document.caretPositionFromPoint` is now cross-engine (Chrome 128, Firefox 20, Safari 26.2), which helps map taps to word ranges — [MDN BCD 8.1.5](https://registry.npmjs.org/@mdn/browser-compat-data)
- GSAP SplitText 3.15.0 measures 3,658 B gzip and is free under the GSAP standard license — measured from [gsap tarball](https://registry.npmjs.org/gsap/-/gsap-3.15.0.tgz); [GSAP license](https://gsap.com/community/standard-license/)
- splitting 1.1.0 (2024-05-31) measures 1,778 B gzip — [npm registry: splitting](https://registry.npmjs.org/splitting); measured
- `font-variation-settings` has been supported since Chrome 62, Firefox 62 and Safari 11 — [MDN BCD 8.1.5](https://registry.npmjs.org/@mdn/browser-compat-data)

### Inferences
- Feature ideas:
  - **Live "ink" highlight of the current word during read-aloud**: update a `Highlight` range on each `speechSynthesis` boundary event, without re-rendering React.
  - **Search and annotation highlights** via named highlights (`::highlight(note)`, `::highlight(search)`), with color transitions via `@property` (inferred; check whether transitions apply to highlight pseudos).
  - **Variable font "weight breathing"**: subtly raise `wght` or `opsz` on the active sentence, and widen tracking for dyslexia mode. Use registered custom properties (`@property --wght`) to animate it smoothly and disable it under reduced motion. Atkinson Hyperlegible's variable version should be checked for its available axes (unknown).
  - **Pace-reactive typography**: map measured WPM to a small `opsz` or letter-spacing change. Changing glyph metrics alters line breaks, though, and may make text jump. Prefer axes that do not change advance width, or confine the effect to `color`/weight via `font-weight` with `font-synthesis` controls (inferred; needs testing).
  - **Kinetic typography** only for chapter title cards and achievement toasts, using SplitText. Put `aria-label` on the parent with the full string and `aria-hidden` on the split children (standard pattern; inferred), and run splitting only on strings React does not otherwise reconcile, i.e. within a ref'd leaf that React will not touch.
- Why not split book text: SplitText and splitting.js mutate DOM by inserting spans. That conflicts with React's reconciliation of the same nodes and breaks selection and screen-reader flow. If per-word spans are ever needed, React should render them itself (the React element tree is already the rendering contract).

### Gaps
- I did not verify whether CSS transitions or animations run on `::highlight()` pseudo-elements in each engine. No tested example was found.
- I did not verify the variable axes of the bundled Atkinson Hyperlegible or OpenDyslexic fonts. Resolve by inspecting the font files in the repo, e.g. with fontTools.

## 6. Data art for reading stats: D3, visx, fingerprints, heatmaps, streaks

### Takeaway
Use D3 sub-modules (`d3-scale`, `d3-shape`, `d3-array`), with React rendering the SVG, or visx 4.0 (June 2026). Do not ship full d3 (92 KB gzip). A streak calendar or heatmap and a seeded generative "reading fingerprint" can be done in plain SVG with very little code.

### Cited Findings
- d3 7.9.0 was last published 2024-03-12 (registry modified 2025-05-17). The full `d3.min.js` measures 92,370 B gzip — [npm registry: d3](https://registry.npmjs.org/d3); measured
- @visx/visx and @visx/heatmap 4.0.0 were published 2026-06-11 — [npm registry: @visx/visx](https://registry.npmjs.org/@visx/visx); [@visx/heatmap](https://registry.npmjs.org/@visx/heatmap)

### Inferences
- Feature ideas:
  - **Reading streak calendar**: a GitHub-style 53×7 SVG grid from library session totals. Use deterministic coloring by minutes read, with no variable rewards.
  - **Reading fingerprint**: a radial or rose glyph per book, where each petal is a session (angle = time of day, length = minutes, hue = pace). Seed it from the book ID for stable art, export it as SVG, and keep it on device.
  - **Pace ribbon**: a `d3-shape` area chart of WPM across the chapters of a book.
  - **Chapter "terrain" sparkline** in the resume card.
- Accessibility: every chart needs a text summary or table alternative, and must not rely on color alone (inferred best practice).
- Library stats are already metadata-only per AGENTS.md, so data art fits the privacy model.

### Gaps
- I did not measure the tree-shaken size of `d3-scale` + `d3-shape` or visx sub-packages.
- I did not verify visx 4.0's React 19 peer-dependency status (resolve with `npm view @visx/visx peerDependencies`).

## 7. Haptics (Vibration API) and device motion

### Takeaway
`navigator.vibrate` works on Android Chrome and Firefox for Android (partial), but Safari and iOS do not support it at all. The iOS "hidden switch input" workaround (web-haptics, ios-haptics) relies on undocumented behavior, and was reportedly patched in iOS 26.5. Treat haptics as optional Android-first sugar, and gate it on reduced motion. Bookflow's own `haptics.js` has an open TODO for exactly this. DeviceMotion requires a permission prompt on iOS and adds little for a calm reader.

### Cited Findings
- `navigator.vibrate`: Chrome 32, Edge 79, Firefox 16 (Firefox Android 79, partial), Safari and iOS False — [MDN BCD 8.1.5](https://registry.npmjs.org/@mdn/browser-compat-data)
- Bookflow's `src/shared/lib/haptics.js:14` calls `navigator.vibrate`, and `:6-7` contains a TODO noting it is not yet gated on prefers-reduced-motion, which "violates the reduced-motion" rule — `/home/user/bookflow/src/shared/lib/haptics.js` (verified this session)
- web-haptics 0.0.6 (2026-03-02, MIT, repo `lochie/web-haptics`, homepage haptics.lochie.me) injects a hidden switch input and label on iOS Safari and clicks the label to trigger the Taptic Engine. It falls back to `navigator.vibrate` elsewhere — [npm registry](https://registry.npmjs.org/web-haptics); [azukiazusa.dev](https://azukiazusa.dev/en/blog/ios-safari-web-haptics) (search snippet)
- The switch control behind the trick arrived in Safari 17.4. One tester page claims programmatic iOS haptics work from iOS 17.4 to 26.4 and were patched in iOS 26.5. That is single-source and **unverified** — [rapidtoolset iOS Haptics Tester](https://rapidtoolset.com/en/tool/ios-haptics-tester) (search snippet)
- The iOS approach needs a Taptic Engine (iPhone 7+) and "System Haptics" turned on — [pub.dev web_haptics](https://pub.dev/documentation/web_haptics/latest/) (search snippet)
- `DeviceMotionEvent`: Chrome 31, Firefox 6, Safari 17, iOS 4.2. `DeviceOrientationEvent.requestPermission()` exists on iOS 14.5+ and in Chrome 152 per BCD — [MDN BCD 8.1.5](https://registry.npmjs.org/@mdn/browser-compat-data)

### Inferences
- Feature ideas, all opt-in and reduced-motion-gated:
  - one 10-15 ms tick when a bookmark is set or a chapter is completed
  - a distinct two-pulse pattern when a daily goal is reached
  - a gentle tick when a paragraph pin toggles
- Device motion ideas: a subtle parallax of the ambient layer on tilt, or "tilt to scroll". Both conflict with the calm default, need an iOS permission prompt, and are not recommended beyond a hidden experiment.
- Do not depend on the iOS switch hack for any meaningful feedback. It is undocumented, may be patched, and injects DOM.

### Gaps
- I did not independently confirm the claimed iOS 26.5 patch of the switch-haptics trick. Resolve by testing on an iOS 26.5+ device.
- The meaning of Chrome 152 support for `DeviceOrientationEvent.requestPermission` in BCD (whether desktop or Android gates it) was not investigated.
