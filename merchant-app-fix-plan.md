# MeriDukan Merchant SPA — Full Diagnosis & Fix Plan

This document is written so you can hand it directly to a developer or to an AI coding
agent (Claude Code / Antigravity) and have it implemented section by section. Each item
has: **what's wrong**, **why (root cause)**, and **exactly what to change**.

Codebase reviewed:
- `assandukan-merchant-app.zip` — React + Vite SPA (built in Google AI Studio), calls `/api/merchant/*`
- `MerchantAppController.php` — Laravel API controller backing the SPA
- `CommunityContentController.php` + `api.php` — legacy Admin/Community API
- `merchant_spa_requirements.md` — original spec for the SPA

---

## 0. Root Cause Summary (read this first)

Almost every visible bug traces back to **response-shape mismatches** between the
Laravel controller and the React `ApiClient` (`src/utils/api.ts`), plus **leftover
"AI Studio demo mode" scaffolding** that was never fully stripped out. None of these
require a redesign — they're contract fixes.

| # | Symptom reported | Root cause |
|---|---|---|
| 3 | Customer name missing in "Latest Orders" | Backend sends `customer` (nested/string), frontend reads `customer_name` (flat) — field name mismatch |
| 4a | Product catalog shows empty despite having products | Backend paginates products *inside* the `products` key (`data.products.data`), frontend only checks `data.products` as a plain array |
| 4b | Billing section blank | Backend sends `features` as related model objects; frontend renders `{feat}` assuming a plain string — React throws and blanks the panel |
| 4c | "more errors" | Two frontend API calls hit routes that don't exist at all (`/customers/{id}`, `/domain/check-availability`) → silent 404s |
| 2 | Demo mode | `isDemo()` is hard-coded to `false` (good — it's already disabled), but ~150 lines of dead mock-data branches, `localStorage` demo keys, and a "Sandbox / Live API" badge are still shipped in every build |
| 1, 4 | "Feels like two apps" | Structurally it *is* one shell (single bottom nav, login renders inline, not a separate page) — the mismatch is **visual**: the Announcements/News cards use light cream (`bg-card-cream`, `text-text-dark`) styling while Events cards and the entire Merchant Panel use the dark navy theme. Same app, two clashing skins. |

---

## 1. Make It Look Like ONE App (Public Hub + Merchant Panel)

**Current state (verified in code):** `App.tsx` already uses a single persistent shell —
one bottom tab bar (`community` / `dashboard` / `menu`), and `LoginView` renders *inline*
inside the `dashboard`/`menu` tab rather than replacing the whole screen. So the
navigation architecture is already unified — good, don't rebuild it.

**What actually breaks the "one app" feeling:**
- In `PublicTabs.tsx`, Announcement/News cards use the **light "receipt-paper" card**
  (`bg-card-cream`, `text-text-dark`), while Event cards and detail modals for events use
  the **dark navy** merchant palette (`bg-[#162238]`, `text-white`). A user swiping between
  Announcements → Events sees a jarring light→dark flip mid-tab.
- The Merchant Panel is 100% dark navy. Community tab is a mix. There's no shared header
  treatment (logo/branding) between the two areas.

**Fix instructions:**
1. Standardize `PublicTabs.tsx` on the **dark navy / paper-cream design system already
   established for MerchantLayout** (per project convention: night navy background,
   warm paper-cream cards used only as *accent* surfaces, paan-leaf green primary,
   marigold secondary, rickshaw red for destructive actions; Fraunces for headings,
   Plus Jakarta Sans for body, IBM Plex Mono for numbers/dates).
   - Pick ONE card treatment for Announcements, News, and Events (recommend the dark
     `bg-[#162238]` card used by Events, since that's what the Merchant Panel already uses).
   - Reserve the cream/paper card for the expanded reader/detail-modal ONLY if you want a
     "reading" contrast, but do this consistently for all three content types, not just two.
2. Add a persistent top header/logo bar that renders identically whether the user is on
   Community tabs or inside the Merchant Panel, so there's a constant visual anchor.
3. Remove the light/dark modal branching in `PublicTabs.tsx`
   (`selectedItem.type === 'event' ? 'bg-[#111c30] text-white' : 'bg-card-cream text-text-dark'`)
   — one modal skin for all three content types.
4. Re-skin the WhatsApp-native "Coming from admin panel" visual cues (if any bleed
   through from the old Blade/Inertia admin) so nothing in the merchant app visually
   resembles the separate Laravel admin dashboard.

---

## 2. Remove Demo Mode Completely

`ApiClient.isDemo()` already always returns `false`, so demo mode cannot currently be
triggered by a user — but the app still ships significant dead weight and one leftover
UI element that reference it. Antigravity (or whoever built this) left it half-removed.

**Delete/clean up in `src/utils/api.ts`:**
- All `INITIAL_ANNOUNCEMENTS`, `INITIAL_NEWS`, `INITIAL_EVENTS`, `INITIAL_PRODUCTS`,
  `INITIAL_ORDERS`, `INITIAL_CUSTOMERS`, `INITIAL_COUPONS`, `INITIAL_THEME`,
  `INITIAL_SECTIONS`, `INITIAL_SETTINGS`, `INITIAL_DOMAIN`, `INITIAL_STAFF`,
  `INITIAL_BILLING` mock constants.
- Every `const isDemo = this.isDemo(); if (isDemo) { ... }` branch in every method
  (`getDashboard`, `getProducts`, `getProduct`, `getOrders`, `getOrder`, `getCustomer`,
  `getCoupons`, `getTheme`, `getSections`, `getSettings`, `getDomain`, `getStaff`,
  `getBilling`, `login`, `logout`, `getMe`, and the various `store/update/delete/toggle`
  methods) — keep only the real-API branch.
- `KEYS.DEMO_MODE` and any `merchant_mock_*` / `merchant_demo_mode` localStorage keys.
- `enableDemoMode()`, `setDemo()`, `isDemo()` — delete entirely, or if you want to keep a
  `login(forceDemo)` seam for future QA/testing, gate it behind a build-time env flag
  (`import.meta.env.DEV`) instead of shipping it to production.
- **Also fix the silent-fallback anti-pattern**: many methods do
  `return getStored<X>(KEYS.X, INITIAL_X)` when a real API call fails (see `getDashboard`,
  `getProducts`, `getOrders`, `getStaff`, `getBilling`, etc.) — meaning a real backend
  500/network error is currently masked by fake data instead of surfacing an error toast.
  Replace every "offline fallback returns mock data" path with a thrown error that the
  view's existing `catch (e) { showToast(e.message, 'error') }` handler already expects.

**Delete/clean up in `src/App.tsx`:**
- `isDemoMode` state (line ~55, ~208, ~247, ~257) and the "Sandbox / Live API" badge
  (~line 487-492). Since real auth is the only path now, this badge is dead UI.

**Delete/clean up in `LoginView.tsx`:**
- Confirm there's no leftover "Try Demo" button/handler (verified none currently
  visible, but check after the api.ts refactor since some props may become unused).

---

## 3. Fix: Customer Name Missing in Latest Orders (Dashboard) & Orders List

**Root cause:** `MerchantAppController::dashboard()` maps recent orders as:
```php
->map(fn($o) => [
    'id' => $o->id,
    'order_number' => $o->order_number,
    'customer' => $o->customer?->name,   // <-- flat string under key "customer"
    ...
]);
```
But `DashboardView.tsx` and `OrdersView.tsx` both read `order.customer_name`,
`order.customer_phone`, `order.customer_address` (see `types.ts` → `Order.customer_name`
is a required flat field). `getOrders()` also just returns the raw `Order` Eloquent
model with a `customer` **relation** attached — it never flattens to
`customer_name/customer_phone/customer_address`.

**Fix — pick ONE approach and apply it consistently everywhere an Order is returned
(`dashboard()`, `getOrders()`, `showOrder()`, `updateOrder()`):**

Recommended: add flat fields via a `toArray()` transform / API resource so every Order
payload always includes both the relation AND the flat fields the frontend expects:

```php
private function transformOrder(Order $order): array
{
    $arr = $order->toArray();
    $arr['customer_name']    = $order->customer?->name    ?? $arr['customer_name'] ?? null;
    $arr['customer_phone']   = $order->customer?->phone   ?? $arr['customer_phone'] ?? null;
    $arr['customer_address'] = $order->customer?->address ?? $arr['customer_address'] ?? null;
    return $arr;
}
```
Then in `dashboard()`:
```php
$recentOrders = Order::where('tenant_id', $tenant->id)->with('customer')
    ->latest()->take(5)->get()
    ->map(fn($o) => $this->transformOrder($o));
```
And wrap `getOrders()` / `showOrder()` / `updateOrder()->fresh()` results through the
same helper before returning. (Best practice: turn this into a proper
`App\Http\Resources\OrderResource` so it's applied uniformly and is easy to extend later.)

**No frontend change needed** once the backend sends `customer_name` — it's already
reading the right key everywhere.

---

## 4. Fix: Product Catalog Shows Empty

**Root cause:** `MerchantAppController::getProducts()` returns:
```php
return $this->ok([
    'products' => $products,   // <-- this is a paginator: { data: [...], current_page, ... }
    'product_limit' => ...,
    'product_count' => ...,
    'can_add' => ...,
]);
```
So the real shape is `response.data.products.data` (array of products nested two levels
deep). But `ApiClient.getProducts()` in `api.ts` only checks:
```ts
if (res.data && Array.isArray(res.data.products)) { parsedProducts = res.data.products; }
else if (res.data && Array.isArray(res.data.data)) { parsedProducts = res.data.data; }
```
Neither branch matches a paginator object nested under `products`, so `parsedProducts`
silently stays `[]` — catalog appears empty even though the DB has rows.

**Fix (frontend, `src/utils/api.ts`, inside `getProducts()`):**
```ts
if (res.success && res.data) {
  const productsField = res.data.products;
  const parsedProducts: Product[] = Array.isArray(productsField)
    ? productsField
    : Array.isArray(productsField?.data)
      ? productsField.data
      : [];

  return {
    data: parsedProducts,
    product_count: res.data.product_count ?? parsedProducts.length,
    product_limit: res.data.product_limit ?? 30,
    can_add: res.data.can_add ?? true,
  };
}
```
**Also decide on pagination UX:** right now the frontend requests up to 50 products in
one call but the backend paginates at 20/page by default. Either:
- (a) Backend: bump default `per_page` for this endpoint to match what the SPA actually
  wants (e.g. 50, since there's no pagination UI in `ProductsView.tsx`), or
- (b) Frontend: read `current_page` / `last_page` from `productsField` and implement
  "Load more" / infinite scroll.
Given `merchant_spa_requirements.md` documents pagination as a standard contract, **(b)
is the more correct long-term fix** — but (a) unblocks the immediate bug fastest.

---

## 5. Fix: Billing Section Blank

**Root cause:** `getBilling()` does:
```php
$allPlans = SubscriptionPlan::with('features')->where('is_active', true)->orderBy('sort_order')->get();
```
`features` is an Eloquent relation → serializes as an **array of feature objects**
(e.g. `{ id, feature_key, feature_value, ... }`), but `BillingView.tsx` renders:
```tsx
{p.features.map((feat, idx) => <span>{feat}</span>)}
```
Rendering a raw object as a React child throws `Objects are not valid as a React
child`, which crashes the component tree for that view — hence the section goes
blank instead of just looking wrong.

**Fix (backend, in `getBilling()`):** transform features to plain display strings
before sending:
```php
$allPlans = SubscriptionPlan::with('features')->where('is_active', true)
    ->orderBy('sort_order')->get()
    ->map(fn($plan) => [
        'name' => $plan->name,
        'price_monthly' => $plan->price_monthly,
        'features' => $plan->features->map(fn($f) => $f->feature_label ?? $f->feature_key)->values(),
    ]);
```
(Adjust `feature_label`/`feature_key` to whatever column actually holds a human-readable
string on the `PlanFeature`/pivot model — the point is: **never send raw related models
where the frontend expects `string[]`.**)

**Also guard the crash risk on the frontend** (`BillingView.tsx`) regardless of the
backend fix, since a bad payload should degrade gracefully instead of blanking the
whole view:
```tsx
{(Array.isArray(p.features) ? p.features : []).map((feat, idx) => (
  <span key={idx}>{typeof feat === 'string' ? feat : feat?.feature_label ?? ''}</span>
))}
```

**Secondary check:** if a tenant has no `subscriptionPlan` assigned, `plan` will be
`null` and `plan.name.toLowerCase()` (used to detect "current plan" in the list) will
throw too. Add a null guard: `const isCurrent = plan?.name && p.name.toLowerCase() === plan.name.toLowerCase();`

---

## 6. Missing API Routes (silent 404s — part of "more errors")

The frontend calls these, but `api.php` never registers them:

| Frontend call (in `api.ts`) | Missing route |
|---|---|
| `getCustomer(id)` → `GET /customers/{id}` | No `customers` routes exist anywhere in `api.php` |
| `checkSubdomainAvailability()` → `GET /domain/check-availability` | Not registered under the `domain` group |

**Fix — add to `api.php` inside the authenticated `merchant` group:**
```php
Route::get('/customers/{customer}', [MerchantAppController::class, 'showCustomer']);
Route::get('/domain/check-availability', [MerchantAppController::class, 'checkSubdomainAvailability']);
```
**And add the matching controller methods** (tenant-scoped, following the existing
pattern used by `showOrder`/`showProduct`):
```php
public function showCustomer(Customer $customer): JsonResponse
{
    if ($customer->tenant_id !== $this->tenant()->id) {
        return $this->err('Not found.', 404);
    }
    return $this->ok($customer);
}

public function checkSubdomainAvailability(Request $request): JsonResponse
{
    $request->validate(['subdomain' => 'required|string|max:50']);
    $taken = \App\Models\Tenant::where('subdomain', strtolower($request->subdomain))->exists();
    return $this->ok(['available' => !$taken]);
}
```
*(Model/column names above are best-guess based on the rest of the controller's
conventions — confirm against your actual `Customer`/`Tenant` schema.)*

---

## 7. Additional Issues Found During Review (not explicitly reported, but real)

1. **`getProducts()` per_page mismatch** — see §4, already covered.
2. **Legacy `CommunityContentController` and `MerchantAppController::public*()` overlap.**
   You now have *two* implementations of announcements/news/events: the old
   `/api/community/{type}` (admin CRUD + generic read) and the new
   `/api/merchant/public/{announcements|news|events}` (public read-only). Confirm the
   SPA's `PublicTabs.tsx` calls the new `merchant/public/*` endpoints (it does, per
   `api.ts`) — but the Laravel **Admin UI** presumably still writes through
   `CommunityContentController`. That's fine as a split (admin writes, public app reads),
   just document it clearly so a future dev doesn't try to "consolidate" them incorrectly
   and break the admin panel.
3. **`Order::updateOrder()` swallows WhatsApp send failures silently** (`catch
   (\Exception $e) {}` with no logging). Recommend at minimum `Log::warning()` inside
   those catch blocks so failed customer notifications aren't invisible.
4. **`getTheme()` response includes `products` (all active products with id/name)** on
   every theme-tab load — fine for now, but if a store has hundreds of products this adds
   unnecessary payload weight to a config screen. Not urgent, flag for later.
5. **`request()` in `api.ts` treats *any* thrown error (including a normal 401/422
   validation error) as a generic "Network error" and fires the same
   `api_connection_failed` global event** used for real connectivity loss. This means a
   simple validation mistake on, say, the Add Product form could pop the same "offline"
   banner as a real dropped connection. Recommend distinguishing HTTP-level errors
   (4xx with a JSON body) from actual network/fetch failures (`TypeError: Failed to
   fetch`), and only dispatch `api_connection_failed` for the latter.
6. **Confirm `ProductVariant`/`images` casing consistency** — backend `Product` model
   presumably casts `images` to an array; frontend always expects `string[]`. No bug
   found, but worth a quick contract test once products actually render (§4 fix) in case
   `images` comes back as a JSON string instead of a decoded array on some rows.

---

## 8. Suggested Implementation Order

1. **Backend contract fixes first** (§3, §4, §5, §6) — these are small, surgical changes
   to `MerchantAppController.php` and `api.php`, and they fix the "vacant catalog / blank
   billing / missing customer name" bugs directly.
2. **Frontend `api.ts` cleanup** (§2 demo removal + §4 products parsing fix + §7.5 error
   handling) — do this in the same pass since you're already editing `api.ts` for the
   products parsing fix.
3. **Visual unification pass** (§1) — lowest risk, purely cosmetic, do last so you're not
   fighting merge conflicts with the data-layer fixes above.
4. **Regression test checklist** before you re-zip and publish:
   - [ ] Login → Dashboard shows real stats, recent orders show customer names
   - [ ] Products tab lists all existing products, add/edit/delete/toggle-active all work
   - [ ] Orders tab lists orders with customer name/phone/address, status update works,
         WhatsApp alerts still fire
   - [ ] Billing tab loads without crashing, shows correct plan/quota/plan comparison
   - [ ] Coupons / Theme / Sections / Settings / Domain / Staff — quick smoke test each,
         since none were explicitly reported broken but all share the same `ApiClient`
         plumbing you're editing
   - [ ] Confirm no "Sandbox / Live API" badge or demo remnants anywhere
   - [ ] Confirm Announcements/News/Events all share one visual skin, and the whole app
         (Community + Merchant Panel) feels like a single continuous product

---

## 9. Files You'll Touch

- `app/Http/Controllers/Api/MerchantAppController.php` — §3, §4, §5, §6
- `routes/api.php` — §6
- `src/utils/api.ts` — §2, §4, §7.5
- `src/App.tsx` — §2
- `src/components/BillingView.tsx` — §5 (defensive guard)
- `src/components/PublicTabs.tsx` — §1
- (new, optional) `app/Http/Resources/OrderResource.php` — §3, if you take the resource-class route instead of an inline helper
