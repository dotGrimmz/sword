---
name: Realign Ministries
colors:
  surface: '#FFF5F0'
  surface-dim: '#FFE8DC'
  surface-bright: '#FFFFFF'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#FFF8F4'
  surface-container: '#FFF5F0'
  surface-container-high: '#FFE8DC'
  surface-container-highest: '#FFD9C8'
  on-surface: '#1A1A1A'
  on-surface-variant: '#4A4A4A'
  inverse-surface: '#1A1A1A'
  inverse-on-surface: '#FFF5F0'
  outline: '#C9A89A'
  outline-variant: '#E8CFC4'
  surface-tint: '#D91F26'
  primary: '#D91F26'
  on-primary: '#FFFFFF'
  primary-container: '#B81820'
  on-primary-container: '#FFFFFF'
  inverse-primary: '#F28C00'
  secondary: '#FFE8DC'
  on-secondary: '#1A1A1A'
  secondary-container: '#FFD9C8'
  on-secondary-container: '#4A4A4A'
  tertiary: '#F28C00'
  on-tertiary: '#FFFFFF'
  tertiary-container: '#E07A00'
  on-tertiary-container: '#FFFFFF'
  error: '#BA1A1A'
  on-error: '#FFFFFF'
  error-container: '#FFDAD6'
  on-error-container: '#93000A'
  background: '#FFF5F0'
  on-background: '#1A1A1A'
  surface-variant: '#FFE8DC'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 1.2
  headline-lg:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 1.25
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 1.3
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 1.7
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 1.6
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 1.4
    letterSpacing: 0.04em
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 24px
rounded:
  sm: 0.5rem
  DEFAULT: 0.75rem
  lg: 1rem
  full: 9999px
---

## Brand & Style

SWORD Bible study app, rebranded for **Realign Ministries**. This is a **theme and terminology refresh only** — keep the existing SWORD layout, card structure, and SWORD wordmark. Do not redesign page architecture.

Brand personality: warm, grounded, forward-moving (arrow motif), community Bible study.

Reference logo: Realign Ministries — white serif **RM** initials, upward arrow in red→orange gradient, infinity loop (use arrow colors only in app chrome; **avoid purple/magenta** from the loop's right side).

## Colors

App uses **warm light mode** — not the logo's black backdrop.

- **Primary red** `#D91F26` — buttons, active states, key accents (from arrow body)
- **Accent orange** `#F28C00` — CTAs, active nav, gradient end (from arrow tip)
- **Deep red** `#B81820` — pressed states
- **Background** `#FFF5F0` — warm off-white page background
- **Secondary wash** `#FFE8DC` — cards, inputs, secondary surfaces
- **Text** `#1A1A1A` — body and headings

Use **red→orange gradient sparingly**: primary buttons, active bottom-nav indicator, thin header accents. Never full-screen gradients.

**Do not use** purple, magenta, or cyan (legacy SWORD ocean theme).

## Typography

- **UI**: Inter (sans-serif) for all interface text
- **Scripture**: Merriweather or similar serif for verse body text
- Headlines in primary red or near-black; verse references in primary red

## Layout & Spacing

Preserve existing SWORD mobile PWA structure:
- Rounded phone frame with bottom navigation pill
- Card-based home screen sections
- 4-item bottom nav: **Today | Scripture | Reflections | Marked**
- Profile via settings icon (not in bottom nav)
- Pre-Read may appear as a card on Today only

## Components

- **Bottom nav**: 4 items with labels; active tab uses red→orange gradient indicator
- **Cards**: soft warm shadows, `#FFE8DC` or white surfaces on `#FFF5F0` background
- **Buttons**: primary filled red or red→orange gradient; white text
- **Quick action cards**: icon in soft red-tinted circle
- **Verse of the day card**: accent border in orange/red tint

## Terminology (UI labels only)

| Old | New |
|-----|-----|
| Home | Today |
| Reader | Scripture |
| Highlights | Marked |
| Notes | Reflections |
| Settings | Profile |
| Save | Mark |

## Logo usage

- **Keep SWORD logo/wordmark** on app screens
- Realign Ministries logo may appear as small credit on Welcome/Login or footer: "Realign Ministries"
- Tagline: Scripture • Wisdom • Order • Reflection • Devotion
