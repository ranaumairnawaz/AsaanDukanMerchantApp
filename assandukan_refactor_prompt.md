# Refactor Prompt: AssanDukan Merchant App — Consistency Pass

Paste this into AI Studio along with the existing project. This is a **refactor of the current codebase**, not a rebuild — keep all existing features, API integration, and routes working exactly as they do now. Only change what's described below.

---

## Context

The app already has the right bones: one `App.tsx` shell with a single header and single bottom nav wrapping both the public Community tabs and the authenticated merchant panel, and a correct design-token system in `index.css` (navy/green/amber/cream palette, Lora/Inter/JetBrains Mono fonts, light+dark mode CSS variables). The problem is that most of the merchant-side view components **bypass the token system with hardcoded hex colors**, and there's **no shared UI component library**, so the two halves of the app have drifted apart visually even though they're technically one app. Fix these three things:

---

## Fix 1 — Replace every hardcoded hex color with the existing design tokens

Go through every file in `src/components/` and replace raw hex Tailwind arbitrary values with the equivalent token class already defined in `index.css`. Do not invent new tokens unless something is genuinely missing — reuse what exists:

| Hardcoded value seen in code | Replace with token class |
|---|---|
| `bg-[#0F1A2E]` | `bg-bg-primary` |
| `bg-[#162238]` | `bg-bg-card` |
| `border-[#243554]` / `border-[#3A4A63]` | `border-border-card` / `border-btn-secondary-border` |
| `text-[#94A3B8]` | `text-text-body-muted` |
| `text-[#E0A458]` | `text-accent-amber` |
| `border-[#8A6A3A]` | `border-accent-amber-border` |
| `bg-[#1E8449]` / `bg-[#176B3A]` | `bg-btn-primary` / `bg-btn-primary-hover` |
| `bg-[#F5F0E4]` | `bg-card-cream` |
| `text-[#1A1A1A]` | `text-text-dark` |
| `text-[#B23A2E]` | `text-total-red` |
| `text-white` (on dark cards) | `text-text-white` where it should stay pure white regardless of light/dark mode; `text-text-main` where it should adapt |

Priority order (worst offenders first): `SectionsView.tsx` (90 instances), `ThemeView.tsx` (88), `DashboardView.tsx` (65), `ProductsView.tsx` (64), `SettingsView.tsx` (49), `CouponsView.tsx` (41), `DomainView.tsx` (38), `StaffView.tsx` (37), `BillingView.tsx` (25), `OrdersView.tsx` (21).

**Acceptance test:** toggle light/dark mode (the existing sun/moon button in the header) on every single merchant screen — every card, border, and text color must switch correctly. Today most merchant screens are stuck looking dark-mode-only because their colors are hardcoded.

Status-specific colors that aren't in the palette yet (order status badges: blue/purple/indigo/emerald/rose for confirmed/processing/shipped/delivered/cancelled) can stay as semantic Tailwind colors (`blue-400`, `purple-400`, etc.) — those aren't part of the brand palette and are fine as-is, just centralize them (see Fix 2).

---

## Fix 2 — Build a shared `components/ui/` library and use it everywhere

Create `src/components/ui/` with these primitives, extracted from the best existing implementation already in the codebase (don't redesign — just centralize what's already there):

- **`Spinner.tsx`** — the loading spinner markup (currently duplicated ~14 times with slightly different sizes/colors across every view file).
- **`StatusBadge.tsx`** — takes an order/coupon/product status string, returns the correctly colored pill. Extract the `getStatusStyle` logic currently only in `DashboardView.tsx` and reuse it in `OrdersView.tsx` and anywhere else a status pill is rendered.
- **`Button.tsx`** — `primary` (solid `bg-btn-primary`), `secondary` (outlined), and `danger` (red, for delete/logout actions) variants. Replace every one-off button `className` string across all view files with this component.
- **`Card.tsx`** — the standard `bg-bg-card border border-border-card rounded-2xl p-6` container used everywhere, so radius/padding/shadow can't drift between screens.
- **`EmptyState.tsx`** — the "nothing here yet" pattern (already used in `DashboardView` for "No customer purchases processed yet" and similar messages in other views) — one component, icon + title + subtext props.
- **`ReceiptCard.tsx`** — the cream, serrated-bottom, monospace order-summary card pattern currently hand-built inside `DashboardView.tsx`. Pull it out so it can be reused anywhere else an order/receipt needs to be shown (e.g. `OrdersView.tsx` detail screen).

After extracting each component, go through every view file and replace the inline duplicate markup with the shared component. No view file should hand-roll its own spinner, badge, or button styling afterward.

---

## Fix 3 — Simplify the bottom tab bar so it isn't confusing pre-login

Current behavior: the bottom bar shows **Community / Dashboard / Menu**. When logged out, tapping either "Dashboard" or "Menu" shows the exact same Login screen — two tabs doing the same thing, and "Dashboard" is a misleading label for a login form.

Change to:

- **Logged out:** bottom bar shows **Community | Login** (2 tabs — drop the redundant third tab entirely, or keep it as **Community | News | Login** if you want News split out as its own tab; either way, no two tabs should both just show the login form).
- **Logged in:** bottom bar shows **Community | Dashboard | Menu** (as it does now) — this makes sense once there's an actual dashboard to show instead of a login form, so only apply the 3-tab layout after `currentUser` is set.
- The tab bar component itself should read `currentUser` and conditionally render 2 vs 3 tabs, rather than always rendering 3 tabs with 2 of them pointing at the same login gate.
- Keep the existing "tap into any merchant tool while logged out → shown the Login form" fallback behavior for deep-linkable actions (e.g. from the PublicTabs "Start Free Trial" CTA) — that part already works correctly and doesn't need to change.

---

## What NOT to change

- Keep all existing API calls in `src/utils/api.ts` exactly as they are.
- Keep the existing routes/screens for Products, Orders, Coupons, Theme, Sections, Settings, Domain, Staff, Billing — only touch their internal styling, not their logic or API integration.
- Keep the PWA install prompt, offline banner, and toast system as they are.
- Keep the existing fonts (Lora / Inter / JetBrains Mono) and color values in `index.css` — this refactor is about *using* those tokens consistently, not changing them.

---

## Acceptance checklist before calling this done

- [ ] Zero raw hex Tailwind arbitrary values (`bg-[#...]`, `text-[#...]`, `border-[#...]`) remain in any file under `src/components/`, except semantic status colors explicitly allowed in Fix 1.
- [ ] Light/dark toggle works correctly on every merchant screen, not just Community.
- [ ] Every spinner, button, badge, card, and empty-state in the app renders from the shared `components/ui/` files — `grep` for duplicate `animate-spin` markup or duplicate `getStatusStyle`-type functions should return nothing outside `components/ui/`.
- [ ] Logged-out bottom bar never shows two tabs that both just render the Login form.
- [ ] No visual regression: take a screenshot of every screen before and after, confirm nothing moved or broke, only the color/component source changed.
