# idea-fork -- UX Design

**Status:** Active
**Last Updated:** 2026-02-23

---

## 1. Vision & Principles

**User Goal:** Discover a validated product opportunity backed by real user pain.

Every screen must pass: "Does this help the user discover a validated opportunity?"

| # | Principle | Rule |
|---|-----------|------|
| 1 | Content is the interface | Feed is the homepage. No splash screens. |
| 2 | One action per screen | One primary action; secondary actions subdued. |
| 3 | Progressive depth | Shallow first, deeper on demand. |
| 4 | Evidence is visible | Every AI claim links to source posts. |
| 5 | Zero friction | No login, no onboarding, no popups. |
| 6 | Mobile-first, thumb-first | Primary actions in the thumb zone. |

---

## 2. Information Architecture

### Sitemap

```
idea-fork
+-- / (Feed)
+-- /briefs (Briefs Listing)
|   +-- /briefs/[slug] (Brief Detail)
+-- /products (Products Listing)
|   +-- /products/[slug] (Product Detail)
+-- /search?q=... (Search Results)
    +-- ?type=briefs|products|posts
```

### Navigation

3 top-level tabs: **Feed**, **Briefs**, **Products**.

- Desktop: horizontal top bar with inline search input.
- Mobile: top bar (logo + search icon) + fixed bottom tab bar.
- Search is a utility in the header, not a nav tab.

### Cross-Navigation

Every entity links to related entities. Feed posts link to briefs, briefs link to source posts, products link to complaints and related briefs. No dead ends.

---

## 3. Page Specifications

### 3.1 Feed (`/`)

Browse tagged user complaints. Filter by post type (tabs) and tag (chips). Infinite scroll. Single-column max-w-3xl.

### 3.2 Briefs Listing (`/briefs`)

Grid of brief cards (1-3 columns responsive). Sort by trending/newest/sources. Each card shows title, heat badge, complaint count, community count, freshness, snippet.

### 3.3 Brief Detail (`/briefs/[slug]`)

Single column (max-w-720px). Sections: title + demand signals, Problem, Demand Signals, Suggested Directions, Source Posts (first 5, expandable), Rating (thumbs), Related Briefs.

Inline citations: superscript numbers expand source post snippets on tap.

### 3.4 Products Listing (`/products`)

Grid (1-3 columns). Filter by category chips, sort by signals/trending. Each card: icon, name, category, heat badge, signal count, tagline, tags.

### 3.5 Product Detail (`/products/[slug]`)

Header (icon, name, category, link), Complaint Summary (themes ranked by count), User Complaints list, Related Brief.

### 3.6 Search Results (`/search?q=...`)

**Entry points:** Desktop header input (Enter), mobile search overlay (Enter), direct URL.

**Tabs:** `All | Briefs (N) | Products (N) | Posts (N)` -- URL-driven via `?type=` param.

**"All" tab:** Grouped sections (Briefs, Products, Posts) with max 3 items each + "View all N" links. Fixed order: Briefs > Products > Posts.

**Type tabs:** Full list using same grid/list layout as listing pages.

**Empty state:** "No results for '{query}'" + suggestion + "Clear Search" button.

**Filtering strategy:**
- Posts: backend `q` param search.
- Briefs/Products: fetched in bulk, filtered client-side with case-insensitive `includes()` on title, summary, name, description, tagline, category.

---

## 4. Interaction Patterns

### Filtering

Horizontal scroll chips above content. Single active tag. URL updates on change for shareability.

### Pagination

Infinite scroll (intersection observer). Skeleton cards as loading indicator. "Load More" button as fallback.

### Cards

Entire card is a tap target. Desktop hover: elevation + shadow (150ms). Mobile: no hover effects.

### Rating (Brief Detail)

Inline thumbs up/down at bottom. No modal, no login. Thumbs down shows optional feedback input.

### Search

Submit on Enter only (no live dropdown, no autocomplete). Desktop input syncs with URL `q` param on `/search` page. Mobile overlay closes + navigates on submit.

---

## 5. Responsive Strategy

| Breakpoint | Layout |
|------------|--------|
| < 768px | Single column, bottom tab nav, full-width cards |
| 768-1023px | Single column wider cards, top nav |
| >= 1024px | Multi-column grids, top nav, centered content |

Mobile: bottom tab bar fixed (56px). 16px horizontal padding. Brief detail: full width.

Desktop: multi-column card grids, max-w-1200px. Detail pages: max-w-720px.

---

## 6. Accessibility

- WCAG 2.1 AA. Contrast: 4.5:1 text, 3:1 UI.
- Touch targets: 44x44pt minimum.
- Focus: `focus-visible` outline on all interactive elements.
- Color never sole indicator (always icon/text + color).
- Keyboard: Tab order, Enter/Space activation, Escape to close.
- Screen readers: `aria-label`, `aria-expanded`, `aria-live`, `role="tablist"`.
- `prefers-reduced-motion` respected.
- i18n: `next-intl` for Korean/English.
