# 8Liv — Design System Reference
> Calming clinical authority, serene emerald accents, and spacious medical precision.

**Theme:** light (with selective immersive dark console surfaces for clinical charts and video consultation rooms)

8Liv is a modern clinical wellness and telemedicine platform that combines trusted medical authority with serene, human-centered clarity. It replaces generic SaaS tropes (inter everywhere, purple-to-blue gradients, cards nested in cards, gray text on colored backgrounds) with an authentic healthcare visual language: deep slate typography, soothing clinical sage backgrounds, and crisp emerald/teal precision accents that inspire calm and confidence.

---

## 1. Tokens — Color Palette

### Base & Canvas
| Name | Hex / Value | Role |
|------|-------------|------|
| **Canvas Light** | `#F8FAFC` | Main application background; clean, calming, non-stark neutral. |
| **Canvas Pure White** | `#FFFFFF` | Primary card surfaces, elevated panels, modal backgrounds, and input fields. |
| **Canvas Deep Slate** | `#0B132B` | Immersive dark console surface for live video consultations, medical telemetry, and nocturnal care views. |
| **Surface Subtle** | `#F1F5F9` | Secondary panel wash, table header fills, segmented control background. |
| **Surface Muted** | `#E2E8F0` | Structural dividers, hairline card borders, pill borders. |

### Brand & Clinical Accents
| Name | Hex / Value | Role |
|------|-------------|------|
| **Emerald Accent** | `#00A884` | Primary brand accent; active tab indicators, primary action highlights, success markers. |
| **Deep Forest** | `#0F766E` | High-contrast clinical action color for primary buttons, focus rings, and medical badges. |
| **Teal Wash** | `rgba(0, 168, 132, 0.08)` | Chip background, active selection tint, subtle table row highlight. |
| **Teal Glow** | `0 0 20px rgba(0, 168, 132, 0.15)` | Subtle focus elevation and active consultation indicator. |

### Typography & Content
| Name | Hex / Value | Role |
|------|-------------|------|
| **Ink** | `#0F172A` | Primary display and body text; maximum clinical contrast (≥12:1). |
| **Slate** | `#334155` | Secondary text, form labels, doctor credential lines, metadata. |
| **Muted Slate** | `#64748B` | Helper captions, timestamp indicators, disabled labels. |
| **Inverse White** | `#FFFFFF` | Text on deep slate surfaces and primary buttons. |

### Semantic Clinical States
| State | Light Fill | Border / Stroke | Text / Icon | Meaning |
|-------|------------|-----------------|-------------|---------|
| **Active / Eligible** | `#ECFDF5` | `#A7F3D0` | `#065F46` | Good candidate for program, active prescription, confirmed appointment |
| **Attention / Pending**| `#FFFBEB` | `#FDE68A` | `#92400E` | Pending doctor review, upcoming refill due, intake required |
| **Critical / Ineligible**| `#FEF2F2`| `#FECACA` | `#991B1B` | Contraindicated medication, missed consult, payment failed |
| **Info / Telehealth** | `#EFF6FF` | `#BFDBFE` | `#1E40AF` | Pre-appointment instruction, video room ready, dietary log note |

---

## 2. Tokens — Typography

Primary typeface: **Plus Jakarta Sans** (with fallback to **Aptos**), offering surgical clarity, open apertures, and warm geometry that eliminates clinical sterility.

### Type Hierarchy
| Level | Font Size | Line Height | Tracking | Weight | Usage |
|-------|-----------|-------------|----------|--------|-------|
| **Display Hero** | 44px / 2.75rem | 1.15 | -0.025em | 700 (Bold) | Landing page hero, primary assessment headline |
| **Heading 1** | 32px / 2.0rem | 1.25 | -0.02em | 700 (Bold) | Portal section titles, consultation summary headlines |
| **Heading 2** | 24px / 1.5rem | 1.30 | -0.015em | 600 (Semibold) | Panel headers, modal titles, prescription order cards |
| **Heading 3** | 18px / 1.125rem | 1.40 | -0.01em | 600 (Semibold) | Metric group labels, provider profile titles |
| **Body Regular** | 15px / 0.9375rem | 1.55 | normal | 400 (Regular) | Primary clinical notes, consultation instructions, intake forms |
| **Body Medium** | 15px / 0.9375rem | 1.55 | normal | 500 (Medium) | Emphasized body text, interactive list items |
| **Caption** | 13px / 0.8125rem | 1.45 | +0.01em | 500 (Medium) | Timestamps, dosage metadata, micro-copy |
| **Tabular Mono** | 14px / 0.875rem | 1.40 | normal | 500 (Medium) | Lab values, BMI calculations, pricing figures, order IDs |

---

## 3. Elevation & Depth System

- **Flat (Surface 0):** `#F8FAFC` base page background.
- **Card (Surface 1):** `#FFFFFF` with `border: 1px solid #E2E8F0` and `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02)`.
- **Floating / Flyout (Surface 2):** `#FFFFFF` with `box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Modal / Overlay (Surface 3):** Backdrop with `rgba(11, 19, 43, 0.4)` and `backdrop-filter: blur(8px)`.

---

## 4. Spacing, Radii & Grid

- **Border Radius:**
  - Micro tags / badges: `6px`
  - Inputs & action buttons: `10px`
  - Cards & containers: `14px`
  - Large dialogs & hero callouts: `18px`
- **Spacing Units:**
  - Standard 4px/8px modular rhythm (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
  - Generous whitespace around clinical charts and intake questions to minimize cognitive overload.

---

## 5. Interaction & Component Rules (Craft Floor)

1. **No Lazy Card Nesting:** A card never lives inside another card. If grouping inside a panel is necessary, use subtle background tinting (`#F1F5F9`) or 1px hairline dividers, never border-on-border boxes.
2. **No Eyebrow / Kicker Tags Above Headings:** Headings state their purpose directly and confidently without redundant mini-pills above them.
3. **High-Dignity Forms:** Form inputs have clear labels above, explicit helper text below, and generous 44px minimum touch targets. Focus states use `#0F766E` with a 2px outer ring.
4. **Authentic Iconography:** Lucide icons drawn in consistent 1.75px stroke width. No decorative emojis or mismatched illustration styles.
5. **Themed Browser Surfaces:** Custom scrollbars, tinted text selection (`background: rgba(0, 168, 132, 0.2)`), and refined tabular numerals for medical metrics.
