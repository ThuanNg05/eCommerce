# UI Design System — Admin (STRICT)

This document is **binding**. The UI agent (Antigravity) MUST follow every token and rule
here. When something is not covered, choose the option that is *most minimal* and *most
consistent* with the tokens below — never introduce a new color, shadow, or radius ad hoc.

Scope: the admin back-office UI in `web/**`. Stack in use: **React 18 + TypeScript, MUI v6,
Tailwind CSS v3, AG Grid v32, TanStack Query**. Apply tokens through these (see §7), do not
hardcode hex values in components.

---

## 1. Design principles (non-negotiable)

1. **Minimalist, light, calm.** Two background fills only: `#f9f9f9` (app canvas) and
   `#ffffff` (surfaces). Nothing else is a background.
2. **Flat, not glossy.** Separation comes from **1px borders**, not shadows. Shadows are
   reserved for floating overlays only (menus, dialogs) via the single shadow token.
3. **Monochrome + one accent.** The palette is neutral grays/black/white plus **exactly one**
   accent color, used sparingly (links, focus ring, active nav, selected row).
4. **Content first.** Generous whitespace, restrained type, no decoration for decoration's sake.

---

## 2. Color tokens (exact — do not alter)

### Backgrounds
| Token | Hex | Use |
|-------|-----|-----|
| `--bg-app` | `#f9f9f9` | Page/app canvas, main content area |
| `--bg-surface` | `#ffffff` | Cards, sidebar, top bar, inputs, tables, menus, dialogs |
| `--bg-hover` | `#f2f2f2` | Hover tint on white items/rows (interaction only) |
| `--bg-active` | `#eeeeee` | Selected/active nav or row base |

### Borders
| Token | Hex | Use |
|-------|-----|-----|
| `--border` | `#ededed` | Default dividers, card/table borders |
| `--border-strong` | `#e0e0e0` | Inputs, buttons, emphasized separation |

### Text
| Token | Hex | Use |
|-------|-----|-----|
| `--text-primary` | `#171717` | Headings, key values |
| `--text-body` | `#404040` | Body, table cells, labels |
| `--text-secondary` | `#737373` | Secondary text, section headers |
| `--text-muted` | `#a3a3a3` | Placeholders, disabled, hints |

### Action / accent
| Token | Hex | Use |
|-------|-----|-----|
| `--ink` | `#1a1a1a` | Primary buttons, primary actions (near-black) |
| `--ink-hover` | `#000000` | Primary button hover |
| `--accent` | `#7299ED` | **Sparingly**: links, active nav indicator, selected row, focus ring |
| `--accent-weak` | `#EEF3FD` | Faint accent tint (selected row background, active nav bg) |
| `--focus-ring` | `rgba(114,153,237,0.40)` | Keyboard focus ring |

### Semantic (text-forward, pale backgrounds)
| Purpose | Text | Background (chip/banner) |
|---------|------|--------------------------|
| Success | `#15803d` | `#f0fdf4` |
| Warning | `#b45309` | `#fffbeb` |
| Danger  | `#b91c1c` | `#fef2f2` |
| Info    | `#1d4ed8` | `#eff6ff` |

---

## 3. Typography

- **Font:** `Inter`, fallback `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- **Base:** 14px / line-height 1.5 (admin density). Do not go below 12px.
- **Scale:** xs 12 · sm 13 · base 14 · lg 16 · xl 18 · 2xl 20 · 3xl 24.
- **Weights:** 400 body · 500 buttons/labels · 600 headings & key figures. No weight ≥ 700.
- **Color:** headings `--text-primary`, body `--text-body`, secondary `--text-secondary`.
- Numbers in tables: use `font-variant-numeric: tabular-nums`.
- **Currency (VND):** format with `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })`. VND has **no minor unit — never show decimals**. Price fields (`basePrice`, `priceRetail`, `priceWholesale`, `total`, `subtotal`) are whole integers; render e.g. `1.250.000 ₫`.

---

## 4. Shape, spacing, elevation

- **Radius:** cards/panels/menus **8px**; buttons/inputs/chips **6px**; small badges **4px**.
  Never exceed **12px**. No fully-pill controls except avatars.
- **Spacing scale (px):** `4, 8, 12, 16, 20, 24, 32, 40`. Use only these steps.
- **Elevation:** default = flat + `1px solid var(--border)`. The **only** shadow allowed, for
  floating overlays (menu/dropdown/dialog/popover):
  `box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);`
- **Motion:** 120–160ms `ease`; transition only `background-color`, `border-color`, `opacity`,
  `color`. No transform/scale flourishes, no entrance animations on page load.

---

## 5. Layout & navigation

### App shell
- Left **sidebar** (fixed) + **top bar** + **main content**.
- Main content background `--bg-app`, padding `24px`. Form pages max-width `880px`.

### Sidebar (width **240px**; optional collapsed **64px** icon-only)
- Background `--bg-surface`, right border `1px solid var(--border)`.
- **Grouped nav** with section labels (see §6 for the exact items).
  - Section label: 11px, uppercase, letter-spacing `0.04em`, `--text-muted`, padding `12px 16px 4px`.
  - Nav item: height 40px, radius 8px, margin `2px 8px`, padding `0 12px`, icon+label gap 10px,
    text 14px `--text-body`, line icon 18px.
  - Hover: background `--bg-hover`.
  - **Active:** background `--accent-weak`, text `--text-primary` weight 600, icon `--accent`,
    and a 2px `--accent` left indicator. Use this one active style only.
- App/logo block at top: 56px tall, matches top-bar height, bottom border `1px var(--border)`.

### Top bar (height **56px**)
- Background `--bg-surface`, bottom border `1px solid var(--border)`. **Not dark.**
- Left: current page title (lg, weight 600). Right: search field, then user chip.
- (Replace the current dark `#0f172a` AppBar and any emoji nav buttons with this.)

---

## 6. Sidebar information architecture (implement exactly)

Show/hide groups by `RoleId` (Admin sees all; Staff sees Catalog + Operations + Dashboard).

```
TỔNG QUAN
  • Bảng điều khiển        /dashboard        (dashboard icon)

DANH MỤC
  • Sản phẩm               /products         (box)
  • Danh mục               /categories       (tag)
  • Khung                  /frames           (frame)
  • Tấm lưng               /backboards       (square)
  • Tấm lưng phụ           /sub-backboards   (layers)
  • Vật liệu               /materials        (package)

VẬN HÀNH
  • Kho (Nhập/Xuất)        /inventory        (arrow-left-right)
  • Khách hàng             /customers        (users)
  • Hóa đơn                /invoices         (file-text)

QUẢN TRỊ                    (Admin only)
  • Định giá               /pricing          (calculator)
  • Báo cáo                /reports          (bar-chart)
  • Tài khoản              /accounts         (user-cog)
  • Cấu hình email         /settings         (settings)
  • Nhật ký thay đổi       /audit            (history)
```

Icons: use one line-icon set (e.g. `lucide-react` or MUI outlined), 18px, consistent stroke.
**No emoji as UI icons.**

---

## 7. Component rules

**Buttons** (height 36px, radius 6px, weight 500, padding `0 16px`, no shadow):
- Primary: bg `--ink`, text `#fff`; hover `--ink-hover`.
- Secondary: bg `--bg-surface`, border `1px var(--border-strong)`, text `--text-primary`; hover bg `--bg-hover`.
- Ghost/Text: no border, text `--text-body`; hover bg `--bg-hover`.
- Destructive: text/border `#b91c1c`; solid `#b91c1c` only for the final confirm action.
- Disabled: `--text-muted`, no hover.

**Inputs / selects** (height 36px, radius 6px): bg `--bg-surface`, border `1px var(--border-strong)`,
text 14px, placeholder `--text-muted`. Focus: border `--accent` + `0 0 0 3px var(--focus-ring)`.
Label above field, 13px `--text-secondary`.

**Cards / panels:** bg `--bg-surface`, border `1px var(--border)`, radius 8px, padding 16–24px, no shadow.

**Tables (AG Grid — quartz theme, customized):**
- Header bg `--bg-surface`, header text 12px uppercase `--text-secondary`, weight 600.
- Row height 44px, cell border `--border`, hover row `--bg-app`, selected row `--accent-weak`.
- Right-align numeric columns, tabular-nums. Compact, borderless outer frame (rely on card border).

**Chips/badges (status):** pale semantic bg + semantic text, radius 4px, 12px, no border.

**Dialogs/menus:** bg `--bg-surface`, radius 8px, the single overlay shadow token, backdrop `rgba(0,0,0,0.4)`.

---

## 8. How to apply the tokens (do this, don't inline hex)

**a) CSS variables** — declare in `web/src/index.css` `:root` (all tokens from §2, plus radii/spacing).

**b) Tailwind** — extend `tailwind.config.js` to reference the vars:
```js
theme: { extend: {
  colors: {
    app: 'var(--bg-app)', surface: 'var(--bg-surface)',
    border: 'var(--border)', ink: 'var(--ink)', accent: 'var(--accent)',
    'text-primary': 'var(--text-primary)', 'text-body': 'var(--text-body)',
    'text-secondary': 'var(--text-secondary)', 'text-muted': 'var(--text-muted)',
  },
  borderRadius: { DEFAULT: '6px', card: '8px' },
}}
```

**c) MUI theme** — a single `createTheme` mapping the palette + component defaults:
```ts
createTheme({
  shape: { borderRadius: 6 },
  palette: {
    mode: 'light',
    background: { default: '#f9f9f9', paper: '#ffffff' },
    primary: { main: '#1a1a1a' },
    text: { primary: '#171717', secondary: '#737373' },
    divider: '#ededed',
  },
  typography: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
    MuiPaper:  { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #ededed' } } },
    MuiAppBar: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundColor: '#ffffff', color: '#171717', borderBottom: '1px solid #ededed' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
  },
})
```

**d) AG Grid** — quartz theme with variable overrides:
```css
.ag-theme-quartz {
  --ag-background-color: #ffffff;
  --ag-header-background-color: #ffffff;
  --ag-odd-row-background-color: #ffffff;
  --ag-row-hover-color: #f9f9f9;
  --ag-selected-row-background-color: #EEF3FD;
  --ag-border-color: #ededed;
  --ag-header-foreground-color: #737373;
  --ag-font-size: 14px;
  --ag-font-family: Inter, system-ui, sans-serif;
  --ag-row-height: 44px;
}
```

---

## 9. MUST NOT (hard bans)

- ❌ Any background color other than `#f9f9f9` / `#ffffff` (and the defined hover/active grays).
- ❌ Gradients, glassmorphism/blur, glows, drop shadows beyond the single overlay token.
- ❌ More than one accent color; saturated/bright fills; colored page backgrounds.
- ❌ Border radius > 12px; pill-shaped buttons/inputs.
- ❌ Emoji as UI icons; mixed icon sets; filled+outlined icons together.
- ❌ Font weight ≥ 700; font size < 12px.
- ❌ Hardcoded hex in components — always go through the tokens in §8.
- ❌ Dark mode (light theme only) unless explicitly requested later.

---

## 10. Definition of done (per screen)

- Uses only tokens from §2–§4; passes a grep for stray hex values.
- Sidebar/top-bar match §5–§6 exactly; icons are one line-icon set.
- Text contrast ≥ WCAG AA; keyboard focus visible (`--focus-ring`); hit targets ≥ 36px.
- No shadow except overlays; all surfaces separated by 1px borders.
