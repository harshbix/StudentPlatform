# Design System Strategy: The Academic Concierge

## 1. Overview & Creative North Star
The "Academic Concierge" is the guiding philosophy of this design system. We are moving away from the cluttered, bureaucratic feel of traditional University portals and toward a high-end, editorial SaaS experience. The goal is "High-Utility Sophistication"—a system that feels as fast as a command-line interface but as polished as a premium digital broadsheet.

### The Creative North Star: "The Digital Curator"
We don't just "show data"; we curate it. This system breaks the "template" look by utilizing **intentional asymmetry** and **tonal depth**. Rather than a rigid, boxed-in grid, we use expansive white space and "floating" content blocks to give the student breathing room. This is a system of layers, not lines.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a neutral "Paper & Ink" foundation, using role-based accents to denote authority and context.

### The Palette
- **Core Neutrals:** `surface` (#f7f9fb) and `on_surface` (#191c1e) provide a high-contrast, accessible base.
- **Student Persona (The Explorer):** Driven by `primary` (#004ac6). Use this for standard student workflows.
- **Representative Persona (The Lead):** Driven by `secondary` (#712ae2). Use this to signal administrative or leadership actions.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Structural boundaries must be defined solely through:
1. **Background Color Shifts:** Placing a `surface_container_low` card on a `surface` background.
2. **Vertical Rhythm:** Using the Spacing Scale (specifically `8` or `10`) to create "voids" that act as separators.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the Material `surface_container` tiers to create "nested" depth. 
*   **The Desk:** `surface` (#f7f9fb) — The lowest level.
*   **The Paper:** `surface_container_lowest` (#ffffff) — Used for primary content cards to create a "lift" from the desk.
*   **The Tray:** `surface_container_high` (#e6e8ea) — Used for inset utility areas like sidebars or search bars.

### The "Glass & Gradient" Rule
To add visual "soul" to an otherwise clinical academic environment:
- **CTAs:** Use a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) for a sense of momentum.
- **Overlays:** For navigation headers, use `surface_container_low` with a 0.8 opacity and `backdrop-blur: 12px` to create a "frosted glass" effect that keeps the background context visible.

---

## 3. Typography: Editorial Authority
We pair **Manrope** (Display/Headlines) with **Inter** (Body/Labels) to balance tech-forward modernism with high-legibility utility.

- **The Display Scale:** Use `display-lg` and `display-md` with tight letter-spacing (-0.02em) to create a bold, editorial feel in dashboards.
- **The Body Scale:** `body-md` (Inter, 0.875rem) is our workhorse. Ensure line-height is set to 1.5x for readability in long-form course descriptions.
- **Asymmetric Hierarchy:** Don't center-align headlines. Use left-aligned `headline-lg` paired with a smaller `label-md` uppercase subtitle to create a professional, structured hierarchy.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to define objects; we use them to define **priority**.

### The Layering Principle
Avoid the "boxed" look. If a card needs to stand out, place a `surface_container_lowest` (#ffffff) card on top of a `surface_container_low` (#f2f4f6) background. This creates a soft, natural lift without visual noise.

### Ambient Shadows
When a "floating" effect is required (e.g., a floating action button or a modal):
- **Value:** `0px 12px 32px rgba(25, 28, 30, 0.06)`
- **Rule:** The shadow color must be a tinted version of `on_surface`, never pure black. This mimics natural light.

### The "Ghost Border" Fallback
If an edge must be defined for accessibility, use the `outline_variant` (#c3c6d7) at **15% opacity**. High-contrast borders are strictly forbidden as they clutter the low-bandwidth optimized experience.

---

## 5. Components: Minimalist Utility

### Buttons
- **Primary:** Gradient (`primary` to `primary_container`), `xl` (1.5rem) rounded corners. Bold, confident.
- **Secondary:** `surface_container_highest` background with `on_surface` text. No border.
- **Tertiary:** Pure text with `primary` color, 600 weight. Use for low-emphasis actions like "Cancel" or "View Details."

### Cards & Lists
- **Zero-Line Lists:** Forbid divider lines. Separate list items using `spacing-4` (1rem) and a background hover state of `surface_container_low`.
- **Content Cards:** Use `rounded-lg` (1rem). Ensure inner padding follows `spacing-6` (1.5rem) to provide an "expensive" amount of white space.

### Inputs
- **Field Styling:** Use `surface_container_lowest` with a "Ghost Border." On focus, the border opacity increases to 100% using the `primary` color. 
- **Touch Targets:** All interactive elements must maintain a minimum height of `spacing-12` (3rem) for mobile accessibility.

### Custom Component: The "Progress Thread"
Instead of a standard progress bar, use a 2px vertical line in `outline_variant` with a `primary` dot. This saves pixels and bandwidth while maintaining the "Academic Editorial" vibe.

---

## 6. Do’s and Don’ts

### Do:
- **Use "White Space" as a Separator:** Let the eye rest between course modules.
- **Prioritize Type over Icons:** If an icon isn't immediately recognizable, use a `label-md` text element. High utility over decoration.
- **Layering over Shadowing:** Use background color shifts to define hierarchy before reaching for a shadow.

### Don’t:
- **No 100% Opaque Borders:** Never use a hard `outline` (#737686) at full opacity to wrap a container.
- **No "Default" Grids:** Avoid perfectly symmetrical 3-column layouts. Try a 2/3 and 1/3 split to create an editorial flow.
- **No Pure Black:** Ensure all "dark" text uses `on_surface` (#191c1e) to keep the UI soft and readable under university library lighting.