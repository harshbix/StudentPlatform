# Design System Document: The Authoritative Canvas

## 1. Overview & Creative North Star: "Precision Authority"
This design system is engineered for high-stakes administrative environments where data density meets executive command. We are moving away from the "friendly SaaS" aesthetic toward **Precision Authority**. 

The North Star for this system is the **Command Console**. It draws inspiration from the rigid efficiency of *Linear* and the refined technical polish of *Stripe*. We reject the "bubbly" web; instead, we embrace a high-contrast, editorial layout that uses sharp geometry and sophisticated tonal layering to communicate power. We break the "template" look by using intentional white space as a structural element and a singular, aggressive accent color (`primary: #bb0c01`) to signal administrative intent.

---

## 2. Colors & Surface Philosophy
The palette is a study in neutrals, punctuated by a "Power Red." 

### The Neutral Foundation
*   **Background (`#fcf9f8`):** An off-white, paper-like base that reduces eye strain in data-dense environments.
*   **Surface Containers:** We use a hierarchy of five tiers (`lowest` to `highest`) to create depth without relying on antiquated shadows.

### The "No-Line" Rule
**Explicit Instruction:** Do not use `1px solid` borders to section off large areas of the UI. Separation must be achieved through background shifts. For example, a sidebar should be `surface-container-low`, the main content area `surface`, and a utility panel `surface-container-high`. This creates a seamless, "milled" look rather than a boxed-in feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested precision plates:
1.  **Base Layer:** `surface` (#fcf9f8)
2.  **Sectioning:** `surface-container-low` (#f6f3f2)
3.  **Active Workspace:** `surface-container-lowest` (#ffffff) for the highest focus.
4.  **Floating Utilities:** `surface-container-highest` (#e5e2e1) for contrast against the base.

### The "Glass & Gradient" Rule
To elevate the "Admin" feel, floating modals or dropdowns should use **Glassmorphism**: 
*   Apply `surface-container-lowest` at 85% opacity with a `20px` backdrop-blur. 
*   **Signature Textures:** For primary action buttons, use a subtle vertical gradient from `primary` (#bb0c01) to `primary-container` (#e02e1b). This adds a "physical" weight to the button that a flat hex code cannot achieve.

---

## 3. Typography: The Editorial Grid
We utilize **Inter** exclusively for its neutral, technical clarity. The goal is to make complex data feel like a well-set financial newspaper.

*   **Display (lg/md/sm):** Used for high-level dashboard metrics. Tracking should be set to `-0.02em` to feel tighter and more authoritative.
*   **Headline (lg/md/sm):** Reserved for page titles. Use `headline-sm` (1.5rem) for most headers to maintain high information density.
*   **Body (lg/md/sm):** The workhorse. `body-md` (0.875rem) is the default for table data. Use `on-surface-variant` (#5c403b) for secondary data to create a clear visual hierarchy.
*   **Labels (md/sm):** Used for table headers and "micro-copy." These should always be uppercase with `+0.05em` letter spacing for a "technical blueprint" feel.

---

## 4. Elevation & Depth: Tonal Layering
Traditional structural lines are replaced by the **Layering Principle**. 

*   **The Layering Principle:** Depth is "stacked." Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a soft, natural lift.
*   **Ambient Shadows:** For floating elements (Modals/Popovers), use a "Ghost Shadow": `0px 12px 32px rgba(28, 27, 27, 0.06)`. The shadow color is derived from `on-surface`, making it feel like part of the environment.
*   **The "Ghost Border" Fallback:** If a border is required for a table or input, use `outline-variant` (#e6bdb6) at **20% opacity**. Never use 100% opaque borders; they clutter the user's cognitive load.
*   **Glassmorphism:** Use for "floating" command bars or navigation headers to allow the data to scroll underneath, maintaining context while signaling a higher Z-index.

---

## 5. Components: Sharp & Dense

### Buttons
*   **Primary:** Sharp edges (`rounded-sm`: 0.125rem). Gradient from `primary` to `primary-container`. High-contrast `on-primary` text.
*   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
*   **Tertiary:** Transparent background. Text color is `primary`. On hover, add a subtle `surface-container-high` background.

### Input Fields
*   **Style:** Minimalist. No background. A bottom-only "Ghost Border" using `outline-variant` at 40% opacity. 
*   **Focus State:** The bottom border shifts to `primary` (#bb0c01) with a 2px thickness.
*   **Error:** Use `error` (#ba1a1a) for the border and helper text.

### Tables (High-Density)
*   **Rules:** Forbid horizontal and vertical dividers. 
*   **Separation:** Use a subtle background shift (`surface-container-low`) on every second row (Zebra striping) or simply rely on `spacing-3` (0.6rem) vertical padding.
*   **Headers:** Use `label-sm`, uppercase, in `on-surface-variant`.

### Cards & Lists
*   **Philosophy:** Cards should not have borders. Use the `surface-container-lowest` color to define the card area against a `surface-container-low` background. 
*   **Spacing:** Use `spacing-5` (1.1rem) for internal padding to ensure data "breathes" despite the high density.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use `primary` (#bb0c01) sparingly. It is a "surgical" color—use it only for destructive actions, primary CTAs, or critical alerts.
*   **Do** favor sharp corners (`rounded-none` or `rounded-sm`). This reinforces the "Authority" brand.
*   **Do** use the spacing scale religiously. Precision in alignment (e.g., using exactly `2.25rem` for margins) is what makes a layout feel "premium."

### Don’t:
*   **Don’t** use shadows on buttons or cards unless they are "floating" (modals).
*   **Don’t** use icons without labels in the main navigation. Clarity beats "minimalism" in an admin panel.
*   **Don’t** use generic grays. Our neutrals are slightly "warm" (`#fcf9f8`), which prevents the UI from feeling cold or "out-of-the-box."
*   **Don't** use 1px solid black lines. They disrupt the editorial flow. Use tonal shifts.