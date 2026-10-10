# 3D / React Three Fiber Feature Ideas for a Local-First Reading and Library App

Research date: 2026-10-10. Method: web search plus direct fetch of primary pages where reachable. Several primary domains (tympanus.net/codrops, wawasensei.dev, discourse.threejs.org, dev.to) failed DNS resolution from the research sandbox (`getaddrinfo ENOTFOUND`), so claims about them rest on search snippets and are flagged. Most GitHub READMEs fetched show no project dates, so recency is often unknown.

## 1. 3D bookshelf / library visualizations: what open-source examples exist?

### Takeaway
A cluster of open-source Three.js bookshelves exists, most following the "Stripe Press" pattern: a horizontal scrolling shelf, pull a volume out, open it, and drag through pages. The most useful one for Bookflow is elishacoad/3d-bookshelf, because it builds the same shelf twice (CSS 3D and WebGL) and documents what each costs. No official pmndrs or drei bookshelf example came up.

### Cited Findings
- **MengTo/complete-shelf**: a single-file Three.js library of seven interactive clothbound hardcovers. You browse a continuous shelf, pull a volume into a detail view, orbit the binding, and drag through "a small set of physically curved pages". It uses PBR materials and OrbitControls, with hinged groups and segmented meshes for the cover and pages. Cloth, foil, paper, page-edge, wood, roughness, normal and shadow detail are generated on canvas at runtime; cover art and wood are embedded WebP atlases. The README mentions reusable geometry per book and deterministic eased timelines. Reduced motion is not mentioned, no license was visible, and there are only 3 commits. Demo: mengto.github.io/complete-shelf. — [GitHub](https://github.com/mengto/complete-shelf); the author's X post says it was inspired by Stripe Press and "took quite a few prompts", with code and prompt open-sourced — [X/MengTo](https://x.com/MengTo/status/2083704026160673099) (post date not verified)
- **elishacoad/3d-bookshelf**: built once in CSS 3D and once in WebGL. Measured trade-offs from its README:
  - payload: about 0 extra for CSS versus +534 KB (136 KB gzip) for the `three` version
  - spine text: live and resolution-independent in CSS versus a canvas texture in WebGL
  - spines selectable/focusable: yes in CSS, no in WebGL
  - shadows: faked with gradients in CSS versus real in WebGL
  - post-processing: WebGL only
  - WebGL also "needs a working WebGL context, which not every visitor has"

  Stack is React, TypeScript, three, Vite and leva. Code is MIT; the cover and spine art belongs to the publishers. — [GitHub](https://github.com/elishacoad/3d-bookshelf)
- **kerrfairtex/bookshelf-interactive-**: a performance fork of mintdotgg/bookshelf with "27% fewer draw calls, merged meshes, and smarter raycasting", holding 19 Stripe Press titles and meant to be forked with your own books. — [GitHub](https://github.com/kerrfairtex/bookshelf-interactive-)
- **guzdup/MyBookshelf**: a React, zero-build prototype. Spine thickness follows real page counts, and tapping a spine opens a reading view. — [GitHub](https://github.com/guzdup/MyBookshelf)
- **taha715/bookshelf** ("Fourteen Volumes"): Next.js + Three.js + Matter.js, with physics-simulated falling text, built on Mint Playground's Complete Shelf scaffold. — [GitHub](https://github.com/taha715/bookshelf)
- An X post promotes an "open-source three.js bookshelf" where you scroll, open books and flip pages (links shortened; target not verified). — [X/RoundtableSpace](https://x.com/RoundtableSpace/status/2084251686478946748)
- A three.js forum category lists a "three.js Bookshelf" thread with activity dated 2024-08-17, plus examples named MyShelves and a 3D Bookshop. This comes from a search snippet only; the page was unreachable. — [three.js forum](https://discourse.threejs.org/t/book-applications-in-threejs-org/93928) (UNVERIFIED)

### Inferences
- Bookflow already ships Three.js, so the roughly 136 KB gzip cost of `three` is largely paid. The remaining costs are scene code plus @react-three/fiber and drei if adopted (not measured here). Lazy-load the shelf on the library route only.
- The elishacoad accessibility finding (WebGL spines are not focusable) means a 3D shelf must be paired with a DOM list or overlay for keyboard and screen-reader users. A CSS 3D shelf may be the better default, with WebGL as an opt-in "showcase" mode.
- Bookflow has no cover art (local-first, no metadata fetch), so per-book textures must be generated. Canvas-generated cloth, foil and paper textures like complete-shelf's fit this, as does procedural covers (Section 3). Spine thickness from page count (MyBookshelf) maps directly onto parsed-document metadata.
- Complexity: CSS 3D shelf is low to medium; WebGL shelf with pull-out and orbit is medium; adding page drag is high.

### Gaps
- No pmndrs gallery or drei "bookshelf" demo was found. The pmndrs examples gallery was not fetched directly.
- No Codrops bookshelf tutorial was found; the Codrops domain was unreachable.
- No FPS or draw-call benchmarks on mobile for any shelf project.

## 2. Realistic page-turn / page-curl effects in WebGL

### Takeaway
There are three established techniques:
- **SkinnedMesh with a bone chain** (Wawa Sensei's R3F "3D Book Slider" tutorial)
- **Vertex-shader bend of a subdivided plane** injected into a standard material (shiarauzo/book-flip)
- **Full-screen fragment-shader curl transition** (HP InvertedPageCurl / gl-transitions, webgl-page-curl)

shiarauzo/book-flip is the closest reference for Bookflow's constraints. It renders on demand, idles the GPU while reading, honors `prefers-reduced-motion`, and reframes for mobile.

### Cited Findings
- **Wawa Sensei, "Build a 3D Book Slider Landing Page with Three.js & React"**: an R3F tutorial covering realistic page-turning animations "using curves for natural effects". A third-party summary says it covers geometries, skinned meshes, skeletons and bones. — [wawasensei.dev](https://wawasensei.dev/tuto/3d-book-slider-landing-page-threejs-and-react); [daily.dev summary](https://daily.dev/posts/build-a-3d-book-slider-landing-page-with-three-js-react-emuwaahrm). The tutorial page itself could not be fetched (DNS failure), so segment counts, easing and date are UNVERIFIED.
- **shreejai/book-slider-3d**: an R3F + Three.js book slider with a page-fold animation and audio. The README screenshot filename is dated 2024-08-10; it has 21 commits and 13 stars and does not state its technique. Demo: book-slider-3d.vercel.app. — [GitHub](https://github.com/shreejai/book-slider-3d)
- **shiarauzo/book-flip** (R3F + drei + Vite + TypeScript; reads *Alice in Wonderland*):
  - Each leaf is a subdivided front/back plane pair.
  - Uniform `uProgress` (0 to 1) rotates the leaf by π around the spine, and `uBend` bows it mid-flip.
  - `uStackZ` offsets turned leaves so they land on the pile.
  - The shader is injected into `MeshStandardMaterial` via `onBeforeCompile`, so only positions and normals are overridden and PBR lighting and shadows still work.
  - Page content is drawn to a canvas and used as textures.
  - Clicks are resolved by screen half, which avoids raycasting GPU-bent geometry.
  - `frameloop="demand"` means the GPU idles while reading.
  - Resources are disposed on unmount.
  - `prefers-reduced-motion` removes idle sway and snaps page turns.
  - The camera reframes for portrait and mobile.
  - Demo: book-flip-six.vercel.app. No license is visible.

  — [GitHub](https://github.com/shiarauzo/book-flip)
- **MengTo/complete-shelf** uses hinged groups and segmented meshes for curved page-turn motion while dragging. — [GitHub](https://github.com/mengto/complete-shelf)
- **Fragment-shader curl**: HP's InvertedPageCurl (BSD-3) is a single-pass shader taking outgoing and incoming textures plus a progress uniform, and is ported to gl-transitions. — [Inverted Page Curl source](https://docs.rs/crate/isf/0.1.0/source/test_files/Inverted%20Page%20Curl.fs); [alvarotrigo page-flip demo](https://alvarotrigo.com/fullPage/page-flip-effect/)
- **webgl-page-curl (npm)** screenshots a DOM element (via html2canvas) into a canvas overlay and animates a curl there. — [npm](https://npmjs.com/package/webgl-page-curl)
- **Non-WebGL alternatives**: StPageFlip and react-pageflip produce realistic page flipping on DOM pages without Three.js. — [react-pageflip](https://github.com/strivelen/react-pageflip); [page-flip README](https://cdn.jsdelivr.net/npm/page-flip@2.0.7/README.md)
- **quick_flipbook (npm)**: a three.js flipbook package. — [npm](https://npmjs.org/package/quick_flipbook)
- **Commercial reception**: Apple Books replaced the realistic curl with a slide in iOS 16.0. After user pushback, iOS 16.4 (2023) restored it as an option, giving "Curl", "Slide" (the default) and "None". — [iThinkDifferent](https://www.ithinkdiff.com/apple-books-traditional-page-turn-ios-16-4/); [Gadget Hacks](https://ios.gadgethacks.com/how-to/get-page-turning-curl-animation-back-apple-books-for-iphone-and-ipad-0385329). Whether the option still exists in iOS 18+ was not verified.

### Inferences
- The Apple Books history is the strongest product evidence available. Readers want a curl as a choice, not a default, and a "None" option matters. This matches Bookflow's opt-in rule.
- Bookflow's reader is a scrolling sentence-focus rail, not paginated, so a page curl does not fit the reader body. Better fits:
  - chapter-transition moments, as an opt-in full-screen curl from chapter N to N+1 using the InvertedPageCurl fragment shader with two canvas snapshots
  - a 3D "cover preview" on the library or resume card
  - the landing hero

  The fragment-shader approach is cheapest: one quad and one pass.
- Bookflow's "React text nodes only" invariant means book text must stay in the DOM for reading. Canvas-textured pages (as book-flip uses) are acceptable only for decorative previews, never as the reading surface.
- Complexity and cost:
  - fragment curl transition: low to medium, one draw call
  - vertex-shader leaf flip: medium, about 2 draw calls per leaf and cheap with demand rendering
  - SkinnedMesh bone book: medium to high, since CPU skinning setup and bone count scale with segments

### Gaps
- No measured mobile FPS for any of these. book-flip's mobile claim is about framing only.
- Wawa Sensei tutorial internals and date not verified (fetch failed).
- No Codrops page-curl tutorial surfaced.

## 3. Procedural/generative covers, 3D progress, and reading-stats "worlds"

### Takeaway
Generative covers from metadata have a well-documented lineage, starting with NYPL Labs (2014) and continuing through SVG and Processing generators. None found uses a title hash specifically, but a deterministic hash seed is a trivial adaptation. No shipped commercial reading app was found that uses a 3D "garden", "tree" or "constellation" stats world. Fable and StoryGraph use 2D streaks, charts and Wrapped-style recaps.

### Cited Findings
- **NYPL Labs "Generative eBook Covers" (2014)**: each title character maps to a PETSCII glyph, and colors are seeded by the combined length of title and author. Code is in Processing and iOS. — [NYPL blog](https://www.nypl.org/blog/2014/09/03/generative-ebook-covers); [FlowingData](https://flowingdata.com/2014/09/10/generative-book-covers/)
- **variablestudio generative covers**: a Node.js generator taking title, author, pages, sections and year, and outputting SVG (for Biblioteka Otwartej Nauki). — [GitHub](https://github.com/variablestudio/var-17006-generative-covers)
- **runemadsen/generative-book-cover**: Processing + JBox2D. — [GitHub](https://github.com/runemadsen/generative-book-cover)
- **racovimge**: a Python placeholder-cover generator. Whether it is seeded from the title is unverified. — [PyPI](https://pypi.org/project/racovimge)
- **golanlevin/generative_covers**: a curated resource on large-run books with generative covers. — [GitHub](https://github.com/golanlevin/generative_covers)
- **Fable**: daily reading streak with reminders, editable past streaks, a home-screen widget, and a Spotify-Wrapped-style year recap. — [Tales of Belle, 2025-09-11](https://talesofbelle.com/2025/09/11/goodreads-vs-storygraph-vs-fable/); [Nonsense and Lit, 2025-11-12](https://nonsenseandlit.co.uk/2025/11/12/book-trackers-reviewed/). A 2026 review says Fable was acquired by Scribd in June 2025. — [Screvi](https://screvi.com/blog/best-book-tracking-apps-2026) (single source, not cross-checked)
- **StoryGraph**: widely described as having the strongest stats (charts, genre and mood breakdowns), plus current and longest streak counting one page or one minute per day, and a Reading Wrap-Up with a mood map and monthly breakdown. — [Bookends](https://bookends.app/blog/best-reading-apps-2025/); [Wikipedia](https://en.wikipedia.org/wiki/The_StoryGraph); [StoryGraph stats page](https://app.thestorygraph.com/stats/pages_and_places)
- **Hardcover** has an open feature request for reading streaks. — [Hardcover roadmap](https://roadmap.hardcover.app/feature-requests/posts/reading-streaks)

### Inferences
- **Procedural covers**: hash the title and author (for example FNV-1a or cyrb53 in JS, with no dependency) to seed a palette and pattern. Render either as a small fragment shader on a quad (shelf and resume card) or as SVG or canvas (DOM fallback, accessible). This keeps everything local; no cover fetch is needed, which suits local-first privacy. Complexity: low. Performance: negligible if the result is cached to a texture or image once per book.
- **3D progress**: a book object whose page block visibly thins on the unread side as progress goes from 0 to 1 is a natural, deterministic progress display. It suits the resume card. Complexity: low to medium.
- **Stats worlds** (a tree that grows a branch per finished book, a constellation where each finished book is a star positioned by a hash, a shelf that fills): these belong on the library or stats surface only. They must be deterministic and driven by measured totals, not variable-ratio rewards, per AGENTS.md. Use instanced meshes (one draw call for N stars or leaves). Complexity: medium. Performance: low with instancing and `frameloop="demand"`.
- Since no major competitor ships 3D stats, this would be distinctive, but there is also no reception data to show users want it. It should be opt-in.

### Gaps
- No open-source "reading garden" or "book constellation" R3F project was found; searches for a garden feature in Fable, StoryGraph and Readwise returned nothing.
- Readwise Reader stats and visual features were not covered by search results.
- No source shows Kindle, Kobo or Libby shipping 3D library or stats visuals (not searched in depth; treat as unknown).

## 4. Ambient reading environments, achievement reveals, chapter moments

### Takeaway
Rain-on-glass is well covered by shaders: BigWings' "Heartfelt" Shadertoy and three.js ports. drei provides `Sparkles` (dust motes) and `Float`, with demand-frameloop support. Fireplace, day/night lighting, and 3D badge-reveal implementations specific to reading apps were not found in this pass.

### Cited Findings
- **BigWings "Heartfelt" (Shadertoy)**: foggy glass with drops cutting trails through the fog; rain amount is controllable. The original is licensed CC BY-NC-SA 3.0, which forbids commercial use without permission. — [Shadertoy "Heartfelt Copy"](https://www.shadertoy.com/view/mddyDf); derivative "Rain on a Window" — [Shadertoy](https://www.shadertoy.com/view/WfdyRX)
- **Three.js ports and approaches**: pailhead/rainDropletShader (three.js GLSL), and greentec's blog on porting Heartfelt-style drops to three.js. The blog notes that `round` is not supported in three.js fragment shaders without care. — [GitHub](https://github.com/pailhead/rainDropletShader); [greentec blog](https://greentec.github.io/rain-drops-en/)
- **Alternative**: a raindrop window material built with `MeshPhysicalMaterial` transmission. — [three.js forum](https://discourse.threejs.org/t/realistic-raindrop-covered-window-pane-material-implementation/58076). Transmission is expensive on mobile (inferred, not measured).
- **drei `Sparkles`**: "floating, glowing particles", with props `count` (default 100) and `speed` (default 1), and custom shaders allowed. — [drei docs](https://drei.docs.pmnd.rs/staging/sparkles)
- **drei `Float`**: makes contents hover. With `frameloop="demand"`, set `autoInvalidate` so it renders while active. — [drei docs](https://drei.docs.pmnd.rs/staging/float)
- **R3F version**: @react-three/fiber@9 targets React 19, and v8 targets React 18. — [R3F readme](https://cdn.jsdelivr.net/npm/@react-three/fiber@9.6.1/readme.md)
- **Wawa Sensei** also publishes a Wiggle Bones + R3F tutorial (secondary motion) and wawa-vfx (a VFX engine for Three.js and R3F). Both are useful for badge or particle reveals. — [Wiggle Bones tutorial](https://wawasensei.dev/tuto/wiggle-bones-threejs-library-react-three-fiber); [wawa-vfx](https://gittrend.io/repo/wass08/wawa-vfx) (aggregator page; the repo was not fetched)

### Inferences
- **Ambient layer** (Bookflow already has a raw Three.js ambient background):
  - **Paper grain and vignette**: a static noise texture or tiny fragment shader. Lowest cost, and can stay on in reader mode if very subtle.
  - **Dust motes**: `Sparkles`-style points, about 50 to 100. Low cost, but continuous animation forces continuous rendering, so it should be off under `prefers-reduced-motion` and paused when the tab is hidden.
  - **Rain on window**: a single full-screen fragment shader, medium cost (per-pixel layered noise is heavy on low-end mobile). Render at reduced resolution (DPR 0.5 to 1) and cap at 30 fps. Write it from scratch or use a permissively licensed port; Heartfelt itself is NC-licensed.
  - **Day/night lighting from local time**: uniform-driven color grading of the ambient scene based on `new Date()`. No network needed, negligible cost.
- **Achievement reveals**: a coin or medal mesh with a procedural emblem, spun once with a GSAP or Framer timeline and `Float` idle. Must be opt-in, non-blocking, skippable, and replaced by a static image under reduced motion. Complexity: low to medium.
- **Session recap scene**: a short camera move over the shelf highlighting the book just read, with the page block thinning to show progress. Reuses the shelf assets.
- **Chapter transition**: an opt-in fragment-shader curl or dissolve between DOM snapshots (see Section 2). It must never delay focus or text availability.
- **Performance baseline for all of these**: `frameloop="demand"`, capped DPR on mobile, dispose on unmount, lazy route-level import, a DOM fallback when WebGL is unavailable, and reduced motion disabling animation. book-flip demonstrates most of this pattern.

### Gaps
- No WebGL fireplace implementation was found or verified.
- No reading-app-specific 3D badge or achievement reveal examples were found. Commercial apps (Kindle, Kobo, Apple Books reading goals) were not verified to use 3D for awards.
- drei `PerformanceMonitor` and `MeshTransmissionMaterial` docs did not surface; their mobile guidance is unverified.
- No Awwwards or FWA reading-app case studies were found in this pass.
