# Design System Specification: The Ethereal Academic

## 1. Overview & Creative North Star
**Creative North Star: The Living Journal**
This design system moves away from the rigid, boxed-in nature of traditional educational dashboards and toward a high-end, editorial experience inspired by modern wellness and fitness interfaces. The goal is to make data feel "light"—as if it is floating on a clean, physical surface rather than trapped inside a database.

We achieve this through **Intentional Negative Space** and **Asymmetric Balance**. By removing the "safety net" of borders and heavy cards, we rely on a sophisticated hierarchy of typography and tonal shifts to guide the eye. The interface shouldn't feel like a tool you *operate*; it should feel like a space you *inhabit*.

---

## 2. Colors & Tonal Architecture
The palette is rooted in a "High-Value White" philosophy. We use a base of `#f9f9fe` (Surface) to provide a cool, calm foundation that feels more premium than a clinical hex white.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. 
*   **Boundary Definition:** Use the `surface-container` tiers to create regions. A `surface-container-low` section sitting on a `surface` background creates a clear but soft architectural break.
*   **Tonal Nesting:** To create depth, stack a `surface-container-lowest` (Pure White) element on top of a `surface-container` background. This "paper-on-table" effect replaces the need for shadows.

### Primary Roles
*   **The Student Core (Soft Blue):** Use `primary` (#005bc1) and `primary_container` (#d8e2ff) for student-facing metrics and progress.
*   **The Representative Core (Soft Purple):** Use `secondary` (#8e2fbd) and `secondary_container` (#f6d9ff) for Class Rep-specific actions and highlights.
*   **Signature Textures:** Use a subtle linear gradient (e.g., `primary` to `primary_dim`) for progress rings and primary action states to give components a "liquid" feel rather than a flat, plastic one.

---

## 3. Typography: The Editorial Voice
We use **Manrope** across the entire system. The hierarchy is designed to mirror a premium magazine layout—large, confident headers paired with tight, functional metadata.

*   **Display-LG (3.5rem):** Reserved for "Hero Metrics" (e.g., a student's GPA or total hours). It should feel like an art installation.
*   **Headline-LG (2rem):** Used for section starts. Ensure significant top-margin (`spacing-12` or `16`) to let the headline breathe.
*   **Label-MD (0.75rem):** Used for all secondary data descriptors. Always paired with `on_surface_variant` (#595f6a) to ensure the focus remains on the primary numbers.

**The Contrast Rule:** When displaying metrics, use a heavy weight for the value and a light weight for the label. The "Visual Weight" of the numbers should be the loudest element on the page.

---

## 4. Elevation & Depth
In this system, elevation is a product of **Light and Translucency**, not darkness and weight.

*   **The Layering Principle:** Depth is achieved by "stacking." 
    *   Level 0: `surface` (The Base)
    *   Level 1: `surface-container-low` (The Section)
    *   Level 2: `surface-container-lowest` (The Interactive Component)
*   **Ambient Shadows:** If an element must float (like a modal or a floating action button), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(44, 51, 61, 0.04)`. The color is a tint of our `on_surface`, making it feel like a natural occlusion of light.
*   **Glassmorphism:** For top navigation bars or floating filters, use `surface` at 80% opacity with a `backdrop-filter: blur(20px)`. This keeps the "visual flow" of the background metrics as the user scrolls.

---

## 5. Components

### Progress Rings & Bars
*   **The Fitness Ring:** Use a `6px` stroke width for progress rings. The track should be `surface-container-high` and the indicator should be a gradient of `primary` to `primary_dim`.
*   **Minimalist Bars:** Horizontal bars should have a `full` (9999px) corner radius and a height of no more than `8px`.

### Buttons
*   **Primary:** Flat backgrounds using `primary_container` with `on_primary_container` text. No borders. `md` (1.5rem) corner radius.
*   **Tertiary:** Text-only with an icon. Use `spacing-2` for the gap between icon and text.

### Inputs & Selection
*   **Input Fields:** Ghost-style. No bottom line or box. Use a subtle `surface-container-low` background fill that vanishes on focus, replaced by a 2px `primary` left-border accent.
*   **Chips:** Use `surface-container-high` for unselected and `primary` (with `on_primary` text) for selected.

### Lists & Cards
*   **Rule:** Forbid all divider lines.
*   **Implementation:** Separate list items using `spacing-4`. If data is dense, use an alternating background of `surface` and `surface-container-lowest`.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** embrace extreme whitespace. If a section feels "empty," it’s likely working.
*   **Do** use Manrope's boldest weight for numbers to create an Apple Fitness "data-first" feel.
*   **Do** use `outline-variant` at 15% opacity if a "Ghost Border" is required for accessibility in complex forms.

### Don't:
*   **Don't** use standard "Grey" shadows. They muddy the clean, premium off-white palette.
*   **Don't** use high-intensity background colors. Colors are for *data*, not for containers.
*   **Don't** use 90-degree corners. Everything must feel soft to the touch (Min `DEFAULT` 1rem radius).
*   **Don't** use icons as primary navigation. Typography is the captain here.