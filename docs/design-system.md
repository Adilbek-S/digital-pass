# Design System — Национальная платёжная корпорация Казахстана

> Source: https://npck.kz/ — CSS analysed 2026-06-29

## Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| `brand-primary` | `#295A5B` | Primary teal — buttons, active nav, key accents |
| `brand-primary-dark` | `#1F4444` | Hover/pressed states |
| `brand-primary-deep` | `#005A4B` | Footer, hero dark sections |
| `brand-mid` | `#28594E` | Secondary elements, logo on light bg |
| `brand-teal-alt` | `#234F54` | Card headers |
| `brand-sage` | `#4A7D71` | Tertiary UI elements |
| `brand-sage-muted` | `#ABBFBA` | Disabled, placeholder |
| `bg-tint` | `#E9F0EE` | Light section backgrounds |
| `bg-subtle` | `#EFF3F3` | Card backgrounds |
| `bg-pale` | `#F1F6F4` | Page background |
| `bg-mint` | `#E3EEEB` | Highlight backgrounds |
| `accent-green` | `#659945` | Success, approved status |
| `text-primary` | `#252525` | Body text |
| `text-secondary` | `#424242` | Secondary text |
| `text-muted` | `#686868` | Captions, hints |
| `text-slate` | `#555F73` | Metadata |
| `border-default` | `#D7DADD` | Dividers, input borders |
| `border-subtle` | `#CFDFD9` | Card borders |
| `white` | `#FFFFFF` | Surfaces |
| `black` | `#000000` | |

## Typography

**Font family:** `'Roboto', sans-serif` (Google Fonts)

| Weight | Value | Usage |
|--------|-------|-------|
| Thin | 100 | — |
| Light | 300 | Captions |
| Regular | 400 | Body |
| Medium | 500 | Labels, nav |
| Semi-bold | 600 | Subheadings |
| Bold | 700 | Headings, CTAs |
| Black | 900 | Hero text |

**Scale (rem):** 0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 1.75 · 2 · 2.25 · 3.2 · 3.8

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | `3px` | Tags, small chips |
| `radius-md` | `5px` | Cards, inputs (default) |
| `radius-lg` | `12px` | Modals, panels |
| `radius-pill` | `100px` | Buttons, badges |
| `radius-full` | `50%` | Avatars |

## Logo Assets

| Variant | File | Fill | Background |
|---------|------|------|------------|
| Full horizontal | `public/logo/logo.svg` | white | dark/primary |
| Footer | `public/logo/logo_footer.svg` | white | dark |
| Mobile compact | `public/logo/logo_mobile.svg` | `#28594E` | light |

## Status Colours

| Status | Background | Text/Border | Semantic |
|--------|-----------|-------------|---------|
| PENDING | `#EFF3F3` | `#555F73` | Neutral grey |
| APPROVED | `#D0FAC9` | `#659945` | Green |
| REJECTED | `#FFE4E4` | `#C0392B` | Red |
| EXPIRED | `#F5F5F5` | `#9A9CA5` | Muted |
| CHECKED_IN | `#E3F0FF` | `#2C6FBF` | Blue |
| NO_SHOW | `#FFF3CD` | `#856404` | Amber |

## Component Patterns

- **Primary button:** bg `brand-primary`, text white, radius `radius-pill`, hover `brand-primary-dark`
- **Secondary button:** border `brand-primary`, text `brand-primary`, bg transparent
- **Input:** border `border-default`, radius `radius-md`, focus ring `brand-primary`
- **Card:** bg white, border `border-subtle`, radius `radius-lg`, shadow `0 1px 3px rgba(37,37,37,0.07)`
- **Nav sidebar:** bg `brand-primary`, text white, active item bg `rgba(255,255,255,0.15)`
