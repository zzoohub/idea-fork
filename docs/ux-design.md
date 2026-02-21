# idea-fork -- UX Strategy

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-02-20
**Applies to:** MVP (Phase 1-2)

---

## 1. UX Vision & Principles

### Vision

The user opens idea-fork and immediately sees real user complaints. Within minutes, they find a pattern they had not noticed before. They read a brief that frames the opportunity with linked evidence. They leave with a validated product direction -- and they remember what they discovered, not how the interface worked.

### The User's ONE Goal

**Discover a validated product opportunity backed by real user pain.**

Every screen, every component, every interaction must pass this test: "Does this help the user discover a validated opportunity?" If the answer is no, it does not belong.

### Design Principles

**Principle 1: Content is the interface.**
The feed IS the homepage. Briefs ARE the product. There are no splash screens, hero sections, or marketing interstitials. The first thing a user sees is the first thing that delivers value.

**Principle 2: One action per screen.**
Every screen has exactly ONE primary action. On the feed, it is scanning and filtering. On a brief detail, it is reading the synthesis. On a product detail, it is understanding frustration patterns. Secondary actions exist but are visually subdued.

**Principle 3: Progressive depth.**
Users start shallow and go deeper on demand. Feed cards show snippets; tapping reveals detail. Briefs show summaries; scrolling reveals sources. Citations show inline; expanding reveals the original post. No user is forced to consume more than they need at any moment.

**Principle 4: Evidence is visible.**
Every AI-generated claim shows its source count and links to real posts. Confidence is communicated through transparency, not marketing language. If a brief has few sources, we say so.

**Principle 5: Zero friction by default.**
No login, no onboarding, no popups, no cookie consent walls beyond legal requirements. The app works immediately. Advanced features (rating, future bookmarking) are available inline without interrupting the browsing flow.

**Principle 6: Mobile-first, thumb-first.**
Filters, navigation, and primary actions live in the thumb zone. Content occupies the comfortable zone. Hard-to-reach areas hold only infrequently used elements.

---

## 2. Information Architecture

### Sitemap

```
idea-fork
|
+-- / (Home = Feed)
|   +-- ?tag=X (filtered feed)
|   +-- ?q=X (search results)
|   +-- ?sort=recent|trending (sort mode)
|   +-- ?platform=reddit|appstore (platform filter)
|
+-- /briefs (Briefs Listing)
|   +-- /briefs/[slug] (Brief Detail)
|
+-- /products (Products Listing)
|   +-- /products/[slug] (Product Detail)
```

### Navigation Model

Three top-level destinations. That is all.

| Tab         | Label    | Purpose                              | Priority |
|-------------|----------|--------------------------------------|----------|
| Feed        | Feed     | Browse raw complaints and needs      | P0       |
| AI Briefs   | Briefs   | Read synthesized opportunity briefs  | P0       |
| Products    | Products | Explore products + their complaints  | P1       |

Justification for 3 tabs: Miller's Law recommends 5-7 navigation items maximum. Three is well within limits and reflects the three core experiences in the PRD. No "About," no "Settings," no "Blog" in the navigation.

### Content Hierarchy (Global)

```
Level 1: Feed posts (raw signal -- highest volume, lowest synthesis)
Level 2: Briefs (synthesized signal -- lower volume, higher value)
Level 3: Products (contextual signal -- competitive landscape)
```

Users move from raw to synthesized: Feed -> Brief. Or from product to evidence: Product -> complaints -> Brief. The IA supports both directions.

### Cross-Navigation Paths

```
Feed post card --> "Related Brief" link --> Brief Detail
Brief Detail --> "Source Posts" section --> Feed posts (or original source)
Product Detail --> "Complaints" section --> Feed posts
Product Detail --> "Related Brief" link --> Brief Detail
Brief Detail --> "Related Briefs" section --> Other Brief Details
```

Every entity links to its related entities. The user never hits a dead end.

---

## 3. Interaction Design Patterns

### 3.1 Filtering (Feed)

**Pattern: Inline filter chips + collapsible advanced filters.**

```
+------------------------------------------------------+
| [All] [SaaS] [Mobile] [DevTools] [E-commerce] [+3]  |  <-- Horizontal scroll chips
+------------------------------------------------------+
| Feed content...                                      |
```

- Top tags displayed as horizontally scrollable chips directly above the feed.
- Tapping a chip filters instantly (client-side if data is loaded, otherwise fetch with loading skeleton).
- "[+3]" chip opens a dropdown/bottom sheet with remaining tags.
- Active chip is visually distinct (filled background). Only one tag active at a time for MVP. Multi-select is a P2 feature.
- URL updates on filter change (`?tag=saas`) for shareability and SEO.

Cognitive principle: Hick's Law -- limit visible choices. Show the top 5-7 tags; hide the rest behind progressive disclosure.

**Platform filter (P1):** A small segmented control or chip row below tag chips: [All] [Reddit] [App Store]. Same interaction pattern.

**Sort (P1):** A single dropdown or segmented control: [Recent | Trending]. Default is "Trending" (recommended default reduces decision time -- Hick's Law).

**Search (P1):** A search input field at the top of the feed. On mobile, a search icon that expands into a full-width input. Results replace the feed content. Clear button to reset.

### 3.2 Pagination (Feed, Briefs Listing, Products Listing)

**Pattern: Infinite scroll with "Load More" fallback.**

- Feed uses infinite scroll. New posts load when the user scrolls to the bottom (intersection observer, 200px threshold).
- Loading state: 3 skeleton cards appear below existing content.
- If infinite scroll fails or JS is disabled: a "Load More" button appears as fallback.
- Each page load fetches 20 items.
- URL does NOT update on scroll (no `?page=2`). SEO pagination handled server-side with `<link rel="next">`.

Cognitive principle: Goal Gradient -- as users scroll deeper, the continuous stream maintains flow state. Pagination buttons would break immersion.

### 3.3 Card Interactions (Feed)

**Feed Post Card anatomy:**

```
+------------------------------------------------------+
| [Reddit icon]  r/SaaS  ·  2 days ago                |
|                                                      |
| "I've been looking for a simple invoicing tool that  |
| doesn't require a PhD to set up. Every option is     |
| either too complex or missing basic features..."     |
|                                                      |
| [complaint] [SaaS] [invoicing]          142 upvotes  |
|                                                      |
| View original    |    Related Brief ->               |
+------------------------------------------------------+
```

- **Tap on card body:** Navigates to original source in a new tab (primary action for the feed -- the user's goal is to verify the complaint).
- **Tap on tag chip:** Filters feed by that tag.
- **Tap on "Related Brief":** Navigates to the brief detail page (same tab).
- **Tap on "View original":** Opens original post in new tab. Identical to card body tap but explicit for discoverability.
- **Hover state (desktop):** Subtle elevation/shadow change (100-150ms transition).

Cognitive principle: Von Restorff -- the "Related Brief" link is the distinctive element on each card (different color/style from tags) because it bridges raw signal to synthesized value.

### 3.4 Card Interactions (Briefs Listing)

**Brief Card anatomy:**

```
+------------------------------------------------------+
| Problem: Simple invoicing for freelancers            |
|                                                      |
| 47 posts  ·  3 platforms  ·  Last 30 days           |
|                                                      |
| "Freelancers consistently report frustration with    |
| invoicing tools that are either too complex..."      |
|                                                      |
| [SaaS] [invoicing] [freelancer]                      |
+------------------------------------------------------+
```

- **Tap on card:** Navigates to brief detail page (same tab).
- Demand signals (post count, platform count, recency) are visually prominent -- these are the numbers that help users decide which brief to read.
- No rating on the listing card (deferred to detail page to reduce clutter).

### 3.5 Card Interactions (Products Listing)

**Product Card anatomy:**

```
+------------------------------------------------------+
| [Product icon]  ProductName                          |
| Category: Invoicing  ·  Trending                     |
|                                                      |
| 23 complaints  ·  Top issue: "complex setup"        |
|                                                      |
| [SaaS] [invoicing]                                   |
+------------------------------------------------------+
```

- **Tap on card:** Navigates to product detail page.
- Complaint count and top issue are the distinguishing data points.

### 3.6 Inline Citations (Brief Detail)

**Pattern: Superscript numbers that expand on tap.**

```
Freelancers consistently report that existing invoicing
tools require too much configuration. [1][2] The most
common complaint is the lack of recurring invoice
templates. [3][4][5]

---
Tap [1] to expand:
+------------------------------------------------------+
| [Reddit icon]  r/freelance  ·  5 days ago            |
| "Why does every invoicing app assume I have an       |
| accounting degree? I just need to send a PDF..."     |
| View original ->                                     |
+------------------------------------------------------+
```

- Citations appear as superscript bracketed numbers inline with brief text.
- Tapping a citation expands a compact post snippet below the paragraph (accordion pattern).
- Tapping again collapses it.
- "View original" link in the expanded snippet opens the source in a new tab.
- On desktop: citations can show a tooltip/popover on hover, with click to pin open.

Cognitive principle: Progressive disclosure -- the brief text is readable without citations. Users who want evidence can drill in. Those who do not can keep reading.

Ergonomics: Citation tap targets are at least 44x44pt despite small visual size (padding around the superscript number expands the touch area).

### 3.7 Rating (Brief Detail)

**Pattern: Inline thumbs at the bottom of the brief, no modal, no login.**

```
+------------------------------------------------------+
| Was this brief useful?                               |
|                                                      |
|   [ thumbs-up icon ]     [ thumbs-down icon ]       |
+------------------------------------------------------+
```

- Two buttons: thumbs up, thumbs down. Large touch targets (48x48pt minimum).
- On tap: button fills with color, brief "Thank you" text replaces the question. No modal, no redirect.
- If thumbs down: a single-line text input slides in below: "What was missing? (optional)" with a small "Send" button.
- State persisted via session/device fingerprint (no login). If user has already rated, show their choice in filled state with ability to change.
- No confirmation dialog (non-destructive, reversible action).

Cognitive principle: Peak-End Rule -- the rating appears at the end of the brief reading experience. A positive micro-interaction (smooth fill animation, brief thank-you text) creates a positive ending.

### 3.8 Cross-Navigation Between Experiences

Every entity shows its connections:

| From | To | Mechanism |
|------|----|-----------|
| Feed post | Brief | "Related Brief" link on card |
| Feed post | Original source | "View original" link / card tap |
| Feed post | Filtered feed | Tag chip tap |
| Brief listing card | Brief detail | Card tap |
| Brief detail | Source posts | Inline citations + "Source Posts" section |
| Brief detail | Related briefs | "Related Briefs" section at bottom |
| Brief detail | Feed (filtered) | Tag chips in brief metadata |
| Product card | Product detail | Card tap |
| Product detail | Source posts | "Complaints" section with post links |
| Product detail | Related brief | "Related Brief" link |
| Product detail | Feed (filtered) | Tag chips in product metadata |

This creates a web, not a funnel. Users explore in any direction. Every page is a valid entry point (SEO).

---

## 4. Page-by-Page UX Specifications

### 4.1 Home / Feed Page

**URL:** `/`
**User goal:** Browse real user complaints to spot patterns and opportunities.
**Entry points:** Direct URL, search engine, social share, internal navigation.

#### Content Hierarchy and Layout Zones

```
DESKTOP (>=1024px)
+------------------------------------------------------------------+
| [idea-fork]       [Feed]  [Briefs]  [Products]                   |  ZONE A: Nav
+------------------------------------------------------------------+
| [Search icon + input]                               [Sort: v]    |  ZONE B: Controls
+------------------------------------------------------------------+
| [All] [SaaS] [Mobile] [DevTools] [E-commerce] [+3]              |  ZONE C: Filters
+------------------------------------------------------------------+
|                                                                  |
| +---------------------------+  +---------------------------+     |
| | Post Card 1               |  | Post Card 2               |    |  ZONE D: Feed
| | [Reddit] r/SaaS · 2d     |  | [Reddit] r/startup · 1d  |    |  (2-column grid)
| |                           |  |                           |    |
| | "Snippet text..."        |  | "Snippet text..."        |    |
| |                           |  |                           |    |
| | [tag] [tag]    42 votes  |  | [tag] [tag]    18 votes  |    |
| | View original | Brief -> |  | View original | Brief -> |    |
| +---------------------------+  +---------------------------+     |
|                                                                  |
| +---------------------------+  +---------------------------+     |
| | Post Card 3               |  | Post Card 4               |    |
| | ...                       |  | ...                       |    |
| +---------------------------+  +---------------------------+     |
|                                                                  |
| [Loading skeletons when scrolling...]                            |
+------------------------------------------------------------------+
```

```
MOBILE (<768px)
+--------------------------------+
| [idea-fork]            [Search]|  ZONE A: Nav (compact)
+--------------------------------+
| [Feed] [Briefs] [Products]    |  ZONE A2: Tab bar
+--------------------------------+
| [All] [SaaS] [Mobile] [+5]   |  ZONE C: Filter chips (scroll)
+--------------------------------+
| Sort: Trending  v             |  ZONE B: Sort (single line)
+--------------------------------+
|                                |
| +----------------------------+ |
| | Post Card 1                | |  ZONE D: Feed (single column)
| | [Reddit] r/SaaS · 2d      | |
| |                            | |
| | "Snippet text..."         | |
| |                            | |
| | [tag] [tag]     42 votes  | |
| | Original | Brief ->       | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | Post Card 2                | |
| | ...                        | |
| +----------------------------+ |
|                                |
+--------------------------------+
| [Feed]  [Briefs]  [Products]  |  ZONE E: Bottom tab bar
+--------------------------------+
```

#### Key Components and Behavior

**Global Navigation Bar (Zone A)**
- Desktop: Horizontal bar. Logo left, three nav links center-right. Active tab has underline or filled state.
- Mobile: Logo left, search icon right. Tab navigation moves to bottom bar (Zone E) for thumb accessibility.
- Stays fixed at top on desktop. On mobile, top bar scrolls away; bottom tab bar stays fixed.

**Search (Zone B)**
- Desktop: Always visible input field with search icon.
- Mobile: Search icon in top bar. Tap expands a full-width input overlay. Escape or X dismisses.
- Debounced input (300ms) triggers search. Results replace feed content. Active search shown as a removable chip.

**Filter Chips (Zone C)**
- Horizontally scrollable row. On desktop, wraps to two rows if many tags.
- Active chip: filled background, high contrast. Inactive: outlined/ghost.
- Tapping active chip deselects it (returns to "All").

**Feed Cards (Zone D)**
- Card content: source icon + subreddit/source + relative time, snippet (3 lines max, truncated with ellipsis), tag chips, engagement count, action links.
- Desktop: 2-column masonry or grid. Cards have equal width; height varies by content.
- Mobile: Single column, full width with 16px horizontal padding.
- Tap target: entire card navigates to original source. "Related Brief" link has its own tap target.

**Bottom Tab Bar (Zone E, mobile only)**
- Three tabs: Feed, Briefs, Products. Each with icon + label.
- Active tab: filled icon + label color change.
- Fixed to bottom of viewport. Height: 56px (comfortable thumb target with 48pt icons).

#### States

**Loading state:**
- Initial page load: 6 skeleton cards (matching card layout) with shimmer animation.
- Infinite scroll load: 2 skeleton cards appended below existing content.

**Empty state (no results for filter/search):**
```
+-----------------------------------+
|                                   |
|   No posts found for "xyz"       |
|                                   |
|   Try a different search term    |
|   or [clear filters].            |
|                                   |
+-----------------------------------+
```

**Error state (API failure):**
```
+-----------------------------------+
|                                   |
|   Something went wrong.          |
|                                   |
|   [Try again]                    |
|                                   |
+-----------------------------------+
```
Single retry button. No technical jargon.

**Cold start (database has no posts yet):**
```
+-----------------------------------+
|                                   |
|   We're analyzing the latest     |
|   posts. Check back soon.        |
|                                   |
+-----------------------------------+
```

---

### 4.2 Briefs Listing Page

**URL:** `/briefs`
**User goal:** Find a synthesized opportunity brief worth reading.
**Entry points:** Navigation tab, search engine, shared link.

#### Content Hierarchy and Layout Zones

```
DESKTOP
+------------------------------------------------------------------+
| [idea-fork]       [Feed]  [Briefs]  [Products]                   |
+------------------------------------------------------------------+
| AI Briefs                                           [Sort: v]    |
| Synthesized product opportunities from real user complaints.     |
+------------------------------------------------------------------+
|                                                                  |
| +---------------------------+  +---------------------------+     |
| | Brief Card 1              |  | Brief Card 2              |    |
| | Problem: Simple invoicing |  | Problem: Better dev docs  |    |
| | for freelancers           |  | search                    |    |
| |                           |  |                           |    |
| | 47 posts · 3 platforms   |  | 31 posts · 2 platforms   |    |
| | Last 30 days             |  | Last 14 days             |    |
| |                           |  |                           |    |
| | "Freelancers report..."  |  | "Developers struggle..." |    |
| |                           |  |                           |    |
| | [SaaS] [invoicing]       |  | [DevTools] [docs]        |    |
| +---------------------------+  +---------------------------+     |
|                                                                  |
+------------------------------------------------------------------+
```

```
MOBILE
+--------------------------------+
| [idea-fork]            [Search]|
+--------------------------------+
| AI Briefs                      |
| Opportunities from real        |
| complaints.         [Sort: v]  |
+--------------------------------+
|                                |
| +----------------------------+ |
| | Brief Card 1               | |
| | Problem: Simple invoicing  | |
| | for freelancers            | |
| |                            | |
| | 47 posts · 3 platforms    | |
| | Last 30 days              | |
| |                            | |
| | "Freelancers report..."   | |
| | [SaaS] [invoicing]        | |
| +----------------------------+ |
|                                |
+--------------------------------+
| [Feed]  [Briefs]  [Products]  |
+--------------------------------+
```

#### Key Components

**Page header:** Title "AI Briefs" + one-line description. No hero. The description is functional: it tells the user what this page contains.

**Sort control:** Dropdown with options: [Most Evidence | Recent | Trending]. Default: "Most Evidence" (briefs with the most source posts appear first -- this surfaces the most validated opportunities).

**Brief cards:** Tap anywhere on card to navigate to brief detail. No secondary actions on the listing card (keep it simple -- Hick's Law).

**Demand signal numbers** (post count, platform count, recency) are displayed in a visually distinct row. These are the primary decision-making data for choosing which brief to read.

#### States

Same pattern as Feed: skeleton cards for loading, empty state for no briefs, error state with retry.

---

### 4.3 Brief Detail Page

**URL:** `/briefs/[slug]`
**User goal:** Understand a product opportunity and decide whether to pursue it.
**Entry points:** Brief listing card, feed post "Related Brief" link, product detail link, search engine, shared URL.

#### Content Hierarchy and Layout Zones

```
DESKTOP (max-width: 720px content column, centered)
+------------------------------------------------------------------+
| [idea-fork]       [Feed]  [Briefs]  [Products]                   |
+------------------------------------------------------------------+
|                                                                  |
|   <- Back to Briefs                                              |
|                                                                  |
|   Simple Invoicing for Freelancers                    ZONE A     |
|   ================================================    (Title)    |
|                                                                  |
|   47 posts  ·  3 platforms  ·  Active last 30 days   ZONE B     |
|   [SaaS] [invoicing] [freelancer]                    (Signals)   |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   ## Problem                                          ZONE C     |
|                                                       (Brief     |
|   Freelancers consistently report that existing        body)     |
|   invoicing tools require too much configuration.                |
|   [1][2] The most common complaint is the lack of               |
|   recurring invoice templates. [3][4][5]                        |
|                                                                  |
|   ## Demand Signals                                              |
|                                                                  |
|   - 47 posts across Reddit, App Store, Indie Hackers            |
|   - 78% negative sentiment                                      |
|   - Growing: 15 new posts in last 7 days                        |
|                                                                  |
|   ## Suggested Directions                                        |
|                                                                  |
|   1. Minimal invoicing tool focused on recurring                |
|      templates for solo freelancers                              |
|   2. Invoice plugin/extension for existing tools                |
|      that simplifies the setup flow                              |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   ## Source Posts (47)                                 ZONE D     |
|                                                       (Sources)  |
|   +------------------------------------------------------+      |
|   | [Reddit] r/freelance · 5d                            |      |
|   | "Why does every invoicing app assume I have..."      |      |
|   | View original ->                                     |      |
|   +------------------------------------------------------+      |
|   +------------------------------------------------------+      |
|   | [Reddit] r/smallbusiness · 8d                        |      |
|   | "I just want to send a simple invoice without..."    |      |
|   | View original ->                                     |      |
|   +------------------------------------------------------+      |
|   [Show all 47 posts]                                            |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   Was this brief useful?                              ZONE E     |
|   [thumbs-up]   [thumbs-down]                        (Rating)   |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   ## Related Briefs                                   ZONE F     |
|                                                       (Related)  |
|   +---------------------+  +---------------------+              |
|   | Brief Card          |  | Brief Card          |              |
|   | Accounting for...   |  | Payment tracking... |              |
|   +---------------------+  +---------------------+              |
|                                                                  |
+------------------------------------------------------------------+
```

#### Key Components and Behavior

**Back link (Zone A):** "Back to Briefs" text link at top. On mobile, browser back also works. This provides wayfinding context.

**Title + Demand Signals (Zone A-B):** Title is the largest text on the page (h1). Demand signals are a compact row of numbers directly below. Tags follow. This is the "should I keep reading?" information -- presented first.

**Brief Body (Zone C):** Long-form synthesized text with inline citation numbers. Structured with clear headings: Problem, Demand Signals, Suggested Directions. Heading structure matches a mental model of "What's the problem? -> How big is it? -> What could I build?"

**Inline citations:** Superscript bracketed numbers. Tap to expand the source post snippet below the current paragraph (accordion). Each expanded snippet shows: source icon, subreddit/source name, relative date, snippet text, "View original" link.

**Source Posts section (Zone D):** Shows first 5 source posts. "Show all N posts" button loads the rest (progressive disclosure). Each source post is a compact card with snippet and "View original" link.

**Rating (Zone E):** Two icon buttons. After rating, replace question with "Thanks for your feedback." If thumbs down, slide in optional text input.

**Related Briefs (Zone F):** 2-3 brief cards in a horizontal row. Same card format as briefs listing.

#### Mobile Adaptations

- Content fills full width with 16px padding.
- Source posts section: vertical stack, full width.
- Related briefs: horizontal scroll of cards (not grid).
- Citation expanded snippets: full width cards.
- Rating buttons: centered, 48pt touch targets.

#### States

**Loading:** Skeleton layout matching the zone structure (title bar, signal bar, text block placeholders, card placeholders).

**Low confidence brief (<3 source posts):**
```
+------------------------------------------+
| [info icon]  Low confidence              |
| This brief is based on fewer than 3      |
| source posts. Evidence is limited.       |
+------------------------------------------+
```
Displayed below the demand signals row. Yellow/amber indicator with icon (not color-only).

**Brief not found (404):**
```
+-----------------------------------+
|                                   |
|   Brief not found.               |
|                                   |
|   [Browse all briefs]            |
|                                   |
+-----------------------------------+
```

---

### 4.4 Products Listing Page

**URL:** `/products`
**User goal:** Find products that are trending but have user frustrations (opportunity gaps).
**Entry points:** Navigation tab, search engine.

#### Content Hierarchy and Layout Zones

```
DESKTOP
+------------------------------------------------------------------+
| [idea-fork]       [Feed]  [Briefs]  [Products]                   |
+------------------------------------------------------------------+
| Products                                            [Sort: v]    |
| Trending products paired with user complaints.                   |
+------------------------------------------------------------------+
| [All] [SaaS] [Mobile] [DevTools] [E-commerce]                   |
+------------------------------------------------------------------+
|                                                                  |
| +---------------------------+  +---------------------------+     |
| | [icon] ProductName        |  | [icon] ProductName        |    |
| | Category: SaaS            |  | Category: DevTools        |    |
| | [trending indicator]      |  | [trending indicator]      |    |
| |                           |  |                           |    |
| | 23 complaints             |  | 45 complaints             |    |
| | Top: "complex setup"     |  | Top: "poor search"       |    |
| |                           |  |                           |    |
| | [SaaS] [invoicing]       |  | [DevTools] [docs]        |    |
| +---------------------------+  +---------------------------+     |
|                                                                  |
+------------------------------------------------------------------+
```

#### Key Components

**Sort control:** [Most Complaints | Trending | Recent]. Default: "Most Complaints" -- this directly serves the user's goal of finding frustration hotspots.

**Category filter chips:** Same pattern as feed. Horizontally scrollable.

**Product cards:** Tap navigates to product detail. Complaint count and top complaint theme are the primary differentiating data.

**Trending indicator:** Small upward arrow icon + "Trending" label. Not color-only (icon + text).

---

### 4.5 Product Detail Page

**URL:** `/products/[slug]`
**User goal:** Understand where users are frustrated with this product and identify gaps.
**Entry points:** Product listing card, search engine, shared URL.

#### Content Hierarchy and Layout Zones

```
DESKTOP (max-width: 720px content column, centered)
+------------------------------------------------------------------+
| [idea-fork]       [Feed]  [Briefs]  [Products]                   |
+------------------------------------------------------------------+
|                                                                  |
|   <- Back to Products                                            |
|                                                                  |
|   [Product icon]  ProductName                         ZONE A     |
|   Category: SaaS · invoicing                         (Header)    |
|   [Website link ->]                                              |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   ## Complaint Summary                                ZONE B     |
|                                                      (Summary)   |
|   23 complaints across 2 platforms                               |
|                                                                  |
|   Top themes:                                                    |
|   - Complex setup (12 posts)                                    |
|   - Missing recurring invoices (7 posts)                        |
|   - Slow support (4 posts)                                      |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   ## User Complaints (23)                             ZONE C     |
|                                                      (Posts)     |
|   +------------------------------------------------------+      |
|   | [Reddit] r/SaaS · 3d                                 |      |
|   | "I tried setting up ProductName and gave up after..." |      |
|   | View original ->                                      |      |
|   +------------------------------------------------------+      |
|   [Show all 23 complaints]                                       |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   ## Related Brief                                    ZONE D     |
|                                                      (Brief)     |
|   +------------------------------------------------------+      |
|   | Brief Card: Simple invoicing for freelancers         |      |
|   | 47 posts · 3 platforms                               |      |
|   +------------------------------------------------------+      |
|                                                                  |
+------------------------------------------------------------------+
```

#### Key Components

**Product header (Zone A):** Product name, icon (if available, otherwise first-letter avatar), category, external website link. Minimal -- just enough to identify the product.

**Complaint summary (Zone B):** Total complaint count, platform count, and a ranked list of complaint themes with post counts. This is the "insight at a glance."

**User complaints (Zone C):** First 5 complaints shown. "Show all" button for the rest. Each complaint is a compact post card.

**Related Brief (Zone D):** If a brief exists that covers this product's complaint cluster, show it as a card link. If no related brief exists, this section is omitted entirely (do not show an empty section).

---

## 5. Navigation & Wayfinding

### Global Navigation Structure

**Desktop:** Fixed horizontal top bar.

```
+------------------------------------------------------------------+
| [idea-fork logo]         [Feed]   [Briefs]   [Products]         |
+------------------------------------------------------------------+
```

- Logo is a text wordmark (no icon needed for MVP). Tap returns to home (Feed).
- Active tab: underline + bolder weight. Inactive: regular weight, subdued color.
- No hamburger menu on desktop. Three items fit easily.

**Mobile:** Split navigation.

```
Top bar (scrolls away):
+--------------------------------+
| [idea-fork]            [Search]|
+--------------------------------+

Bottom tab bar (fixed):
+--------------------------------+
| [Feed icon]  [Briefs] [Prods] |
|   Feed       Briefs   Products|
+--------------------------------+
```

- Bottom tab bar is fixed, always visible. 56px height. Each tab: icon (24px) + label (12px) stacked.
- Active tab: filled icon + colored label. Inactive: outlined icon + muted label.
- Top bar contains only logo and search icon. Scrolls with content to maximize viewport for content.

### Breadcrumbs and Back Navigation

**Detail pages only.** Listing pages do not need breadcrumbs (the tab bar provides enough context).

- Brief Detail: `<- Back to Briefs` text link at top-left of content area.
- Product Detail: `<- Back to Products` text link at top-left of content area.
- If user arrived from the Feed (via "Related Brief" link), back link still says "Back to Briefs" (not "Back to Feed") because it orients the user within the Briefs section. Browser back handles return to previous page.

No breadcrumb trail (Home > Briefs > Brief Name). For an app with only 2 levels of depth, breadcrumbs add clutter without value. The back link + tab bar is sufficient.

### URL Structure for Wayfinding

Every page has a clean, shareable URL that communicates location:

| Page | URL | SEO title pattern |
|------|-----|-------------------|
| Feed | `/` | "idea-fork -- Real user complaints, real opportunities" |
| Feed (filtered) | `/?tag=saas` | "SaaS complaints -- idea-fork" |
| Briefs listing | `/briefs` | "AI Briefs -- idea-fork" |
| Brief detail | `/briefs/simple-invoicing-for-freelancers` | "Simple Invoicing for Freelancers -- idea-fork" |
| Products listing | `/products` | "Products -- idea-fork" |
| Product detail | `/products/productname` | "ProductName complaints -- idea-fork" |

---

## 6. Responsive Strategy

### Breakpoints

| Breakpoint | Name | Layout |
|------------|------|--------|
| 0-767px | Mobile | Single column, bottom tab nav, full-width cards |
| 768-1023px | Tablet | Single column with wider cards, top nav |
| 1024px+ | Desktop | Two-column card grids, top nav, centered content |

### Layout Adaptations by Breakpoint

**Mobile (0-767px):**
- Navigation: bottom tab bar (fixed) + scrollable top bar.
- Card grid: single column, full width minus 16px padding each side.
- Filter chips: horizontal scroll, no wrapping.
- Search: icon in top bar, expands to full-width overlay.
- Sort: full-width dropdown below filters.
- Brief detail: full-width content, 16px padding.
- Related briefs: horizontal scroll of cards.
- Citations: expand below paragraph as full-width cards.

**Tablet (768-1023px):**
- Navigation: top bar only (no bottom tab bar).
- Card grid: single column, max-width 640px centered.
- Filter chips: may wrap to two rows.
- Otherwise same as desktop layout patterns.

**Desktop (1024px+):**
- Navigation: top bar.
- Card grid: 2-column grid, max-width 1200px centered.
- Filter chips: wrap to multiple rows if needed.
- Brief/Product detail: single column, max-width 720px centered (optimal reading width).
- Source posts in detail pages: single column within the 720px content area.

### Mobile-Specific Interaction Patterns

**Pull-to-refresh:** On feed page, pull down to refresh. Standard mobile pattern. Haptic feedback on threshold.

**Swipe gestures:** Not used in MVP. Swipe introduces hidden functionality which violates discoverability. All actions are explicitly visible.

---

## 7. Accessibility Considerations

### WCAG 2.1 AA Compliance

**Contrast:**
- Body text: 4.5:1 minimum contrast ratio against background.
- UI components (buttons, chips, icons): 3:1 minimum.
- Dark mode must independently meet these ratios.

**Touch Targets:**
- All interactive elements: 44x44pt minimum tap area.
- Citation superscript numbers: visual size may be small, but tap area padded to 44x44pt.
- Tag chips: minimum height 32px with 44pt tap area (padding).
- Close/dismiss buttons: 44x44pt minimum.

**Focus States:**
```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```
Every interactive element must have a visible focus indicator for keyboard users.

**Color Independence:**
- Tags: use text labels, not color-only.
- Sentiment indicators: icon + text (not color-only).
- Trending indicator: upward arrow icon + "Trending" text.
- Low confidence indicator: warning icon + "Low confidence" text.
- Rating state: filled icon shape change + "Rated" text, not just color change.

**Keyboard Navigation:**
- Tab key moves through all interactive elements in DOM order.
- Enter/Space activates buttons and links.
- Escape closes expanded citations, search overlay, and dropdowns.
- Arrow keys navigate within chip groups and sort dropdowns.
- Skip-to-content link as the first focusable element on every page.

**Screen Readers:**
- All images: alt text or `alt=""` for decorative.
- Icon-only buttons (search, rating): `aria-label` provided.
- Feed cards: marked up as `<article>` elements with accessible names.
- Filter chips: `role="group"` with `aria-label="Filter by category"`. Active chip: `aria-pressed="true"`.
- Sort dropdown: proper `<select>` or `role="listbox"` with `aria-label`.
- Citation expansion: `aria-expanded` on citation buttons.
- Rating buttons: `aria-label="Rate as useful"` / `aria-label="Rate as not useful"`. After rating: `aria-live="polite"` announcement.
- Loading states: `aria-busy="true"` on the loading region.

**Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Internationalization (i18n)

Per project conventions, all pages use `next-intl` for Korean/English:
- Korean text is typically denser. Allow for text wrapping in chips and buttons.
- Date formatting: locale-aware ("2 days ago" in English, "2일 전" in Korean).
- Number formatting: locale-aware.
- All hardcoded strings in components must use translation keys.

---

## 8. UX Metrics & Measurement

### Primary UX Metrics

| PRD Goal | UX Metric | What to Measure | Target |
|----------|-----------|-----------------|--------|
| Users find value in feed (500 WAU) | Feed engagement depth | % of sessions where user scrolls past 10 posts | >= 40% |
| Users find value in feed (500 WAU) | Filter usage rate | % of sessions where user applies a filter | >= 20% |
| Briefs are useful (>= 60% positive) | Brief read-through rate | % of brief detail visits where user scrolls to Source Posts section | >= 50% |
| Briefs are useful (>= 60% positive) | Citation tap rate | % of brief detail visits with at least one citation expanded | >= 15% |
| Users return (>= 30% W1 retention) | Cross-navigation rate | % of sessions where user visits 2+ of the 3 sections | >= 25% |
| Validate paid potential (200 signups) | Source link click-through | % of sessions where user clicks "View original" | >= 30% |

### Friction Indicators (Track and Investigate)

| Signal | Indicates | Action Threshold |
|--------|-----------|------------------|
| Bounce rate on Feed | First impression failure | > 70% |
| Brief detail < 10s time on page | Brief not engaging | Median < 10s |
| Rating: > 40% thumbs down | Brief quality issue | Investigate brief generation |
| 0 filter interactions in session | Filters not discoverable or not useful | > 80% of sessions |
| Search used but no result clicked | Search results not relevant | > 50% of search sessions |

### Implementation

- Page view events: all pages.
- Click events: "View original" links, "Related Brief" links, filter chip taps, sort changes, citation expansions, rating taps.
- Scroll depth: Feed (posts passed), Brief detail (sections reached).
- No personal data collection. No cookies beyond session. Analytics must work without login.

---

## 9. Design System Foundations

### Typography Scale

Based on a modular scale (1.25 ratio) with system font stack for performance.

```
Font family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
             Roboto, "Helvetica Neue", Arial, sans-serif

| Token     | Size   | Weight | Line Height | Use                          |
|-----------|--------|--------|-------------|------------------------------|
| display   | 30px   | 700    | 1.2         | Brief detail page title      |
| h1        | 24px   | 700    | 1.3         | Page titles (Feed, Briefs)   |
| h2        | 20px   | 600    | 1.3         | Section headings in detail   |
| h3        | 16px   | 600    | 1.4         | Card titles                  |
| body      | 15px   | 400    | 1.6         | Brief body text, snippets   |
| body-sm   | 13px   | 400    | 1.5         | Metadata, timestamps, tags   |
| caption   | 11px   | 400    | 1.4         | Footnotes, supplementary     |
```

Body text at 15px ensures readability on mobile without zooming. Line height 1.6 for body text aids long-form reading (brief detail).

### Spacing System

**Component spacing (inside):**

| Token | Value | Use |
|-------|-------|-----|
| space-xs | 4px | Icon + label gap, tight grouping |
| space-sm | 8px | Related items within a card |
| space-md | 12px | Default component padding |
| space-lg | 16px | Comfortable component padding, card internal |
| space-xl | 24px | Generous component padding |

**Layout spacing (between sections):**

| Token | Value | Use |
|-------|-------|-----|
| layout-xs | 16px | Related sections (filter chips to feed) |
| layout-sm | 24px | Default section gap (between cards) |
| layout-md | 32px | Distinct sections (zones on detail pages) |
| layout-lg | 48px | Major section breaks (brief body to sources) |
| layout-xl | 64px | Page-level divisions |

**Card spacing:**
- Card internal padding: 16px (space-lg).
- Card gap in grid: 16px mobile, 24px desktop.
- Card border-radius: 8px.

### Color Usage Principles

**Semantic color tokens (not raw values):**

```css
/* Surfaces */
--color-bg-primary        /* Page background */
--color-bg-secondary      /* Card background */
--color-bg-tertiary       /* Elevated surface (hover state) */

/* Text */
--color-text-primary      /* Body text, headings */
--color-text-secondary    /* Metadata, timestamps */
--color-text-tertiary     /* Placeholder, disabled */

/* Interactive */
--color-interactive       /* Links, active tab, primary actions */
--color-interactive-hover /* Hover state for interactive */

/* Feedback */
--color-positive          /* Thumbs up filled, success */
--color-negative          /* Thumbs down filled, errors */
--color-warning           /* Low confidence indicator */

/* Border */
--color-border            /* Card borders, dividers */
--color-border-active     /* Active filter chip border */

/* Focus */
--color-focus             /* Focus ring (2px outline) */
```

**Dark mode:** Every semantic token has a light and dark variant. Implementation uses CSS custom properties with `prefers-color-scheme` media query and a manual toggle (stored in localStorage).

```css
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #111111;
  /* ... */
}

[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg-primary: #0a0a0a;
    --color-text-primary: #e5e5e5;
    /* ... */
  }
}
```

**Color rules:**
1. Never use color as the sole indicator (accessibility requirement).
2. Maximum 2 accent colors in the palette. This is a content-heavy app -- chrome should recede.
3. Interactive color (links, active states) must have 4.5:1 contrast against its background in both light and dark mode.
4. Card backgrounds are one step lighter/darker than page background to create subtle depth.

### Component Inventory (MVP)

**shared/ui (Design System)**

| Component | Description | Variants/States |
|-----------|-------------|-----------------|
| `Button` | Primary and ghost variants | primary, ghost, disabled, loading |
| `Chip` | Filter tag chip | active, inactive, interactive, static |
| `Card` | Content card container | default, hover, loading (skeleton) |
| `Skeleton` | Loading placeholder | text, card, chip |
| `Icon` | SVG icon wrapper | Various icons (see below) |
| `SearchInput` | Search field | default, focused, with-value, mobile-overlay |
| `SortDropdown` | Sort selector | options list, selected state |
| `TabBar` | Navigation tabs | desktop (top), mobile (bottom) |
| `BackLink` | "Back to X" navigation | text link with left arrow |
| `EmptyState` | No-content message | with optional action button |
| `ErrorState` | Error message | with retry button |
| `Badge` | Small label/count | number, text |
| `RatingButtons` | Thumbs up/down pair | unrated, rated-up, rated-down |
| `SourceSnippet` | Expandable source post | collapsed, expanded |
| `Divider` | Section separator | horizontal line |

**entities/post/ui**

| Component | Description |
|-----------|-------------|
| `PostCard` | Feed post card (snippet, source, tags, actions) |
| `PostSnippet` | Compact post display for brief citations and source lists |

**entities/brief/ui**

| Component | Description |
|-----------|-------------|
| `BriefCard` | Brief listing card (title, signals, snippet, tags) |
| `BriefBody` | Full brief content with inline citations |
| `CitationRef` | Inline citation number (superscript, expandable) |
| `DemandSignals` | Post count + platform count + recency display |
| `ConfidenceBadge` | Low confidence indicator |

**entities/product/ui**

| Component | Description |
|-----------|-------------|
| `ProductCard` | Product listing card (icon, name, category, complaints) |
| `ProductHeader` | Product detail header (icon, name, category, link) |
| `ComplaintSummary` | Ranked list of complaint themes with counts |

**features/filter/ui**

| Component | Description |
|-----------|-------------|
| `FilterChipBar` | Horizontal scrollable chip row with "more" overflow |

**features/search/ui**

| Component | Description |
|-----------|-------------|
| `SearchOverlay` | Mobile full-screen search |

**features/rating/ui**

| Component | Description |
|-----------|-------------|
| `BriefRating` | Rating section with optional feedback input |

**Icons needed (MVP):**
Reddit logo, external link (arrow), thumbs up, thumbs down, search, filter, sort/chevron, trending (arrow up), back (arrow left), close (X), warning (triangle), tag, clock (recency).

### Animation Specifications

| Interaction | Duration | Easing | Property |
|-------------|----------|--------|----------|
| Card hover (desktop) | 150ms | ease-out | box-shadow, transform(translateY) |
| Chip active state | 100ms | ease-out | background-color, border-color |
| Citation expand/collapse | 200ms | ease-in-out | height, opacity |
| Rating button fill | 150ms | ease-out | background-color, transform(scale) |
| Search overlay open (mobile) | 200ms | ease-out | opacity, transform |
| Skeleton shimmer | 1500ms | linear | background-position (loop) |
| Page transition (Next.js) | 300ms | ease-in-out | opacity |

All animations respect `prefers-reduced-motion: reduce`.

---

## Appendix A: Design Rationale Summary

| Decision | Principle | Rationale |
|----------|-----------|-----------|
| Feed is the homepage (no splash/hero) | Content-first | Hero sections delay value delivery. Content IS the value. |
| 3 navigation tabs only | Miller's Law | 3 items are trivially memorable. |
| Bottom tab bar on mobile | Fitts's Law | Primary navigation in the thumb zone. |
| Default sort: Trending/Most Evidence/Most Complaints | Hick's Law | Recommended defaults reduce decision time. |
| Progressive filter chips (top 5-7 visible) | Hick's Law | Reduce visible options. |
| Infinite scroll on feed | Goal Gradient | Continuous stream maintains flow state. |
| One primary action per card | Von Restorff | Only one element should stand out per unit. |
| Inline citations expand on demand | Progressive Disclosure | Show only information needed for current decision. |
| Brief structured: Problem -> Signals -> Directions -> Sources | Cognitive Load | Top-down structure lets users stop at any depth. |
| Rating at end of brief | Peak-End Rule | Final interaction shapes memory of experience. |
| Low confidence badge on weak briefs | Trust/Transparency | Reduces cognitive effort of evaluating quality. |
| No breadcrumbs | Simplicity | 2 levels of depth. Back link + tab bar sufficient. |
| No onboarding or tutorial | Zero friction | If the UI needs explanation, simplify the UI. |
| No login for browsing | Zero friction | Login walls add friction before value delivery. |
| 720px max-width for detail content | Readability | Optimal reading width: 50-75 characters per line. |

---

## Appendix B: Removal Log

| Considered | Removed? | Reason |
|------------|----------|--------|
| Hero section on homepage | Yes | Feed delivers value immediately. |
| "How it works" section | Yes | If the UI needs explanation, simplify the UI. |
| Sidebar navigation | Yes | 3 tabs do not justify a sidebar. |
| User avatar/profile in nav | Yes | No login in MVP. |
| Breadcrumb trail | Yes | Only 2 levels deep. |
| "Share" button on briefs | Deferred | Browser native share available. Not critical for MVP. |
| Comment section on briefs | Yes | Out of scope per PRD. |
| "Save/Bookmark" on cards | Deferred | Requires account system. P2 feature. |
| Notification bell | Yes | No notification system in MVP. |
| Dark mode toggle in nav | Deferred to footer | Not primary navigation. System preference is default. |
| Numbered page controls | Yes | Infinite scroll is more natural for browsing. |
| Separate sort section | Yes | Single dropdown near content is sufficient. |
| Complex page transitions | Reduced | Simple opacity fade only. |
| Toast notifications for ratings | Yes | Inline state change is sufficient feedback. |
| Multi-select filters | Deferred | Single filter sufficient for MVP. |
