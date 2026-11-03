# Handoff: PostVoice brand identity, direction 2c "Signal Field"

## Overview
Brand identity for PostVoice (postvoice.co), a social media scheduler for agencies and teams. Direction **2c Signal Field** is the chosen system: a refined paper-plane mark inside a ring, field green + coral palette, and Plus Jakarta Sans across marketing and product UI. The green/coral palette is deliberate: it keeps PostVoice clear of the purple/blue used by competitors (Postiz, Brandwatch).

## About the design files
`reference/PostVoice Brand Set.dc.html` is a **design reference built in HTML**, not production code. Open it in a browser (keep `support.js` beside it); 2c is the board with the "2c" badge. Recreate the brand in the target codebase (React, Tailwind, native, etc.) using its own patterns. Use the SVGs in `assets/` and the values in `tokens.css` as the source of truth.

## Fidelity
**High-fidelity.** Colors, type, radii and logo geometry are final.

## Logo

### Mark geometry
A paper plane made of four flat polygons in a 100×100 coordinate space. The small gaps between polygons are the fold lines. Keep them; don't add strokes.
```
<polygon points="88,28 12,49 30,54"/>          upper wing
<polygon points="31,55 87,28 40,57 37,71"/>    keel
<polygon points="42,58 48,63 38,72"/>          inner fold
<polygon points="42.5,57 88,28 64,72"/>        main wing
```
Cropped viewBox for a standalone mark: `10 26 80 48`.

### Ring mark (primary symbol)
- Filled circle, Ø104, in Field Green (on light) or Coral (on dark).
- A 5px gap (background color), then a 2px outer ring in the same color as the fill. Total Ø118.
- White plane, 68px wide (65% of the fill diameter), centered.
- Implementation reference: `box-shadow: 0 0 0 5px <bg>, 0 0 0 7px <fill>` on a 104px circle, or use `assets/ring-mark-*.svg`.

### Lockups
| Lockup | Symbol | Wordmark |
|---|---|---|
| Primary (light, bg #F3F5F1) | Green ring mark Ø104 | "PostVoice", Plus Jakarta Sans 700, 80px, line-height 1, letter-spacing −0.045em, #121A17 |
| Dark (bg #121A17) | Coral ring mark Ø44 (3px gap, 1.5px ring) | 30px, 700, −0.04em, #FFFFFF |
| Mark only on green (bg #16352E) | 120px circle with 2px white border, white plane 84px | none |

- Gap between symbol and wordmark: 22px at primary size, 12px at small size (≈0.27× the wordmark size).
- The wordmark is always "PostVoice" (capital P and V, one word).
- The SVG lockups use live `<text>`; outline the text before shipping them as final logo files.

### App icons
| Size | Tile | Radius | Content |
|---|---|---|---|
| 96px (primary) | #16352E | 22px | 72px white ring (2px), 50px white plane |
| 48px | #121A17 | 11px | 32px white plane, no ring |
| 28px | #16352E | 7px | 19px white plane, no ring |
For iOS/Android exports, scale the 96px version (radius ≈ 23% of size). Drop the ring below 40px.

## Design tokens
See `tokens.css`.

| Name | Hex | Use |
|---|---|---|
| Field Green | #16352E | Primary. Logo, buttons, icon tiles |
| Charcoal | #121A17 | Text, dark surfaces |
| Coral | #F07A5A | Accent. Mark on dark, highlights |
| Coral (text) | #E0613F | Coral as text on white |
| Cloud | #F3F5F1 | Page background |
| Mist | #E8ECE6 | Secondary surface |
| Line | #DFE4DC | Borders, dividers |
| Moss Grey | #5D6A63 | Secondary text, labels |
| Body | #3A4540 | Body copy |
| Badge | #FDE6DE / #A33D22 | Status pill background / text |

Palette swatch proportion on the board: Green 2 : Charcoal 2 : Coral 1 : Cloud 1 : Moss Grey 1.

### Typography
- **Plus Jakarta Sans** (Google Fonts), weights 400/500/600/700/800.
  - Display: 800, 46px / 1.04, −0.04em. Sample: "Every client, on schedule." with "on schedule." in #E0613F. This copy is a placeholder, not an approved tagline.
  - Wordmark: 700, −0.045em.
  - Body: 400, 15px / 1.5, #3A4540.
  - Button: 600, 14px.
- **JetBrains Mono** 400/500. Labels and hex codes only: 12px, uppercase, letter-spacing 0.08em, #5D6A63.

### UI samples
- Primary button: bg #16352E, text #FFFFFF, 600 14px, padding 10px 16px, radius 8px.
- Status pill ("Approved"): bg #FDE6DE, text #A33D22, 600 12px, padding 5px 10px, radius 999px.

### Radii
6px (swatches/cards), 8px (buttons), 7 / 11 / 22px (icons at 28 / 48 / 96), 999px (pills, rings).

## Assets
All in `assets/`:
- `mark-green.svg`, `mark-white.svg`, `mark-charcoal.svg`: plane only
- `ring-mark-green.svg`, `ring-mark-coral.svg`: primary symbol
- `lockup-horizontal-light.svg`, `lockup-horizontal-dark.svg`
- `app-icon.svg` (96), `app-icon-small-charcoal.svg` (48), `app-icon-small-green.svg` (28)

The plane is a refinement of the original PostVoice paper-plane logo the client supplied.

## Files
- `reference/PostVoice Brand Set.dc.html`: all explored directions; 2c is the approved one
- `reference/support.js`: runtime needed to open the reference file
- `tokens.css`: CSS custom properties
- `assets/`: SVG logo and icon files
