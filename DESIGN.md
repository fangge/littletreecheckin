---
name: The Pure Sprout
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#3c4b38'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#6c7b67'
  outline-variant: '#bacbb4'
  surface-tint: '#006e18'
  primary: '#006e18'
  on-primary: '#ffffff'
  primary-container: '#0fe640'
  on-primary-container: '#006114'
  inverse-primary: '#0ce53f'
  secondary: '#356947'
  on-secondary: '#ffffff'
  secondary-container: '#b7f0c5'
  on-secondary-container: '#3b6f4d'
  tertiary: '#546259'
  on-tertiary: '#ffffff'
  tertiary-container: '#bccbc1'
  on-tertiary-container: '#49564e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#72ff73'
  primary-fixed-dim: '#0ce53f'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#005310'
  secondary-fixed: '#b7f0c5'
  secondary-fixed-dim: '#9cd3aa'
  on-secondary-fixed: '#00210e'
  on-secondary-fixed-variant: '#1b5031'
  tertiary-fixed: '#d7e6dc'
  tertiary-fixed-dim: '#bbcac0'
  on-tertiary-fixed: '#121e18'
  on-tertiary-fixed-variant: '#3c4a42'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style

This design system centers on the concept of **The Pure Sprout**, a design philosophy that equates personal growth with the nurturing of a garden. The brand personality is optimistic, clear, and encouraging, specifically tailored to be accessible for children while maintaining a sophisticated, modern aesthetic that parents appreciate. 

The visual style is **Minimalism with Tactile Softness**. It prioritizes extreme clarity and generous whitespace to reduce cognitive load for younger users. By utilizing high-contrast typography against a pristine white canvas, the system ensures that "growth" (the primary green) is the most significant visual event on the screen. The emotional response should be one of freshness, achievement, and calm focus.

## Colors

The palette is anchored by a vibrant **Sprout Green**, used exclusively for primary actions, progress indicators, and success states. To maintain an "airy" feel, this green is never used for large backgrounds; instead, it acts as a focused highlight against a dominant white background.

Subtle depth is created through **Mint-tinted surfaces** (#F7FCF9), which provide a soft distinction for cards and containers without feeling heavy. High-contrast charcoal is used for text to ensure maximum readability for children learning to navigate apps independently.

## Typography

This design system utilizes **Plus Jakarta Sans** for its friendly, open counters and modern geometric structure. For Chinese localization, **Noto Sans SC** is employed to maintain a consistent weight and clean profile.

Typography is scaled larger than standard utility apps to cater to younger readers. Headlines are set with extra-bold weights to create a clear information hierarchy. Tracking is slightly tightened on display text for a contemporary feel, while body text remains generously spaced to ensure legibility during habit tracking.

## Layout & Spacing

The layout follows a **Fluid Grid** model built on an 8px base unit. To achieve the "Pure Sprout" aesthetic, the spacing rhythm is intentionally generous, favoring `lg` (40px) and `xl` (64px) vertical margins to separate distinct content groups.

Containers should utilize a consistent 20px side margin on mobile devices. White space is treated as a functional element that guides the child's eye to the next task, preventing the interface from feeling "noisy" or overwhelming. Elements should be grouped within large, clear modules with significant padding between the edge of the container and the content inside.

## Elevation & Depth

This design system eschews traditional heavy shadows in favor of **Tonal Layers** and **Soft Mint Glows**. 

1.  **Level 0 (Base):** Pure White (#FFFFFF).
2.  **Level 1 (Cards):** Soft Mint Surface (#F7FCF9) with no shadow, or a very subtle 1px border in a slightly darker mint.
3.  **Level 2 (Interaction):** When an element is active or "blooming," it may utilize a highly diffused, low-opacity green shadow (hex #0FE640 at 10% opacity) to suggest it is lifting off the page.

Depth is primarily communicated through color-blocking with the mint-tinted surfaces rather than literal 3D effects. This keeps the interface feeling light and "airy."

## Shapes

The shape language is strictly **Full Round**. This reinforces the "Pure Sprout" concept—organic, soft, and safe. There are no sharp corners in the design system.

Small elements like tags or buttons use a pill shape, while larger cards and containers use a very high border radius (starting at 32px) to mimic the friendly appearance of smoothed river stones or organic growth. This "squircle" and pill-based geometry ensures the app feels tactile and approachable for small hands.

## Components

-   **Buttons:** Must be pill-shaped. Primary buttons use the Sprout Green background with Charcoal text for high contrast. Secondary buttons use the Mint-tinted surface with Green text.
-   **Habit Cards:** Large, white or mint-tinted surfaces with a minimum height of 88px to ensure a large tap target. Icons within cards should be simple and rounded.
-   **Progress Rings:** Use a thick stroke (8px+) with rounded caps. The "empty" track should be a very light mint, and the "filled" track must be the Sprout Green.
-   **Chips/Labels:** Small pill-shaped containers used for categorization. Use high-contrast text and a light mint background.
-   **Checkboxes:** Large circular toggles. When "checked," they should fill entirely with Sprout Green and feature a bold white checkmark, providing a satisfying "bloom" effect.
-   **Input Fields:** Heavily rounded (pill-style) with a soft mint background. Placeholder text should be high-contrast grey to ensure children can easily read what is required.
-   **Growth Tracker (Custom):** A vertical or horizontal bar that visually "grows" like a plant stem as habits are completed, reinforcing the brand's core metaphor.