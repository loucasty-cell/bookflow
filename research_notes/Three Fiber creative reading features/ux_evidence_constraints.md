# UX Evidence Constraints for Creative / 3D / Sound / Gamified Features in a Reading App

Scope note: research done 2026-10-10 using web search plus attempted fetches. Direct fetches of w3.org and pmc.ncbi.nlm.nih.gov failed in this environment (`getaddrinfo ENOTFOUND`), so several figures come from search-result abstracts and secondary summaries rather than full texts. Where that is the case it is flagged. Evidence strength labels: **Strong** = meta-analysis or normative standard; **Moderate** = individual controlled studies; **Weak/Anecdotal** = theses, opinion pieces, vendor blogs, forums.

## 1. Animated backgrounds, page-turn animation, and visual distraction vs. comprehension and attention

### Takeaway
Decorative, interesting-but-irrelevant material reliably hurts learning from text by a small-to-moderate amount (seductive details effect, two meta-analyses), and screen reading already carries a small comprehension penalty vs. paper that is larger for expository text and under time pressure. There is no good evidence that skeuomorphic page-turn animation improves comprehension; it may improve perceived naturalness/preference. Implication: keep the reader surface free of ambient motion; put spectacle on landing/library/stats.

### Cited Findings
- **Strong:** Rey (2012), *Educational Research Review* 7(3):216-237, meta-analysis of seductive details (39 experimental effects per one summary) found negative effects on retention (small-to-medium) and transfer (medium). Exact figures vary across secondary sources; original not read. — [ACU Inspire summary](https://inspire.acu.edu.au/articles/seductive-details); [Learning Scientists blog](https://www.learningscientists.org/blog/2019/6/20-1)
- **Strong:** Sundararajan & Adesope (2020) newer meta-analysis also finds a negative seductive-details effect, g = -0.33 (small-to-moderate). — [Learning Scientists blog](https://www.learningscientists.org/blog/2019/6/20-1); [ACU Inspire](https://inspire.acu.edu.au/articles/seductive-details)
- **Moderate (nuance):** Proposed mechanisms (working-memory overload, distraction, disrupted mental-model building) are hypotheses, and some reviews argue seductive details can be neutral or helpful when overall cognitive load is low. — [PMC6755318](https://pmc.ncbi.nlm.nih.gov/articles/PMC6755318); [Springer 2023, Instructional Science](https://link.springer.com/10.1007/s11251-023-09632-w)
- **Strong:** Delgado, Vargas, Ackerman & Salmeron (2018), "Don't throw away your printed books," *Educational Research Review* 25:23-38: 54 studies, >170,000 participants (2000-2017); overall Hedges' g = -0.21 favoring paper. Screen inferiority larger under time limits than self-paced reading, larger for expository than narrative text, and the paper advantage *increased* over 2000-2017. No significant publication bias (Egger p = .39). — [Delgado et al. 2018 PDF (uv.es)](https://www.uv.es/lasalgon/papers/Delgado%202018%20dont%20throw%20away%20your%20printed%20books.pdf); [TUM summary](https://www.edtech.tum.de/?p=2157)
- **Moderate:** 2011 quasi-experiment, 46 fourth graders: no significant comprehension difference between page-scrolling and page-by-page display. — [TOJET abstract](https://www.tojet.net/abstracts/v10i3/10311_abstract.htm)
- **Moderate/weak:** A Korean study (JIDR 2014) found page-turning e-books rated "natural" and "familiar" but lower on "complicated"; measured task time and page changes, not comprehension (only English abstract seen). — [DOI 10.21195/JIDR.2014.13.2.004](https://www.doi.org/10.21195/JIDR.2014.13.2.004)
- **Anecdotal:** Hacker News commenter reports partner usability research where users preferred a page-turn effect, while doubting it was more than novelty. — [HN thread mirror](https://grivy.duckdns.org/item?id=3555152)
- **Weak:** Wikipedia notes some studies show users prefer flip-page interfaces "under certain conditions" (cites Oh, Robinson & Lee 2013, *Computers in Human Behavior*, not read). — [Wikipedia: Flip page](https://en.wikipedia.org/wiki/Flip_page)

### Inferences
- Ambient animated or generative backgrounds behind reader text are functionally "seductive details" competing for attention; given a baseline screen penalty that is worst for expository text, they should never be default on the reader surface.
- Page-turn animation is a preference/novelty feature, not a comprehension feature. If offered, it should be opt-in, short, and fully disabled under reduced motion. Bookflow's scroll-plus-focus-rail model is not contradicted by any comprehension evidence found.
- Landing, library, and stats surfaces are not comprehension tasks, so decorative motion there carries little of this cost (accessibility and battery constraints still apply).

### Gaps
- No direct controlled study found on animated/dynamic backgrounds *behind* body text and reading comprehension in adults.
- Oh et al. (2013) and Liesaputra & Witten (2012) on page-flip interfaces were not accessed.
- Original Rey (2012) effect sizes not verified from full text.

## 2. Ambient sound, background music, and noise; individual differences (ADHD, introversion)

### Takeaway
Background sound of all kinds has a small, reliable negative effect on reading; intelligible speech and lyrics are worst, fast/loud instrumental music is worse than slow/quiet. White/pink noise shows a small benefit for people with ADHD symptoms but can distract others; brown noise is untested. Introverts appear more harmed by music than extraverts. Soundscapes belong as opt-in, off by default, instrumental/non-lyrical, with volume control.

### Cited Findings
- **Strong:** Vasilev, Kirkby & Angele (2018) Bayesian meta-analysis of 65 studies on auditory distraction during reading: background noise, speech, and music each have a small but reliable detrimental effect; music g approx. -0.19 (figure from search summaries; full text fetch failed). Intelligible speech and lyrical music cause the largest disruption; instrumental music less. Disruption did not generally differ between adults and children. — [Bournemouth eprint](https://eprints.bournemouth.ac.uk/29995/); [PMC6139986](https://pmc.ncbi.nlm.nih.gov/articles/PMC6139986/)
- **Strong (older, conflicting):** Kampfe et al. (2011) meta-analysis found near-null overall effect of background music on cognition, attributed to positive and negative effects cancelling. — reported via [PMC6139986](https://pmc.ncbi.nlm.nih.gov/articles/PMC6139986/) search summary
- **Moderate:** Thompson, Schellenberg & Letnic (2012): instrumental background music most likely to disrupt reading comprehension when fast and loud. — [Thompson et al. 2012 PDF](https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/ThompsonEtAl2012.pdf)
- **Strong-ish (small pooled sample):** Nigg et al. (2024), *JAACAP*, meta-analysis of 13 studies, 335 participants: white/pink noise gave a small significant benefit on task performance for ADHD/ADHD-symptom participants (g = 0.249), smaller than medication effects; no brown-noise studies existed; noise may distract people without ADHD symptoms; lab settings only; intensity not examined. — [PsyPost summary](https://www.psypost.org/white-and-pink-noise-show-promise-in-enhancing-attention-in-those-with-adhd/); [OHSU record](https://ohsu.elsevierpure.com/en/publications/systematic-review-and-meta-analysis-do-white-noise-or-pink-noise-); [BPS Research Digest](https://www.bps.org.uk/research-digest/does-pink-noise-really-help-you-focus)
- **Moderate (small samples):** Furnham & Strbac (2002), 38 introverts + 38 extraverts: music and office noise lowered performance; personality x sound interaction significant only for reading comprehension (introverts worse). — [Furnham & Strbac 2002 PDF](https://www.Gwern.net/doc/music/music-distraction/2002-furnham.pdf)
- **Moderate (very small):** Furnham & Bradley (1997), n = 10 per group: introverts performed worse on reading comprehension with music. — [Furnham & Bradley 1997 PDF](https://www.Gwern.net/doc/music/music-distraction/1997-furnham.pdf)
- **Mixed:** Furnham & Allass (1999): music complexity x personality interaction significant on 3 of 4 tasks, but not reading comprehension. — [Furnham & Allass 1999 PDF](https://www.Gwern.net/doc/music/music-distraction/1999-furnham-2.pdf)
- **Anecdotal/commercial caution:** Brain.fm blog posts on music for reading/brown noise are vendor content with a commercial interest. — [Brain.fm blog](https://www.brain.fm/blog/music-for-reading-comprehension)

### Inferences
- Any soundscape should default to off, ship only non-lyrical/non-speech audio, default to low volume, and never autoplay (autoplay also conflicts with browser autoplay policies and WCAG 1.4.2 Audio Control, not researched here).
- A white/pink-noise option is the best-supported "focus sound" for a subset (ADHD) but is not a universal benefit; framing should avoid efficacy claims, and "brown noise for focus" has no meta-analytic support.
- Sound has no rendering/GPU cost comparable to WebGL, so it is cheaper than visual ambience, but still a distraction cost on the reader surface.

### Gaps
- No direct studies found on nature soundscapes and long-form book reading.
- Vasilev et al. per-condition effect sizes not verified from full text.

## 3. Accessibility: WCAG 2.2 animation criteria, vestibular disorders, photosensitivity, dyslexia

### Takeaway
User-triggered non-essential motion must be disableable (SC 2.3.3, AAA; technique: honor `prefers-reduced-motion` or an in-app toggle); auto-playing motion lasting >5 s must be pausable (SC 2.2.2, Level A). Vestibular dysfunction is common in older adults. Dyslexia-specific fonts (OpenDyslexic) show no readability benefit in eye-tracking work, so "dyslexia-friendly" features should be offered as preferences, not efficacy claims.

### Cited Findings
- **Normative:** SC 2.3.3 Animation from Interactions is Level AAA; covers motion triggered by user interaction; exception for essential motion; sufficient techniques C39 (CSS `prefers-reduced-motion`), SCR40 (same in JS), and a user preference control. — [W3C Understanding 2.3.3 (editor's draft)](https://w3c.github.io/wcag/understanding/animation-from-interactions.html); [SCR40 technique](https://w3c.github.io/wcag/techniques/client-side-script/SCR40); [Deque 2.3.3](https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions)
- **Normative:** Auto-playing motion falls under SC 2.2.2 Pause, Stop, Hide (Level A). — [W3C Understanding 2.3.3](https://w3c.github.io/wcag/understanding/animation-from-interactions.html) (cross-reference). The 2.2.2 requirement that moving/blinking/scrolling content which starts automatically, lasts more than five seconds, and is presented in parallel with other content must have a pause/stop/hide mechanism is from the published criterion; direct fetch of [W3C Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) failed in this session (ENOTFOUND), so wording is not re-verified here.
- **Normative (not re-verified this session):** SC 2.3.1 Three Flashes or Below Threshold (Level A) prohibits content flashing more than three times per second above thresholds; relevant to generative visuals and achievement reveals. — [W3C Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) (fetch not attempted successfully; treat as needing verification)
- **Moderate:** Deque cautions that however animation is reduced, it must not block access to content. — [Deque 2.3.3](https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions)
- **Strong (epidemiology):** Agrawal et al. (2009), *Arch Intern Med* 169:938-44, NHANES 2001-2004: 35.4% of US adults aged 40+ (approx. 69 million) had vestibular dysfunction by modified Romberg test; 18.5% in 40s rising to 85% at 80+. Other national surveys report far lower figures (Korea 1.84%) due to differing protocols. Not a measure of motion sensitivity on screens specifically. — [PubMed 19468085](https://pubmed.ncbi.nlm.nih.gov/19468085); [PMC4069154](https://pmc.ncbi.nlm.nih.gov/articles/PMC4069154); [MDedge](https://mdedge.com/content/vestibular-dysfunction-common-after-age-40)
- **Moderate:** Rello & Baeza-Yates (2013) "Good Fonts for Dyslexia," 48 participants with dyslexia, eye tracking: OpenDyslexic gave no better (or worse) readability than standard fonts; participants preferred Verdana/Helvetica; preference barely correlated with performance; sans-serif, monospaced and roman fonts performed better than italic. — [Wikipedia: OpenDyslexic](https://en.wikipedia.org/wiki/OpenDyslexic); [BYU Editing Research](https://editingresearch.byu.edu/2020/05/28/which-fonts-are-best-for-dyslexia/)
- **Moderate:** Wery & Diliberto (2017), children with dyslexia: OpenDyslexic did not improve reading rate or accuracy. — [PMC5629233](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5629233/); [Springer](https://link.springer.com/article/10.1007/s11881-016-0127-1)

### Inferences
- Bookflow's existing rules (reduced-motion respect, calm default) already align with SC 2.3.3/2.2.2. New 3D/ambient features need: a global in-app "motion" toggle in addition to the OS query (Gx technique), no auto-playing loop >5 s without pause, no flashing in achievement reveals, and camera-motion/parallax treated as vestibular-risk.
- Keep OpenDyslexic/Atkinson as preference options but do not market them as comprehension aids.

### Gaps
- No quantitative data found on the share of web users who enable `prefers-reduced-motion`.
- Bionic Reading efficacy was not researched in this pass.

## 4. Gamification in reading apps (streaks, badges, goals)

### Takeaway
Gamification shows small positive average effects on learning, motivation, and behavior, but motivational/behavioral effects are unstable in rigorous studies, and expected tangible rewards can undermine intrinsic motivation (contested literature). Evidence on "streak anxiety" is qualitative and anecdotal, but consistent in direction. For an intrinsically motivated activity like leisure reading, deterministic, informational progress is defensible; loss-framed streaks and variable rewards are the risky mechanics.

### Cited Findings
- **Strong:** Sailer & Homner (2020), *Educational Psychology Review* 32:77-112, meta-analysis: small positive effects on cognitive (g = .49), motivational (g = .36), and behavioral (g = .25) outcomes; cognitive effect robust in rigorous studies, motivational and behavioral less stable. — [Springer](https://link.springer.com/article/10.1007/s10648-019-09498-w); [Augsburg OPUS](https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056)
- **Weak (heterogeneous):** A 2026 higher-education meta-analysis reports d = 1.12 across 22 studies but with I^2 = 98.84%. — [SAGE Open 2026](https://journals.sagepub.com/doi/10.1177/21582440261421375)
- **Strong but contested:** Deci, Koestner & Ryan (1999), *Psychological Bulletin* 125:627-668: expected tangible rewards undermine intrinsic motivation (supports cognitive evaluation theory). Cameron & Pierce camp reached nearly opposite conclusions on overlapping studies. — [Deci, Koestner & Ryan 2001 PDF](https://www.selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf); [Cameron, Banko & Pierce 2001 (Springer)](https://link.springer.com/doi/10.1007/BF03392017); [Wikipedia: Overjustification effect](https://en.wikipedia.org/wiki/Overjustification_effect)
- **Weak (qualitative):** Indonesian undergraduate study of Duolingo users: streaks perceived as most effective for vocabulary retention, but competitive features sometimes caused pressure/anxiety around protecting rankings and streaks. — [UKWMS repository](https://repositori.ukwms.ac.id/47113/6/BAB%205.pdf)
- **Weak (qualitative):** Utrecht master's thesis analyzing Reddit discussions of Duolingo streaks/leaderboards: both benefits and pressures. — [Utrecht thesis](https://studenttheses.uu.nl/handle/20.500.12932/48993?show=full)
- **Anecdotal/opinion:** "Streak creep" essay arguing streaks drain intrinsic enjoyment; Android Authority column on XP boosts turning streaks into anxiety. — [The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification); [Android Authority](https://androidauthority.com/duolingo-xp-boost-ux-trap-3674572)
- **Unverified vendor claim:** StriveCloud says a Duolingo streak wager raised day-7 retention 14%, no source given. — [StriveCloud blog](https://www.strivecloud.io/blog/blog-gamification-examples-boost-user-retention-duolingo)
- **Feature note:** StoryGraph offers book or page goals and optional user-created reading challenges; Goodreads offers a yearly book-count goal. — [Astropad comparison](https://astropad.com/blog/storygraph-vs-goodreads/); [Glasgow Guardian](https://glasgowguardian.co.uk/2021/11/17/why-you-should-use-the-storygraph-instead-of-goodreads/)

### Inferences
- Bookflow's "deterministic progress, opt-in rewards" rule is consistent with the evidence: informational feedback (pages, time, completion) is low-risk; expected tangible-style rewards and loss-framed streaks carry overjustification and anxiety risk.
- Achievement reveals with 3D/animation fit best on stats/library surfaces, triggered after a session ends (not mid-reading), with streak "forgiveness" or no-loss framing.

### Gaps
- No peer-reviewed controlled study found on streak anxiety specifically.
- No primary data found on Kindle or Apple Books reading-goal/streak features' effect on reading volume or satisfaction.
- No Reddit/HN sentiment threads specifically on reading-challenge pressure were retrieved.

## 5. Performance and battery cost of continuous WebGL/canvas rendering; abandonment

### Takeaway
React Three Fiber's default loop renders continuously (~60 fps), which its own docs identify as the main battery drain; `frameloop="demand"` with `invalidate()` renders only on change. Load-time abandonment data is old but consistent: slow mobile loads lose users. No measured mobile battery benchmarks were found.

### Cited Findings
- **Authoritative docs:** R3F docs: three.js apps typically run a game loop 60 times a second and R3F is no different; this is what "generally drains batteries the most and makes fans spin up"; `frameloop="demand"` renders when props change; mutations outside React (e.g., camera controls) need `invalidate()`. — [R3F Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- **Anecdotal:** Some third-party components may not support demand mode. — [three.js Discourse](https://discourse.threejs.org/t/pmndrs-uikit-ui-for-threejs/62138)
- **Anecdotal:** Blog post describing continuous idle rendering as a common battery bug in web apps. — [campedersen.com "The $6 Bug"](https://campedersen.com/idle)
- **Moderate (old, industry):** Google "The Need for Mobile Speed" (2016): 53% of mobile site visits abandoned if load takes >3 s; based on approx. 10,000-11,800 mobile homepage domains on fast 3G, first view only. Original report not accessed; sample-size descriptions differ. — [Marketing Dive](https://www.marketingdive.com/news/google-53-of-mobile-users-abandon-sites-that-take-over-3-seconds-to-load/426070/); [MarketingCharts](https://www.marketingcharts.com/digital-70669); [ARF](https://thearf.org/category/news-you-can-use/many-visitors-abandon-mobile-sites-if-load-time-tops-3-seconds-via-mediapost-source-google/)

### Inferences
- Any 3D scene should use `frameloop="demand"`, pause when the tab is hidden or the scene is offscreen, be lazy-loaded off the critical path (Bookflow's build already warns about a large Three.js chunk per AGENTS.md), and never run behind the reader text.
- A static poster/CSS fallback should be the default on low-end devices and under reduced motion.

### Gaps
- No measured battery-drain numbers (mAh or %/hour) for continuous WebGL on mobile were found.
- No recent (post-2020) primary abandonment study was retrieved; the 53% figure is a decade old.

## 6. What users praise vs. dismiss as gimmicks in premium reading apps

### Takeaway
Little high-quality evidence was retrieved. Available signals suggest page-turn effects are liked for familiarity but suspected of novelty value, and reading-tracker users value flexible goals (pages or books) and optional challenges. Treat this area as largely unresearched.

### Cited Findings
- **Anecdotal:** HN commenter: users preferred page-turn effect in partner research, likely novelty. — [HN thread mirror](https://grivy.duckdns.org/item?id=3555152)
- **Anecdotal:** Logos/Laridian forum post argues paging is easier than scrolling, no data. — [Logos community](https://community.logos.com/discussion/comment/156155)
- **Weak:** Paper-metaphor flip rated natural/familiar but more complicated. — [JIDR 2014](https://www.doi.org/10.21195/JIDR.2014.13.2.004)
- **Weak (opinion/reviews):** StoryGraph praised for page-or-book goals and optional, private-or-public challenges. — [Astropad](https://astropad.com/blog/storygraph-vs-goodreads/); [TCK Publishing review](https://www.tckpublishing.com/storygraph-review/)

### Inferences
- The low-risk "delight" pattern is customization and control (themes, typography, flexible goals) rather than spectacle; spectacle is likely appreciated once and then disabled, so it should be cheap to turn off and off by default inside the reader.

### Gaps
- No systematic analysis of app-store reviews for Kindle, Apple Books, Readwise Reader, Moon+ Reader, etc. was retrieved; Reddit/HN searches did not return relevant threads within the tool budget. A targeted review-mining pass would be needed.
