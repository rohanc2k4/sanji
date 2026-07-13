# Sanji — MASTER.md

> **Logic:** When building a specific page, first check `design-system/pages/[page-name].md`. If that file exists, its rules override this Master file. Otherwise, follow the rules below strictly.

---

**Project:** Sanji — open-source localhost executive assistant
**Generated:** 2026-05-04 via `ui-ux-pro-max-skill` v2.5.0 (`--design-system --persist`), with Sanji-specific overrides applied for fixed brand decisions (Inter / JetBrains Mono, B-layout chat shell, three named surfaces, orange tabby mascot).
**Category:** Productivity Tool · Chat-primary localhost desktop app
**Stack:** React 19 · Vite · Tailwind v4 · shadcn/ui

This document is the source of truth for tokens and surface behavior. Adjustments happen in code first, then are reflected back here in batched updates — never edit speculatively.

---

## 1. Identity

**Sanji is a friendly, focused tool, not a personality.** It lives on `localhost`, indexes the user's own markdown vault, and answers with citations. The orange tabby mascot is the only ornament — everywhere else, the UI gets out of the way and lets the user's content speak.

**Visual register.** Sit between Linear's clinical coolness and Notion's soft, paper-like calm. Warmer than Linear; denser and more deliberate than Notion. Mid-density: comfortable on a 13" laptop without feeling sparse on a 27" monitor.

**One accent only.** A muted, dusty orange that gestures toward the mascot without becoming a brand-shouting color. Used for: primary CTAs, focused state, the active chat caret, citation chips. Never used for borders, backgrounds, or large fills.

**Tone.** Conversational microcopy ("What are we figuring out today?"), but never cute outside the mascot. Errors are direct. Empty states are inviting, not whimsical.

---

## 2. Global Rules (skill-derived foundation)

The skill recommended **Flat Design** as the style register, **Warm ink + amber on cream** as the palette family, and **4/8 spacing rhythm**. Sanji adopts all three. The skill also recommended a Minimal Single Column page pattern; we override that to a **B-layout** for the chat shell because chat-primary apps need persistent sources + editor — but we keep the pattern's discipline (one primary CTA per screen, large readable type, generous whitespace) inside each column.

### 2.1 Color tokens

Palette is a warm neutral built on a slight orange undertone. Light mode is canonical; dark mode mirrors structure with shifted luminance.

**Neutrals (light)**

| Token             | Hex       | Role / Usage                                      |
| ----------------- | --------- | ------------------------------------------------- |
| `--bg-canvas`     | `#FBF8F4` | App background (cream off-white, not pure)        |
| `--bg-surface`    | `#FFFFFF` | Cards, assistant chat bubbles, editor pane        |
| `--bg-muted`      | `#F4F0EA` | Sources sidebar, secondary panes                  |
| `--bg-sunken`     | `#EDE7DE` | Code blocks, inline tool-call status, input chips |
| `--border-subtle` | `#E8E1D5` | Default 1px divider                               |
| `--border-strong` | `#D5CBB8` | Hover/focused container borders                   |
| `--fg-default`    | `#1F1B16` | Body text                                         |
| `--fg-muted`      | `#5C5448` | Secondary text, timestamps, labels                |
| `--fg-subtle`     | `#8A8170` | Placeholders, metadata, disabled                  |

**Accent — "Tabby Orange"** (skill suggested `#D97706`; muted by ~10% saturation to match brief's "doesn't shout")

| Token             | Hex       | Role / Usage                                      |
| ----------------- | --------- | ------------------------------------------------- |
| `--accent`        | `#C26A2D` | Primary CTAs, active focus ring, citation chips   |
| `--accent-hover`  | `#A95A22` | Pressed/hover for accent surfaces                 |
| `--accent-soft`   | `#F2D9C2` | Filled chip background, subtle highlight          |
| `--accent-fg`     | `#FFFFFF` | Foreground on accent surfaces                     |

**Semantic**

| Token                | Hex       | Role / Usage                       |
| -------------------- | --------- | ---------------------------------- |
| `--success`          | `#3F7A4E` | Index complete, sync ok            |
| `--success-soft`     | `#DCE8DD` | Success chip background            |
| `--warning`          | `#B17A1A` | Stale index, rate-limit close      |
| `--warning-soft`     | `#F1E3C3` | Warning chip background            |
| `--danger`           | `#A8392B` | Errors, destructive actions        |
| `--danger-soft`      | `#F0D6D1` | Error chip background              |
| `--info`             | `#3B6A86` | Tool-call status, neutral notices  |
| `--info-soft`        | `#D7E3EC` | Info chip background               |

**Dark mode** (applied via `[data-theme="dark"]`; structural mirror of light, not inverted)

| Token             | Hex       |
| ----------------- | --------- |
| `--bg-canvas`     | `#15120E` |
| `--bg-surface`    | `#1C1814` |
| `--bg-muted`      | `#221D17` |
| `--bg-sunken`     | `#2A241D` |
| `--border-subtle` | `#322B22` |
| `--border-strong` | `#473D2E` |
| `--fg-default`    | `#F0EAE0` |
| `--fg-muted`      | `#B5AB99` |
| `--fg-subtle`     | `#7E7565` |
| `--accent`        | `#E08A4E` |
| `--accent-hover`  | `#EFA168` |
| `--accent-soft`   | `#3A2A1C` |

**Color rules.**
- Never use accent for >5% of a surface's area.
- Status colors are for tool-call/system feedback, not user content highlighting.
- Borders default to `--border-subtle`; promote to `--border-strong` only on hover/focus.
- All foreground/background pairs meet WCAG AA (4.5:1 body, 3:1 large). Verify dark mode independently.

### 2.2 Typography tokens

The skill recommended Varela Round + Nunito Sans for the "soft/friendly" mood; **the brief overrides this** with Inter (UI) + JetBrains Mono (code), which is fixed.

| Family            | Stack                                                        |
| ----------------- | ------------------------------------------------------------ |
| `--font-sans`     | `"Inter", ui-sans-serif, system-ui, sans-serif`              |
| `--font-mono`     | `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace`  |

Inter is loaded with `font-feature-settings: "cv11", "ss01", "ss03"` for disambiguated `1`/`I`/`l` and tabular numerals on demand.

**Scale (rem-based, 16px root).**

| Token        | Size / Line height | Tracking  | Use                                    |
| ------------ | ------------------ | --------- | -------------------------------------- |
| `text-xs`    | 0.75 / 1.1         | +0.01em   | Metadata, timestamps, kbd hints        |
| `text-sm`    | 0.8125 / 1.4       | 0         | Secondary UI, sidebar items            |
| `text-base`  | 0.9375 / 1.55      | 0         | Body, chat messages (15px)             |
| `text-md`    | 1.0625 / 1.5       | -0.005em  | Composer, primary inputs               |
| `text-lg`    | 1.25 / 1.4         | -0.01em   | Section titles, drawer headers         |
| `text-xl`    | 1.5 / 1.3          | -0.015em  | Onboarding step titles                 |
| `text-2xl`   | 1.875 / 1.2        | -0.02em   | Hero / wizard intro                    |

**Weights.** `400` body, `500` UI labels, `600` headings, `700` reserved for accent CTAs only. Never use `300`. Never italicize UI chrome (italics are reserved for quoted markdown).

**Markdown rendering.** Body text renders at `text-base` with `max-width: 68ch`. Inline code: `--font-mono` at 0.875em, `--bg-sunken` background, 4px padding-x. Fenced blocks: 1px `--border-subtle`, no shadow.

### 2.3 Spacing tokens

4px base unit (skill-recommended 4/8 rhythm).

| Token              | px    | Use                                              |
| ------------------ | ----- | ------------------------------------------------ |
| `--space-hairline` | 1     | Dividers                                         |
| `--space-1`        | 4     | Icon-to-label, tight inline gaps                 |
| `--space-2`        | 8     | Default inline rhythm                            |
| `--space-3`        | 12    | Compact stacks (chat metadata row)               |
| `--space-4`        | 16    | Default block rhythm                             |
| `--space-5`        | 24    | Section spacing inside a pane                    |
| `--space-6`        | 32    | Pane-to-pane vertical gutters                    |
| `--space-8`        | 48    | Wizard step padding, empty-state inset           |
| `--space-12`       | 80    | Top-level layout gutters at ≥1280px              |

**Density rule.** Default touch target is 32px (compact); primary actions are 36px. Avoid 40px+ outside onboarding. (This is desktop-localhost; the skill's mobile 44pt minimum does not apply.)

**Layout grid.**
- **Chat shell:** 3-column B-layout — Sources (260px fixed) | Chat (fluid, min 480px) | Editor (40% fluid, collapsible). Below 1024px, Editor collapses to a tab.
- **Onboarding:** single centered column, max-width 560px, top-aligned at 12vh.
- **Settings drawer:** right-side overlay, 480px, full height, scrollable.

### 2.4 Radius tokens

| Token             | px  | Use                                              |
| ----------------- | --- | ------------------------------------------------ |
| `--radius-xs`     | 4   | Chips, kbd hints, tag pills                      |
| `--radius-sm`     | 6   | Inputs, small buttons, citation chips            |
| `--radius-md`     | 8   | Default — cards, dropdowns, chat bubbles         |
| `--radius-lg`     | 12  | Composer, modals, drawer top corners             |
| `--radius-xl`     | 16  | Wizard card, mascot speech bubble                |
| `--radius-full`   | 999 | Avatars, mascot frame, status dots               |

**Rule.** Never mix more than two radii in one composition. Chat bubbles use `md`; their inner code blocks use `sm`. No radius on full-bleed dividers or full-width status bars.

### 2.5 Shadow tokens

Shadows are warm-toned (orange undertone, not pure black) and used sparingly. Elevation is mostly conveyed through borders and surface contrast, not shadow stacking — consistent with the skill's Flat Design recommendation.

| Token             | Value                                                                 | Use                                  |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `--shadow-none`   | none                                                                  | Default flat surfaces                |
| `--shadow-xs`     | `0 1px 2px rgba(60, 40, 20, 0.04)`                                    | Resting cards, chat bubbles          |
| `--shadow-sm`     | `0 2px 6px rgba(60, 40, 20, 0.06), 0 1px 2px rgba(60,40,20,0.04)`     | Hovered cards, dropdown trigger      |
| `--shadow-md`     | `0 8px 24px rgba(60, 40, 20, 0.08), 0 2px 6px rgba(60,40,20,0.05)`    | Popovers, dropdowns, mascot bubble   |
| `--shadow-lg`     | `0 24px 48px rgba(60, 40, 20, 0.12), 0 8px 16px rgba(60,40,20,0.06)`  | Modals, settings drawer              |
| `--shadow-focus`  | `0 0 0 3px rgba(194, 106, 45, 0.28)`                                  | Focus ring (replaces outline)        |

**Rule.** Never compound elevation. A `--shadow-md` popover inside a `--shadow-lg` modal does not get its own shadow — borders carry it.

### 2.6 Motion tokens

The skill recommends 150–300ms for micro-interactions and respect for `prefers-reduced-motion`. Sanji formalizes this as discrete tokens.

| Token                | Value                            | Use                                         |
| -------------------- | -------------------------------- | ------------------------------------------- |
| `--ease-standard`    | `cubic-bezier(0.2, 0, 0, 1)`     | Default                                     |
| `--ease-emphasized`  | `cubic-bezier(0.3, 0, 0, 1)`     | Drawer/modal open                           |
| `--ease-exit`        | `cubic-bezier(0.4, 0, 1, 1)`     | Drawer/modal close                          |
| `--dur-instant`      | 80ms                             | Hover feedback, focus-in                    |
| `--dur-fast`         | 140ms                            | Buttons, chip toggles, popover              |
| `--dur-base`         | 200ms                            | Drawer slide, card hover lift               |
| `--dur-slow`         | 320ms                            | Wizard step transition, mascot blink loop   |
| `--dur-stream`       | n/a                              | Token streaming uses real arrival timing — never simulated typing animation |

**Rules.**
- Respect `prefers-reduced-motion: reduce` — set all durations to 0 except mascot idle blink (becomes a static frame).
- Animate opacity, transform, and luminance only. Never animate hue.
- Exit animations are 60–70% of enter duration (per skill's `exit-faster-than-enter` rule).
- No bouncy springs in UI chrome. The canvas mascot is the only animated character (idle moods + reacting poses), driven by its own requestAnimationFrame loop rather than CSS.

---

## 3. Surfaces

Sanji has three surfaces. Each has a single anchor mood-board reference — the visual North Star. Anything that drifts from these references in code should be challenged in review.

### 3.1 Chat Shell — steady state

**Layout.** B-layout: Sources (left, 260px) | Chat (center, fluid) | Editor (right, 40%, collapsible).

**Mascot.** Lives bottom-right of the chat column at 64×64, fixed within the pane (not the viewport). Hand-rendered on a canvas. Idle cycles sub-moods (snooze, energetic, groom, calm) on a jittered 8–16s timer with occasional blinks. Streaming (active): the head tilts side to side. Error: worried eyes and a frown. Reduced motion holds a single static frame.

**Chat column anatomy.**
- Top: thin breadcrumb showing active skill (e.g. `/daily`) at `text-xs`, `--fg-muted`.
- Stream: alternating user (right-aligned, `--bg-sunken`, no avatar) and assistant (left-aligned, `--bg-surface` with 1px `--border-subtle`, accent citation chips inline) bubbles. 16px vertical rhythm.
- Tool-call status: a single-line monospace strip below the active assistant bubble, `--info` text on `--info-soft`, animated dot prefix (▸ → ▾ on completion).
- Composer: bottom-anchored, `--radius-lg`, `--bg-surface` with `--border-strong` on focus, slash-command autocomplete popover above it. Submit on `⌘↵`.

**Sources sidebar.** `--bg-muted`. Vault tree on top, recent notes pinned below. Selected item gets a 2px left bar in `--accent`, no fill change. Right-click reveals "Open in editor" / "Cite next reply".

**Editor pane.** Read-mostly markdown with one-click edit. Same typography as chat assistant body but full-width measure. Inline citations render as `[note-name]` chips; clicking jumps the source-tree highlight.

**Anchor mood-board reference.** **Linear's triage view.** The way three columns coexist without fighting, the restraint of the active-row indicator, the way density feels intentional rather than crowded. Sanji is warmer (parchment, not slate) and softer-cornered, but the structural confidence is the target.

**Anti-patterns.**
- ❌ Avatars on user messages. Right-alignment is the identity; a redundant circle adds noise.
- ❌ Animating new bubbles in with slide/fade. Tokens stream in at the cursor; the bubble is already there.
- ❌ Multiple accent uses in one viewport (accent button + accent active row + accent citation). One accent surface per screen.
- ❌ Drop shadows on chat bubbles. They're flat with a 1px border.
- ❌ Mascot in the global viewport. It belongs to the chat pane and disappears when the chat pane is collapsed.
- ❌ Loading spinners. Use the tool-call status strip; the user wants to know *what* is happening, not *that* something is happening.

### 3.2 Onboarding Wizard — one-step-at-a-time

**Layout.** Centered column, max-width 560px, top-aligned at 12vh. No sidebar, no chrome. Progress is a compact 3-dot indicator above the step title — no numbered breadcrumb, no "Step 2 of 5" label.

**Step structure.**
- `text-2xl`/600 title, single short sentence.
- `text-md`/`--fg-muted` subtitle, max 2 lines.
- One primary input or choice. If multi-field, stack vertically with `--space-5`.
- Footer row: secondary "Back" (ghost), primary "Continue" right-aligned with `--accent`. No "Skip" — every step is required or it shouldn't be a step.

**Mascot.** Larger here (96×96), bottom-left of the column, stationary. It does not speak; the heading does. The mascot is a confidence signal, not a guide.

**Validation.** Inline, immediate, terse. Errors render below the field in `--danger` `text-xs`. Continue is disabled until the step's invariant holds (per skill's `inline-validation` + `focus-management` rules) — never let the user advance and then yell.

**Anchor mood-board reference.** **Stripe's Atlas onboarding (circa 2022).** The way each step feels like the only thing in the world, the discipline of one decision per screen, the absence of marketing copy on a setup flow. Sanji is warmer and has a mascot, but the editorial restraint is the target.

**Anti-patterns.**
- ❌ Multi-column forms. Onboarding is a single decision per step, even if it makes the flow longer.
- ❌ Progress bars or percentage indicators. The dot trio is enough; a percentage implies a contract we won't keep.
- ❌ Animated illustrations per step. The mascot is the only character.
- ❌ "You can change this later" reassurance copy. Either let them change it later silently, or don't offer the choice.
- ❌ Confetti, success modals, or celebratory states on completion. The reward for finishing setup is *being in the app*.

### 3.3 Settings Drawer — Week 5

**Layout.** Right-side overlay drawer, 480px wide, full viewport height, `--shadow-lg`, `--radius-lg` on top-left and bottom-left corners only. Backdrop is `rgba(20,16,12,0.32)` (within skill's 40–60% scrim guidance for desktop). Closes on `Esc`, backdrop click, or ✕.

**Anatomy.**
- Header: drawer title `text-lg`/600, ✕ button right. 1px `--border-subtle` below.
- Body: scrollable. Sections separated by `--space-6` and a thin `--border-subtle` rule with section label inset (small-caps `text-xs`, `--fg-subtle`, `letter-spacing: 0.06em`).
- Footer: sticky, only appears when there are unsaved changes. "Discard" ghost left, "Save" accent right.

**Section rhythm.** Each setting is a row: `[label + helper text]` left, `[control]` right. Helper text at `text-xs`/`--fg-muted` directly below the label. Controls are right-aligned. No card wrapping per row — dividers carry the structure.

**Controls.** Toggles for binary, segmented controls for 2–4 options, dropdowns for >4, free-text inputs for paths/keys. Never a modal-within-a-drawer; if a setting needs more space, it's a full screen, not a nested overlay.

**Anchor mood-board reference.** **Raycast's preferences pane.** The way settings feel like a *list* you read down, not a *form* you fill, the discipline of one control per row, the trust in dividers over cards. Sanji is warmer and uses a drawer instead of a window, but the read-down rhythm is the target.

**Anti-patterns.**
- ❌ Tabbed sections within the drawer. Scroll is fine; tabs hide structure.
- ❌ "Advanced" disclosure groups that hide half the settings. If a setting is too scary to show, it doesn't belong in the UI.
- ❌ Live-applying destructive changes. Index rebuilds and credential swaps go through the sticky footer's explicit Save.
- ❌ Inline validation that blocks Save without saying why. Errors render in the row, Save reflects aggregate validity.
- ❌ Save toasts. The footer disappearing is the confirmation.

---

## 4. Cross-cutting Component Anti-patterns

These apply everywhere; surface-specific anti-patterns are listed above. The first six come from the skill's pre-delivery checklist; the rest are Sanji-specific.

- ❌ **Emojis as structural icons.** Use SVG (Lucide is the chosen family). Mascot is the only character asset.
- ❌ **Missing `cursor: pointer`.** Every clickable element gets it.
- ❌ **Layout-shifting hovers.** No scale transforms that move surrounding content.
- ❌ **Low-contrast text.** 4.5:1 minimum body, verified in both themes.
- ❌ **Instant state changes.** Always 150–300ms transitions. (Streaming text is not a state change — it's content arrival.)
- ❌ **Invisible focus states.** `--shadow-focus` ring on every focusable element.
- ❌ **A second accent color.** If you reach for one, you actually need a semantic color (success/warning/danger/info), or you need to demote what's currently accent.
- ❌ **Stacked elevations.** A popover inside a modal does not get its own shadow.
- ❌ **Shadow as the primary affordance.** Borders + surface contrast carry hierarchy; shadow is the polish, not the structure.
- ❌ **First-paint animations.** The app loads; it doesn't perform.
- ❌ **Icon-only buttons without tooltip.** Every icon button has `aria-label` and a visible tooltip on hover/focus.
- ❌ **Spinners gating primary actions.** Disable, change label to verb-in-progress ("Indexing…"), keep the user oriented.
- ❌ **Custom font weights outside the scale.** 400/500/600/700 only.
- ❌ **Body markdown wider than 68ch.** Editor pane is the place for full-width.
- ❌ **Mascot outside its three sanctioned spots** (chat-pane corner, onboarding column, empty states). It's a character, not a sticker.
- ❌ **Dark-mode tokens that break light-mode relationships.** If `--bg-muted` is one step darker than `--bg-canvas` in light mode, it must be one step lighter than `--bg-canvas` in dark mode.

---

## 5. Component Specs (skill-derived starting points)

Concrete CSS templates for the most common primitives. These are starting points; shadcn/ui components are themed against the tokens in §2 and adopted one-by-one.

### Primary button

```css
.btn-primary {
  background: var(--accent);
  color: var(--accent-fg);
  padding: 8px 16px;
  height: 36px;
  border-radius: var(--radius-sm);
  font: 500 0.9375rem/1 var(--font-sans);
  transition: background var(--dur-fast) var(--ease-standard);
  cursor: pointer;
}
.btn-primary:hover  { background: var(--accent-hover); }
.btn-primary:focus-visible { box-shadow: var(--shadow-focus); outline: none; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
```

### Secondary / ghost button

```css
.btn-ghost {
  background: transparent;
  color: var(--fg-default);
  padding: 8px 16px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  transition: border-color var(--dur-fast) var(--ease-standard),
              background var(--dur-fast) var(--ease-standard);
}
.btn-ghost:hover { border-color: var(--border-strong); background: var(--bg-muted); }
```

### Input

```css
.input {
  padding: 8px 12px;
  height: 36px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  font: 400 1.0625rem/1.5 var(--font-sans);
  transition: border-color var(--dur-fast) var(--ease-standard);
}
.input:focus { border-color: var(--border-strong); outline: none; box-shadow: var(--shadow-focus); }
.input::placeholder { color: var(--fg-subtle); }
```

### Chat bubble — assistant

```css
.bubble-assistant {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  max-width: 68ch;
  box-shadow: none;  /* flat, per Flat Design + cross-cutting "no bubble shadows" */
}
```

### Modal / drawer scrim

```css
.scrim {
  background: rgba(20, 16, 12, 0.32);  /* warm-tinted, ~32% — within HIG/MD scrim band */
  backdrop-filter: none;               /* no blur; we want crisp foreground */
}
```

---

## 6. Pre-Delivery Checklist

Adapted from the skill's web/desktop checklist; mobile-only items removed.

### Visual quality
- [ ] No emojis used as icons (mascot SVG excepted; everything else Lucide).
- [ ] All icons from a single family with a consistent stroke weight.
- [ ] Tokens used everywhere — no raw hex, no ad-hoc spacing values.
- [ ] Pressed-state visuals do not shift layout bounds.
- [ ] Both light and dark themes verified independently (not inferred from one).

### Interaction
- [ ] All clickable elements have `cursor: pointer`.
- [ ] Hover/pressed/focus states distinct on every interactive element.
- [ ] Micro-interaction timing in 150–300ms range with `--ease-standard`.
- [ ] Disabled states visually clear (`opacity: 0.5`, `cursor: not-allowed`) and non-interactive.
- [ ] Focus ring (`--shadow-focus`) visible on every focusable element.
- [ ] `prefers-reduced-motion: reduce` respected.

### Layout
- [ ] No horizontal scroll at any breakpoint ≥1024px (Sanji is desktop-first; below that, gracefully collapses Editor → tab).
- [ ] Verified at 1280px, 1440px, 1920px, and 13" laptop (1440×900).
- [ ] Body markdown measure ≤68ch in chat; editor pane gets full pane width.
- [ ] Scroll content not hidden behind fixed composer / drawer footer.
- [ ] 4/8 spacing rhythm maintained at component, section, and page levels.

### Accessibility
- [ ] All interactive elements have accessible labels (`aria-label` on icon buttons, `<label>` on inputs).
- [ ] Color is never the only indicator (status colors paired with icon/text).
- [ ] Form errors announced via `role="alert"` / `aria-live="polite"`.
- [ ] Tab order matches visual order; focus moves to first invalid field on submit error.
- [ ] Body text contrast ≥4.5:1; large text ≥3:1; verified in both themes.

---

## 7. Implementation notes

- Tokens land as CSS custom properties under `:root` in `apps/frontend/src/design/tokens.css`, mapped into Tailwind v4 via `@theme` in the same file or a sibling.
- shadcn/ui components are adopted one-by-one and themed against these tokens. We do not pull the whole kit; each component is a deliberate add.
- The mascot is hand-rendered on a canvas (no SVG, no asset files): a front-facing seated form for the chat corner and the chat avatar, and a winged side-profile form for the onboarding flight. It is the only custom character in v0.1. See `apps/frontend/src/mascot/` (pure `art/` drawing modules, pure pose/cycler/flight logic, and the thin React canvas layer).
- Page-specific overrides (when needed) live at `apps/frontend/src/design/pages/[page-name].md` and override this Master file for that page only.
- This document is read by humans first and Claude second. When something here is wrong in practice, fix it in code, then update this file in the same PR — never the reverse.
