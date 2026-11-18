# Reading companion visual and interaction design

## Where do material and motion support reading?

### Takeaway

Treat the assistant as a utility panel for the current passage. A single soft material layer communicates that it floats above the page. A high-opacity reading surface protects the legibility of its answer and composer.

### Cited Findings

- Apple describes macOS panels as supplementary information or controls for the active document or selection and expects them to look less prominent than the main window. Popovers expose a few related tasks and should ideally leave the source control and essential content visible. [Apple HIG Panels](https://developer.apple.com/design/human-interface-guidelines/panels) [Apple HIG Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers)
- Apple reserves Liquid Glass for the functional layer, advises using it sparingly, and recommends its regular treatment where legibility or substantial text matters. The web can approximate the hierarchy with translucent chrome and a fallback. Apple documents Liquid Glass across its own platforms. [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- Apple says motion should be optional and information should not rely on motion alone. WCAG 2.2 requires a stop mechanism for nonessential movement that starts automatically, lasts beyond five seconds, and appears alongside other content. Interaction-triggered motion disabling is an AAA criterion. [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Browser support for the reduced-transparency preference is limited. Strong base contrast has to work independently of that system signal. [MDN reduced transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-transparency)

### Inferences

- Use one card border, a restrained inner highlight and one shadow. Tie its surface and ink to existing Bookflow theme tokens. A solid fallback should also take effect when blur is unsupported, transparency is reduced or forced colors are active. Test text contrast against both a blank reader and a dense page behind the card.
- An original cartoon book wizard can sit at header scale beside the Reading Lens label. Use warm editorial ink and paper colors from Bookflow. A short state transition may help connect launch and expansion. Keep the mascot still while reading and preserve all state information as visible text. Skip glow loops, parallax, bouncing and decorative motion on answer arrival.
- Present one primary action, two or three useful passage shortcuts and a visible text status. A quieter title and a larger, readable answer do more for the product than a more prominent mascot.

### Gaps

- Apple describes native materials and the source does not establish an ideal blur radius or opacity for any Bookflow theme. These need contrast checks against actual Bookflow pages.
- The sources provide guidance on motion and layering, but no controlled test compares a Bookflow wizard with a text-only Lens.

## How should the card work across input modes and viewports?

### Takeaway

Prefer a nonmodal floating card on desktop and a bottom-anchored, bounded sheet on compact screens. Keep source context and a predictable dismissal path in both modes.

### Cited Findings

- W3C explains 320 CSS px reflow and the risk of fixed elements obscuring focus. WCAG 2.2 requires a single-pointer alternative for author-defined dragging at AA, separately from keyboard operability. Its minimum target-size criterion is 24 by 24 CSS px subject to exceptions. Bookflow's 44 px target is a stronger project guideline. [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) [WCAG Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Apple advises using compact-layout sheets instead of forcing a wide-view popover into a narrow view. Its popover guidance also favors one surface at a time and preservation of work if a nonmodal surface closes automatically. [Apple HIG Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers) [Apple HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- WAI's modal pattern uses a focus trap, Escape dismissal and a logical focus return. A desktop utility that permits continued reading should not claim modality. Status messages can be announced without taking focus, including waiting, success and error. [WAI Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) [WCAG Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)

### Inferences

- On wide views, open near the selected passage when there is space and park at a viewport edge with one-tap left or right positioning if dragging remains available. Keep the card size bounded and let the body scroll internally. Restore focus to the invoking control or passage when dismissed. Keyboard focus can continue into the reader while a nonmodal panel remains open.
- At compact widths prioritize a single-column sheet with safe-area spacing and a keyboard-aware available height. Keep Close and the composer reachable while answer content scrolls. Preserve native PDF text selection and scrolling by confining gesture handling to the drag handle on layouts where drag works. Test 320 px, 390 px, zoom and with the keyboard open.
- Keep selection invocation local and collapsed until a reader asks. Avoid automatic expansion, focus changes during streaming and a duplicate launcher during interaction. Announce short lifecycle states with a polite status region. Do not make every model token a separate screen-reader announcement.
- Clear drafts and passages on document changes so a contextual tool remains scoped to its current source. Preserve a useful draft on collapse within the same otherwise unchanged reading context if the existing flow supports it.

### Gaps

- Keyboard and viewport behavior varies by browser and mobile soft keyboard. Tests at specific widths help establish those conditions and cannot establish behavior on every device.

## How can the wizard convey personality while preserving trust?

### Takeaway

Borrow the concept of a recognizable companion and use an original Bookflow identity. Keep personality in the avatar and a few task-specific labels. Ground answers in the visible passage and communicate what the assistant knows plainly.

### Cited Findings

- xAI's consumer FAQ presents variable tone, personas and wit as part of Grok's company-described experience, including an example of wizard role-play. This is a description of a product behavior and supplies no evidence that banter improves reading. [xAI Consumer FAQs](https://x.ai/legal/faq)
- The authors of the CHI 2019 human–AI guidelines recommend context-timed assistance, efficient invocation and dismissal, clear capabilities, appropriate uncertainty and sharing control with users. [Microsoft Research HAX Guidelines](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/)
- A 2024 LLM interface study found that a speech-plus-text condition increased perceived anthropomorphism and perceived information accuracy. That experiment gives reason to keep capability claims explicit when introducing personality, but it did not test a static book illustration or diagnose Bookflow behavior. [Cohn et al., Believing Anthropomorphism](https://arxiv.org/abs/2405.06079)

### Inferences

- Keep the product label Reading Lens and use an original book-and-hat illustration, distinct in silhouette and color from other assistants. Mark the art decorative if the adjacent text already identifies the assistant. An icon should never be the only indicator of a consent decision, a request state or an error.
- Use text grounded in the reader's current task. Examples include “Explain this passage,” “Show the key ideas” and “Ask about this passage.” A simple context row can show which selection is in scope. For local processing, use a label that describes the extractive result accurately. Keep remote sharing wording direct and identify the text going out before consent.
- When the source cannot support an answer, explain the limit and let the reader select more or try another question. Preserve an easy return to the original text. Do not add relationship-seeking language, assistant-generated interruptions or implied ability to see the whole PDF when only a bounded excerpt is available.

### Gaps

- No evidence establishes a preference for Grok's personality among Bookflow readers. An original art direction is a product choice. Usability checks should evaluate invocation, recovery and return to reading rather than affection for the mascot alone.
