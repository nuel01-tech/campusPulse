# CampusPulse UI Redesign

This pass is a UI/UX redesign only. Existing routes, API calls, authentication flow, attendance logic, and feature structure were intentionally left intact.

## Design tokens

- Main content max width: `1200px`
- Mobile page gutter: `16px`
- Desktop page gutter: `32px`
- Primary spacing rhythm: `4px / 8px` increments
- Section spacing: `64px / 80px`
- Font: Inter
- Body: `16px / 1.5`
- Desktop H1: up to `64px`
- Desktop H2: up to `48px`
- Desktop H3: up to `28px`
- Controls: `40px / 44px / 48px` depending on context
- Standard radius: `8px`; pills use `999px`
- Primary accent: blue
- Neutral system: white / slate canvas / slate text / slate borders

## Accessibility

Interactive controls have hover, active, focus-visible, and disabled treatment where applicable. Inputs use 16px text to avoid mobile browser zoom behavior. Keyboard focus is intentionally visible.

## Sources used for the design pass

- MDN Responsive Design: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
- MDN Grid wrapper: https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Grid_wrapper
- W3C Designing for Web Accessibility: https://www.w3.org/WAI/tips/designing/
- W3C WCAG 2.2 changes / focus guidance: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
