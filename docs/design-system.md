## 1. Design Direction

**Inspiration:** Goldwin (goldwin.co.jp) — Japanese performance apparel. Modern, minimal, premium. Let whitespace and typography signal quality rather than decoration.

**Brand positioning:** running.moximoxi.net sells Japanese running products to Chinese runners who view Japan as aspirational. The design must communicate: *this is special, curated, and worth the premium over Taobao.*

**Principles:**
- Whitespace is the primary luxury signal — never fill space for the sake of it
- Typography carries the hierarchy — not colour, not icons
- One accent colour, used sparingly
- Photography and product imagery do the emotional work
- No gradients, no drop shadows, no rounded corners on primary elements

---

## 2. Colour Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#FAFAF8` | Page background — warm off-white, not pure white |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-border` | `#E8E8E4` | Dividers, card borders |
| `--color-text-primary` | `#1A1A1A` | Body text, headings |
| `--color-text-secondary` | `#6B6B6B` | Captions, metadata, labels |
| `--color-text-disabled` | `#ABABAB` | Placeholder, disabled states |
| `--color-accent` | `#C8102E` | Primary CTA, active state, badges — used sparingly |
| `--color-accent-hover` | `#A00D24` | Hover state on accent elements |
| `--color-success` | `#2D6A4F` | Open registration badge |
| `--color-warning` | `#B5770D` | Closing soon badge |
| `--color-error` | `#C8102E` | Error states (shares accent) |

**Rationale:** Warm off-white base feels premium over stark white. Deep red accent is a nod to Japanese visual identity without being heavy-handed.

---

## 3. Typography

| Token | Value | Usage |
|---|---|---|
| `--font-headline` | `'Manrope', sans-serif` | Editorial headings, page titles, card names — uppercase, tight tracking |
| `--font-sans` | `'Inter', 'Noto Sans SC', sans-serif` | All UI body text, labels, metadata |
| `--font-size-xs` | `11px` | Labels, badges |
| `--font-size-sm` | `13px` | Captions, metadata |
| `--font-size-base` | `15px` | Body text |
| `--font-size-md` | `17px` | Sub-headings |
| `--font-size-lg` | `22px` | Section headings |
| `--font-size-xl` | `30px` | Page titles |
| `--font-size-2xl` | `42px` | Hero headings |
| `--font-weight-normal` | `400` | Body |
| `--font-weight-medium` | `500` | Labels, nav |
| `--font-weight-semibold` | `600` | Headings |
| `--letter-spacing-tight` | `-0.02em` | Large headings — Goldwin-style tight tracking |
| `--letter-spacing-wide` | `0.08em` | Uppercase labels, badges |
| `--line-height-body` | `1.6` | Body text |
| `--line-height-heading` | `1.15` | Headings |

**Note:** `Noto Sans SC` ensures Chinese characters render cleanly since the audience is Chinese.

---

## 4. Spacing

8px base unit. All spacing is a multiple of 8.

| Token | Value |
|---|---|
| `--space-1` | `8px` |
| `--space-2` | `16px` |
| `--space-3` | `24px` |
| `--space-4` | `32px` |
| `--space-6` | `48px` |
| `--space-8` | `64px` |
| `--space-12` | `96px` |
| `--space-16` | `128px` |

---

## 5. Components

### Cards
- White background (`--color-surface`)
- 1px border (`--color-border`) — no shadow
- No border-radius (sharp corners — Goldwin aesthetic)
- Hover: border darkens slightly (`#C8C8C4`)

### Buttons
- **Primary:** `--color-accent` background, white text, no border-radius, `--letter-spacing-wide`, uppercase
- **Secondary:** transparent background, `--color-text-primary` border, same text treatment
- **Ghost:** no border, `--color-text-secondary`, underline on hover
- No rounded corners on any button

### Badges (entry status)
- Small, uppercase, `--letter-spacing-wide`, `--font-size-xs`
- Open: `--color-success` text on light green tint background
- Closed: `--color-text-disabled` on `--color-border` background
- Closing soon: `--color-warning` text on light yellow tint

### Dividers
- 1px, `--color-border`
- Use generously — clean separation over visual noise

---

## 6. Development Tooling

### Google Stitch
Using [Google Stitch](https://stitch.withgoogle.com/) to accelerate UI component generation. Stitch generates React components from design prompts — use it for initial component scaffolding, then refine to match this design system.

**Workflow:** describe component in Stitch → export → replace hardcoded colours/spacing/fonts with design system tokens.

### Tailwind CSS (Race Hub + Dashboard)
Both SPAs use Tailwind CSS. Design tokens are defined in two places that must stay in sync:

1. **CSS custom properties** in `styles/tokens.css` (for any custom CSS that falls outside Tailwind utilities)
2. **`tailwind.config.js`** extending the default theme so utility classes (`bg-accent`, `text-primary`, `border-border`) map directly to the design system values

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg:             '#FAFAF8',
        surface:        '#FFFFFF',
        border:         '#E8E8E4',
        'text-primary': '#1A1A1A',
        'text-secondary':'#6B6B6B',
        'text-disabled': '#ABABAB',
        accent:         '#C8102E',
        'accent-hover': '#A00D24',
        success:        '#2D6A4F',
        warning:        '#B5770D',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
      },
      spacing: {
        // 8px base unit
        '1': '8px', '2': '16px', '3': '24px', '4': '32px',
        '6': '48px', '8': '64px', '12': '96px', '16': '128px',
      },
      borderRadius: {
        DEFAULT: '0', // Sharp corners — Goldwin aesthetic. No rounded corners.
      },
      letterSpacing: {
        tight: '-0.02em',
        wide:  '0.08em',
      },
    },
  },
}
```

```css
/* styles/tokens.css — used only where Tailwind utilities don't reach */
:root {
  --color-bg: #FAFAF8;
  --color-accent: #C8102E;
  /* ... all tokens */
}
```

**Rule:** prefer Tailwind utilities first. Fall back to CSS custom properties only for things Tailwind can't express (e.g. SSE-driven dynamic inline styles, complex pseudo-selectors).

### WordPress — Flatsome Theme
Flatsome supports global custom CSS via **Appearance → Customize → Additional CSS**. Define the same CSS custom properties there — Flatsome's UX Builder blocks and custom HTML blocks can reference them directly.

```css
/* Paste into Flatsome Additional CSS */
:root {
  --color-bg: #FAFAF8;
  --color-accent: #C8102E;
  /* ... all tokens */
}
```

**Flatsome-specific overrides:**
- Set primary colour in **Theme Options → Styling** to `#C8102E`
- Set body font to Inter (add via Google Fonts in Theme Options → Fonts)
- Disable Flatsome's default border-radius on buttons via Additional CSS:
  ```css
  .button, .cart-button, input[type="submit"] { border-radius: 0 !important; }
  ```

**Limitation:** Flatsome's UX Builder has its own spacing/colour presets that don't read CSS variables in all contexts. For full control, use Custom HTML blocks and write markup directly using the token classes.

---

## 7. Scope — What Uses This System

| Surface | Tech | How tokens are applied |
|---|---|---|
| Race Hub SPA | React + Vite + Tailwind (embedded in WordPress as plugin) | `tailwind.config.js` + `tokens.css` at app root |
| Dashboard SPA | Next.js + Tailwind (operator-facing) | `tailwind.config.js` + `tokens.css` at app root |
| WooCommerce storefront | WordPress + Flatsome | Additional CSS in Flatsome customizer |
| XHS posts | N/A — XHS has its own format | Not applicable |

---

## 8. Open Questions

- **Font loading:** Self-host Inter + Noto Sans SC, or load from Google Fonts? Self-hosting is faster and avoids GDPR/privacy concerns for Chinese users. Decide before first React SPA build.
- **Dark mode:** Dashboard could support it (operator tool, often used at night). Race Hub and WooCommerce should stay light — premium brands rarely do dark mode storefronts.
