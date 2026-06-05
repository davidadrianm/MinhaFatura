---
name: Fintech Core
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-currency:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  grid-margin: 24px
  grid-gutter: 16px
---

## Brand & Style

The design system is anchored in the **Corporate / Modern** aesthetic, specifically tailored for the high-stakes environment of personal and shared finance. It prioritizes clarity, precision, and a sense of "digital vault" security while maintaining the approachable vibrance seen in leading fintech challengers.

The visual narrative focuses on **Financial Transparency**. This is achieved through a structured hierarchy where data is the hero, supported by a "clean-room" interface style. The emotional goal is to move the user from the stress of spending to the confidence of management. The interface utilizes generous whitespace and a refined color palette to reduce cognitive load during complex financial tasks like expense splitting or limit allocation.

## Colors

This design system utilizes a sophisticated palette designed for high legibility in both light and dark environments.

- **Primary (Navy):** Used for deep backgrounds in dark mode and primary navigation elements in light mode. It represents stability.
- **Secondary (Vibrant Purple):** The "Action" color. Reserved for primary buttons, active states, and highlights that guide the user's eye to the next step.
- **Semantic Colors:** Green (Success/Income) and Red (Alert/Debt) are used with consistent saturation levels to ensure they carry equal visual weight. Orange is introduced specifically for "Pending" or "Upcoming" states to create a middle-ground urgency.
- **Neutral Scale:** In Light Mode, we use "Ice Gray" (#F8FAFC) for the canvas to separate it from pure white (#FFFFFF) cards. In Dark Mode, we shift to a deep navy foundation (#0F172A) with slightly elevated surfaces (#1E293B) to create depth without relying solely on shadows.

## Typography

The design system uses **Inter** exclusively for its systematic, utilitarian nature. In a financial context, the "tabular num" properties of Inter are vital for aligning currency values in tables and lists.

**Hierarchy for Financial Values:**
Financial figures (R$) should always be one step higher in weight or size than their accompanying labels. For dashboard overviews, use `display-currency` with a slight negative letter spacing to create a compact, "premium" feel. 

For secondary information, such as transaction timestamps or descriptions, use `body-md` in a graphite tint to maintain a clear distinction from the primary transaction amount.

## Layout & Spacing

The layout is built on a **12-column fluid grid** for desktop and a **4-column grid** for mobile. We use an **8px linear scale** for all internal spacing to ensure consistent rhythm.

- **Desktop:** Main content container should be capped at 1280px. Sidebar navigation is fixed at 280px.
- **Mobile:** Margins are set to 24px to give the UI breathing room, with card-based layouts spanning the full width.
- **Density:** Financial tables should utilize "Comfortable" padding (16px vertical) by default, with a "Compact" toggle (8px vertical) for data-heavy power users.

## Elevation & Depth

Visual hierarchy is managed through **Tonal Layering** supplemented by **Ambient Shadows**.

- **Light Mode:** Cards use a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)) to lift them off the "Ice Gray" background. This creates a tactile, physical feel for shared card components.
- **Dark Mode:** Shadows are largely ineffective against deep navy backgrounds. Instead, elevation is communicated through color shifts. The background is `#0F172A`, and elevated cards move to `#1E293B`.
- **Interactive States:** On hover, cards should slightly increase their shadow spread or shift 2px upward to provide immediate feedback.

## Shapes

The design system uses **Level 2 (Rounded)** shapes. This provides a 0.5rem (8px) corner radius for standard buttons and inputs, and a 1rem (16px) radius for large containers and cards.

This level of roundedness strikes a balance between the "friendly" nature of modern B2C fintechs and the "structured" nature of traditional banking. Progress bars and status chips should use the `rounded-xl` (1.5rem) or "Pill" shape to distinguish them from functional input elements and structural cards.

## Components

### Buttons
- **Primary:** Solid Purple (#7C3AED) with white text. 8px corner radius.
- **Secondary:** Navy (#0F172A) outline or ghost style for less critical actions like "Download Statement."

### Cards & Tables
- **Financial Cards:** Physical card representations (Credit/Debit) should use subtle gradients of the Primary Navy. 
- **Tables:** No vertical borders. Use horizontal lines in a subtle #E2E8F0 (light) or #334155 (dark). Header row should use `label-sm` in a muted color.

### Financial Controls
- **Progress Bars:** Used for "Limit Used" vs "Limit Available." The track should be a light neutral, with the filler using the Purple accent. If the limit exceeds 90%, the filler color should dynamically switch to Orange or Red.
- **Input Fields:** Use "floating labels" to maximize space. Focus states must be a 2px Purple ring.

### Filters & Chips
- Use "Pill" shapes for active filters. When a filter is active, the chip should have a Purple background with a small 'X' for dismissal.