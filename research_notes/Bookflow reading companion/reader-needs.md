# Reading assistant user needs

## When should the companion enter the reading flow?

### Takeaway

Treat the Lens as help at a specific reading impasse. Let the reader summon a small, dismissible window with a visible passage and preserve the reading position both on exit and during asynchronous requests.

### Cited Findings

- Amershi et al. recommend contextually timed services, efficient invocation and dismissal, correction, and limiting the service in uncertain situations. The guidelines cover general human–AI interaction and were evaluated by practitioners over 20 products. [CHI 2019 paper](https://doi.org/10.1145/3290605.3300233)
- Adobe's Acrobat Assistant opens on request, accepts a suggested or typed question, and lets readers jump to the cited section from an answer. Google likewise documents user-selectable sources and citations that return to an exact quote in its notebook product. These are documented product interaction patterns rather than evidence of impact on comprehension. [Adobe Acrobat](https://helpx.adobe.com/acrobat/desktop/use-acrobat-ai/generative-ai-features/ai-get-answers.html) [Gemini Notebook](https://support.google.com/gemininotebook/answer/16179559?hl=en)
- Bookflow already requires local-first book text, explicit session consent and a bounded Lens passage. It specifies a reading focus rail and requires the Lens to fit inside the viewport at narrow widths. [Bookflow AGENTS.md](../../AGENTS.md#reader-experience-rules)

### Inferences

- Keep the normal PDF reading view quiet. A text selection may offer a Lens action without opening a panel or starting inference. A small launcher or keyboard command provides a deliberate alternate route. For readers who cannot reliably select with a pointer, offer a clear action to use the focused paragraph, and keep any remote send gated on an explicit context choice and consent.
- Show what the assistant is looking at before the answer. Pin the selected excerpt until the reader explicitly replaces it. Changing scroll position should not retarget an in-flight answer or trigger a network request. One clear close action and Escape should restore the invoking control or current paragraph and preserve the reading position.
- Use a static wizard portrait and calm window treatment to make invocation recognizable. During a request, let the reader cancel. Announce completion once rather than announcing every streamed token, and do not use progress indicators that imply certainty or time remaining without evidence.
- Make a citation a verifiable reader anchor. Use a real PDF page label only when the import pipeline can verify its provenance. Otherwise label the source as the selected passage or chapter using actual metadata. Jumping to source can collapse the card and leave the reader in context. No fabricated pages, notes, cross-document links or uncited world knowledge.

### Gaps

- No Bookflow user study, screen-reader session or naturalistic reading trace establishes an optimal launcher location, dialog persistence, or effect on comprehension. Test a document-first reading task with keyboard users, readers using large text and unfamiliar language, and returning readers.

## Which reading tools are worth the interruption?

### Takeaway

Lead with simple, passage-scoped help. Distinguish an exact excerpt from generated explanation. Offer active recall on demand and keep the original text within easy reach.

### Cited Findings

- W3C COGA supplemental guidance calls for common words, short sentences and short content blocks, literal language, and a clear summary where material is complex or long. It documents how simple syntax can help some people with dyslexia, language impairment or memory impairment. [W3C COGA](https://www.w3.org/TR/coga-usable/#use-clear-and-understandable-content)
- Roediger and Karpicke used educational prose and found initial free recall promoted delayed retention relative to additional study, while additional study helped the immediate test. This supports an optional recall prompt with an answer reveal, rather than a claim that AI summaries increase retention. [Psychological Science study](https://doi.org/10.1111/j.1467-9280.2006.01693.x)
- In a high-school math field experiment, Bastani et al. found that the general chat group's unassisted exam performance was 17% below control and that the guarded tutor largely mitigated that decline. This is evidence that the mode of assistance can change later outcomes in math, not a measured result for PDF reading. [PNAS field experiment](https://doi.org/10.1073/pnas.2422633122)
- Adobe's own disclosures say citations can point to irrelevant sections and require user review. Citation presence alone does not establish support. [Adobe disclosures](https://helpx.adobe.com/acrobat/desktop/use-acrobat-ai/understand-usage-policies/user-disclosures.html/issue/298)

### Inferences

- An unfamiliar or second-language reader benefits from Explain and Define in plain language while keeping key original terms. A time-constrained reader wants a quick Main point. Ask covers an expert query about a specific inference or term. Keep only the most useful actions in the first row. Optional scope preview or answer expansion can handle detail.
- A learner can choose one Recall question and try it before seeing an answer or a source sentence. Avoid unsolicited quizzes, compulsory tasks, scoring animations and assistant-generated recaps during uninterrupted reading.
- A fiction reader may ask for a quick reminder without spoilers. Default to the selected passage or a precisely labeled previously read context the reader expressly requested. Stop at the selection if the answer depends on future pages.
- Keep an offline option meaningful. An extractive mode can surface exact phrases or key sentences with a truthful label and an explicit prompt to select another passage when needed. Do not present extraction as semantic understanding or fabricate definitions from the phrase alone. If a sensitive document or cloud failure makes remote help unavailable, leave the original text, local option, and query available.
- For scanned pages, OCR text quality constrains what the assistant can ground. If reliable excerpt text is missing or garbled, ask for a readable selection. Avoid inventing figures, tables, page references or nearby paragraphs from absent input.

### Gaps

- No sourced study here evaluates Bookflow's specific commands or compares assistant phrasing lengths. Track source verification and ability to continue reading in usability sessions before claiming a learning gain.
- Remote answer quality varies with model, extraction and prompt. A mocked suite can test consent, cancellation and output contracts only. Compare actual anonymized public-domain passages and their expected support before claiming semantic reliability.

## How does a floating card serve different readers and devices?

### Takeaway

Offer a compact, keyboard-operable utility window with a stable reading anchor. Keep desktop repositioning optional and use a viewport-bounded surface on narrow screens.

### Cited Findings

- WCAG 2.2 requires a single-pointer alternative for functionality involving drag (2.5.7), keyboard operability (2.1.1), no complete occlusion of the focused component (2.4.11), target sizing subject to explicit exceptions (2.5.8), and reflow at a 320 CSS pixel equivalent (1.4.10). These are separate checks. Arrow keys alone do not satisfy the single-pointer alternative to drag. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- The COGA user research discusses the value of readable spacing, clear language, and supporting a variety of reading strategies and assistive technologies. [W3C COGA user research](https://www.w3.org/TR/coga-user-research/)
- Bookflow's test expectations distinguish no pre-consent egress and viewport geometry at 320px, 390px and desktop. Existing reader UX rules require reduced-motion support and accessible control names. [Bookflow AGENTS.md](../../AGENTS.md#required-verification-pipeline)

### Inferences

- Wide screen: small nonmodal card placed outside the reading column when possible, with a focusable labeled close control. If it can be moved, use explicit left/right dock or reposition buttons alongside optional drag. Keep the card rect and focused control in bounds as it expands, when reflowing, and at browser zoom.
- Touch or magnification: prefer a shallow bottom-aligned card with internal scrolling and a clear Return to text action. Reserve space for the visible mobile keyboard and safe-area inset. No horizontal scroll of the page, including with an answer containing a long URL or unbroken token. Large comfortable 44px controls align with conventions for touch even where WCAG permits smaller targets.
- Low vision or motion sensitivity: use real visible focus, clear type, sufficient contrast with and without filter, and respect reduced transparency, forced colors and reduced motion. Blur should add depth only when the text remains readable regardless of the page behind it. Keep character expression static except for directly triggered state transitions.
- Screen reader: use a meaningful card name, stable tab order, labeled controls and a concise status region. Return focus predictably. Do not make pointer drag or selection the only route, and expose quoted source text as plain accessible text.

### Gaps

- Emulation and bounding-box checks do not establish parity with VoiceOver, NVDA, or mobile keyboards. Test at least one physical touch device with an on-screen keyboard and one screen reader before claiming full accessibility.
