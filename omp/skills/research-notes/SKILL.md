---
name: research-notes
description: Build a single-file HTML research notebook where every claim carries a graded footnote and the page counts its own unproven assumptions. Monospace print aesthetic, dashed widget frames, step/toggle/slider interactions for numbers nobody has measured yet. Use for working notes, feasibility write-ups, technical investigations, architecture decision records, spike reports, competitive teardowns, or any brainstorming space the user wants to keep iterating on and hand back.
---

# Research notes

Produces one self-contained `.html` file: no build step, no network, no fonts to fetch. It opens
by double-click and it still works in five years.

The point is not that it looks like a document. The point is that **it cannot hide what it does not
know.** Every factual sentence carries a reference graded by evidence strength, and a panel at the
top counts the split. If the conclusion rests on guesses, the page says so before the reader
reaches the conclusion.

## Start here

Copy `skill://research-notes/assets/notebook.html` and replace the content. It is a working file
with the whole engine already in it: footnote system, integrity panel, widget frame, stepper,
persistence, export. Do not rebuild any of that from scratch.

Then read `skill://research-notes/reference/verify.md` before you claim it works. Those checks
caught real bugs every time this was built.

## The evidence contract

This is the part that matters. Everything else is presentation.

Every reference is one entry in the `NOTES` object, keyed by a short slug, with a `kind`:

| kind | means | colour |
|---|---|---|
| `source` | a file, repo or artifact you actually read | green |
| `doc` | published documentation, spec or vendor benchmark | green |
| `inference` | reasoned from cited facts, not directly tested | blue |
| `assumption` | nobody has measured this | amber |

Rules that are not negotiable:

- **Cite in the prose, never hand-number.** Write `<span data-fn="key"></span>` after the claim.
  Numbering is assigned at load in document order. Reordering sections can never break it.
- **One key, many citations.** Reusing a key produces one reference entry with multiple backlinks.
- **Grade honestly.** If you reasoned it, it is `inference`, however confident you feel. If you
  estimated it, it is `assumption`. Marking a guess as `source` is the only way to actually fail
  at this.
- **Put the caveat inside the reference.** When you did not read something, say so in the
  reference text: `"acquisition site unread"`, `"causal attribution unverified"`,
  `"estimate, not counted against a real tree"`. That is where a reader looks for the weakness.
- **Unknown numbers become inputs, not prose.** If the argument depends on a quantity nobody has
  measured, put it on a slider and let the reader find where the conclusion breaks. Never write a
  plausible number into a sentence.

The integrity panel derives itself. Do not hand-write the counts.

## Voice

Write like an engineer thinking on paper, not like a vendor.

- **Plain-language section headings, often questions.** "Why the frame is the expensive part",
  "Can we rebuild the frame somewhere else?", "What would kill this", "Where we ended up". Not
  "Overview", "Architecture", "Considerations".
- **Lead with the conclusion, then the evidence.**
- **State the unresolved thing prominently**, usually in the standfirst and again at the end.
- **Correct your own earlier claims in the text.** A visible "Correcting an earlier estimate. I
  said X. That was wrong, here is why" is worth more than a silently fixed number.
- **End with "Where we ended up"**: what holds, what does not, and the single next action.
- No em-dashes. No emoji. Restructure the sentence instead of swapping in a comma.

## Layout

- **Prose is prose.** Never wrap paragraphs in cards. The only boxed element is the widget frame.
- **One repeated component**: a 1px dashed frame, `border-radius: 2px`, an uppercase label bar on
  top, body, and an optional footer with caption, counter and controls. Every interactive or
  tabular block uses it. Nothing else gets a border.
- **Vary the blocks.** A risk register, a reference list and a stepper all use the frame, but their
  interiors should not look alike.
- Content column around 1000px. Generous space between sections.

## Interaction budget

Three verbs only: **step through**, **toggle between**, **drag**.

Interactivity must answer a question the reader is already asking. A stepper earns its place when a
pipeline has stages worth separating. A slider earns its place when the number is genuinely
unknown. Do not animate, do not autoplay, do not add a control that only demonstrates that controls
exist.

## Motion

Subtle motion is required, not optional. It is what makes the page feel like an instrument rather
than a printout. But every animation must explain a state change: **if you cannot name what just
changed and where, delete it.**

Two easing tokens, both pure ease-out. No bounce, no elastic, no spring:

```css
--ease:      cubic-bezier(0.22, 1, 0.36, 1);
--ease-slow: cubic-bezier(0.16, 1, 0.3, 1);
```

Keep every rule in one `/* motion */` block at the end of the stylesheet so the whole motion budget
is auditable in one place.

What earns motion, and the question each one answers:

| moment | motion | the question |
|---|---|---|
| jump to a reference or backlink | `landflash` keyframe, ~1200ms decay | where did I land |
| integrity bar, first paint | width 0 to N%, ~760ms | the evidence split IS the thesis |
| a computed cell changes | `bump` keyframe, ~420ms | that number just moved |
| stepper advances | SVG fill/stroke plus `scaleX` | which stage, and how costly |
| highlight weak claims | staggered in document order, capped | where do the guesses cluster |
| popover, toast | fade plus 4px rise | it arrived, it is not part of the page |

### Craft rules that are easy to get wrong

- **A flash needs a keyframe, not a transition.** The highlight must be fully on immediately and
  then decay; a transition-in gets cancelled by the class removal and barely renders. Retrigger
  with `el.classList.remove(c); void el.offsetWidth; el.classList.add(c)` and clean up on
  `animationend`.
- **Fade out without leaving a ghost hit target.** Step `visibility` instead of animating it:
  `transition: opacity 150ms var(--ease), visibility 0s linear 150ms` when hidden, and
  `visibility 0s` when shown.
- **A 0-to-N reveal needs two frames, and a timeout.** Render at zero, then
  `requestAnimationFrame(function(){ requestAnimationFrame(paint); })`, because one frame is not
  reliably enough for the transition to resolve. Then **always add `setTimeout(paint, 200)` behind
  an idempotency guard**: rAF is starved in headless capture, background tabs and print, and
  without the fallback the bar sits at zero forever, silently hiding the page's headline number.
  Measured: zero rAF callbacks in 600ms under headless Chromium.
- **Animate `transform`, never `width`, `height` or `top`.** In SVG that means
  `transform-box: fill-box; transform-origin: left center` with `scaleX()`.
- **Cap staggers.** `Math.min(i * 9, 300)` keeps the sweep bounded no matter how many items exist.

### Reduced motion is two mechanisms

The CSS media query collapses durations, but a JS-driven reveal must paint its final state
directly:

```js
var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (REDUCED) paint(); else requestAnimationFrame(function(){ requestAnimationFrame(paint); });
```

Without the JS branch the bar starts at zero and then animates in 1ms, which reads as a flicker
rather than as a reveal.

Never: autoplay, looping, entrance animations on sections, or anything that delays reading.

## Visual system

Encoded in the template. Summary in case you deviate:

- **Monospace everywhere**, including body prose. This is the signature; do not pair it with a sans.
- White background, `#1a1a1a` ink, `#334155` headings, slate borders.
- `h2`: uppercase, `letter-spacing: 0.04em`, `display: inline-block`, `border-bottom: 1px dashed`.
- Colour carries meaning only: evidence grade, and semantics inside diagrams. No decorative colour.
- **Muted text is `#64748b` or darker.** Slate-400 `#94a3b8` is 2.6:1 on white and fails. Use it
  for hairlines and borders, never for text.
- Diagrams are inline SVG generated by JS in the same monospace, thin slate strokes, uppercase
  labels. No image files, no chart library.

## Anti-patterns

- A dashboard. This is a document that happens to compute.
- Dark mode by reflex. White is right for a reading artifact that sits next to a terminal.
- Cards around prose, nested cards, or a card grid of equal tiles.
- Numbered section eyebrows (`01 / 02 / 03`) as scaffolding.
- Stating a number you did not measure without grading it `assumption`.
- An integrity panel with hand-written counts.
- Gradient text, glassmorphism, side-stripe borders on callouts.

## Finishing

- Save to the working directory unless told otherwise, and **tell the user whether the file is
  gitignored**, since these usually should not land in a product repo.
- Run every check in `reference/verify.md` and report the numbers, not a claim of success.
- The export button emits markdown including the full reference list, so the user can paste the
  state back into a conversation and continue. Keep that working.
