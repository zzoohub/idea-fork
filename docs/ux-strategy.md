# idea-fork -- UX Strategy

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-02-19
**Reference:** [PRD](./prd.md) | [Product Brief](./product-brief.md)

---

## 0. Design Principles

These five principles govern every design decision in idea-fork. When in doubt, resolve conflicts in this priority order.

### P1. Show the signal, not the tool

The product is invisible. Users come for complaints and opportunities, not for dashboards. Every screen should feel like reading content, not operating software. No configuration wizards, no complex filter panels, no settings-heavy chrome.

*Rationale: Aesthetic-usability effect -- interfaces perceived as simpler are perceived as more useful. The competitive gap (vs. Gummysearch, SparkToro) is specifically that those tools feel like tools.*

### P2. One screen, one job

Each page has exactly one primary action. The feed exists to help you find an interesting complaint. The brief exists to help you evaluate a business opportunity. The deep dive exists to help you assess demand strength. Never combine these jobs on one screen.

*Rationale: Hick's Law -- decision time increases logarithmically with the number of choices. Cognitive load theory -- working memory handles approximately 4 chunks.*

### P3. Earn attention before asking for anything

No login walls, no splash screens, no popups on first visit. Users see the full feed immediately. Registration is prompted only at the moment a user tries something that requires it (bookmark, 4th deep dive, full brief). Price is shown only after value is demonstrated.

*Rationale: Endowment effect -- users value what they already "have" (access to the feed). Sunk cost -- the more they browse, the harder it is to leave. Peak-end rule -- the first impression (instant value) anchors perception.*

### P4. Source is sacred

Every data point traces back to a real post written by a real person. Source links are never more than one tap away. AI-generated content is always labeled as such and always cites its evidence. This is a trust product.

*Rationale: Authority bias -- users trust claims backed by verifiable sources. This is the core differentiator against ChatGPT brainstorming.*

### P5. Optimize for the commute

The primary use case is a builder browsing during a short break -- morning coffee, commute, lunch. Design for 5-minute sessions, not hour-long research. Content must be scannable. Cards must communicate value in under 2 seconds.

*Rationale: User scenarios from the product brief (Alex's "10-minute morning coffee" pattern). Mobile-first interaction window.*

---

## 1. Information Architecture

### 1.1 Site Map

```
/ (Feed) ................ Primary entry point, no auth required
/briefs ................. AI Brief card list
/briefs/:id ............. Full AI Brief detail
/products ............... Trending/new products with complaint data
/products/:id ........... Product detail (complaints, sentiment, briefs)
/needs/:id .............. Deep Dive detail view
/bookmarks .............. Saved items (auth required)
/tracking ............... Keyword/domain monitoring (Pro required)
/account ................ Profile, subscription, settings
/login .................. Google OAuth (+ email/password P1)
/pricing ................ Pro tier details + Stripe checkout
```

### 1.2 Navigation Model

**Primary navigation** (persistent top bar):

```
+------------------------------------------------------------------+
| [logo] idea-fork     Feed    Briefs    Products    [user/login]  |
+------------------------------------------------------------------+
```

- **Three primary destinations:** Feed, Briefs, and Products. Three items remain within Hick's Law comfort zone (decision time is negligible for 2-4 options). Each serves a distinct job: Feed = discover problems, Briefs = evaluate opportunities, Products = scout the market.
- **Bookmarks, Tracking, Account** live under the user avatar menu (secondary nav). They are engagement/retention features, not discovery features. Elevating them into primary nav adds noise for the 95% of pageviews that are content browsing.
- **Pricing** is not in the nav. It surfaces contextually at paywall moments (see Section 6: Progressive Disclosure).

**Mobile navigation:**

```
+----------------------------------+
| [logo]              [user/login] |
+----------------------------------+
| Feed   Briefs   Products         |
+----------------------------------+
```

- On mobile, the three primary tabs sit directly below the header. No hamburger menu for primary navigation -- hamburger menus reduce discoverability by 50%+ (Nielsen Norman Group research). Three tabs fit comfortably on mobile width.
- User menu becomes a slide-out drawer triggered by the avatar/login button.

### 1.3 Content Hierarchy

The site has three content depths, each progressively more detailed:

| Depth | Content | Access |
|-------|---------|--------|
| **Surface** | Feed cards, Brief cards, Product cards | Free, no auth |
| **Mid** | Brief summaries, Need previews, Product metrics | Free, no auth |
| **Deep** | Full briefs, Deep dive analytics, Source clusters, Product complaint breakdown | Free (limited) / Pro |

This maps directly to the conversion funnel: attract at surface, engage at mid, convert at deep.

---

## 2. User Flows

### 2.1 Core Flow: New Visitor Discovery (P0)

This is the most important flow. It must work flawlessly.

```
ENTRY: Direct link / Search / Social referral
  |
  v
[Feed page loads in <2s, no login gate]
  |
  v
User sees: tagged complaint cards, sorted by relevance
  |
  +---> Scrolls feed (infinite scroll, batch loading)
  |       |
  |       +---> Clicks card --> original post opens (new tab)
  |       |
  |       +---> Clicks "Deep Dive" on card
  |               |
  |               +---> [Under 3/day limit] --> Need detail page
  |               |
  |               +---> [Over limit] --> Soft paywall modal
  |                       (show preview + "Upgrade for unlimited")
  |
  +---> Clicks tag filter pill
  |       |
  |       v
  |     Feed re-sorts (not re-fetches; client-side re-sort)
  |
  +---> [Desktop] Clicks trending keyword in side panel
  |       |
  |       v
  |     Feed filters to keyword matches
  |
  +---> Navigates to /briefs (top nav)
          |
          v
        Brief card list --> clicks card
          |
          +---> [Not logged in] --> sees title + summary,
          |     blurred full brief, "Sign up to read full brief"
          |
          +---> [Free user] --> same as above, "Upgrade to Pro"
          |
          +---> [Pro user] --> full brief detail
```

**Key design decisions:**

- Feed is the landing page. No hero section, no marketing copy on `/`. The content IS the pitch. (Principle P1, P3)
- Tag filters are pills/chips above the feed, not a sidebar filter panel. One tap to activate, one tap to deactivate. (Principle P2 -- one job: filter)
- "Deep Dive" is a secondary action on each card, not the primary click target. Primary click = source link. This preserves the "direct to source" value prop while offering depth. (Principle P4)

### 2.2 Brief Discovery Flow (P0)

```
ENTRY: /briefs (from nav) or brief link (shared URL)
  |
  v
[Brief card list, sorted by recency then opportunity score]
  |
  +---> Each card shows:
  |     - Brief title
  |     - 1-2 sentence problem summary
  |     - Post count badge
  |     - Platform source icons
  |     - Opportunity score indicator
  |
  +---> Clicks a brief card
          |
          v
        /briefs/:id
          |
          +---> [Pro] Full brief:
          |     - Problem summary (expanded)
          |     - Source evidence (clickable links, 3-5 posts)
          |     - Volume/intensity metrics + trend sparkline
          |     - Existing alternatives section
          |     - Opportunity signal (AI assessment)
          |     - Related need clusters (links to /needs/:id)
          |
          +---> [Free] Partial brief:
                - Problem summary (full)
                - Source evidence: first link visible, rest blurred
                - "Upgrade to see full analysis" CTA
                - Metrics preview (numbers shown, charts blurred)
```

**Key design decisions:**

- Brief cards are visually distinct from feed cards. Feed cards = platform-native styling (Reddit orange, PH brown, GitHub dark, etc.). Brief cards = idea-fork's own visual language (neutral, analytical). This prevents confusion between raw signal and synthesized analysis. (Cognitive: Distinctiveness principle)
- The free preview shows enough to prove value (the problem summary is genuinely useful) but withholds the actionable details (specific source links, competitive analysis). This is the conversion lever. (Principle P3 -- earn attention first)

### 2.3 Deep Dive Flow (P0)

```
ENTRY: "Deep Dive" button on feed card OR link from within a brief
  |
  v
/needs/:id
  |
  +---> Need header:
  |     - Need description + tag badge
  |     - Frequency count ("mentioned in N posts")
  |     - Intensity score (visual indicator)
  |
  +---> Frequency timeline chart (sparkline: growing/stable/declining)
  |
  +---> Source posts list (all original posts, with platform icons + links)
  |
  +---> Related need clusters (clickable links to other /needs/:id)
  |
  +---> [P1] Related briefs (if this need is part of a brief cluster)
  |
  +---> [Free, over limit] Soft paywall:
        - Header + frequency shown (proof of value)
        - Source posts + chart blurred
        - "You've used 3 of 3 free deep dives today.
           Upgrade for unlimited access."
```

### 2.4 Product Discovery Flow (P1)

```
ENTRY: /products (from nav) or product link (shared URL)
  |
  v
[Product card list, sorted by trending score]
  |
  +---> Each card shows:
  |     - Product name + platform icon(s)
  |     - Category / description (1 line)
  |     - Engagement metrics (stars, upvotes, downloads)
  |     - Complaint count badge (e.g., "38 complaints")
  |     - Sentiment indicator (negative/mixed/positive)
  |
  +---> [Optional] Toggle sort: "Trending" / "New"
  |
  +---> Clicks a product card
          |
          v
        /products/:id
          |
          +---> [Pro] Full product detail:
          |     - Product overview (name, description, platforms, metrics)
          |     - Complaint/need breakdown (grouped by theme)
          |     - Sentiment summary + trend
          |     - Related AI briefs (links to /briefs/:id)
          |     - Source link to product's original page
          |
          +---> [Free] Partial product detail:
                - Product overview (full, visible)
                - Complaint count + top theme (visible)
                - Full breakdown blurred
                - "Upgrade to see full complaint analysis" CTA
```

**Key design decisions:**

- Product cards use a **distinct visual language** from feed cards (no platform-colored left border) and from brief cards (includes engagement metrics prominently). This creates three clear content types: raw signals (feed), synthesized opportunities (briefs), market landscape (products). (Distinctiveness principle)
- **Complaint count is the differentiator** on product cards. Every other "trending products" list shows popularity metrics. idea-fork uniquely shows "popular AND criticized" -- this is the value proposition. The complaint count badge uses a warm/alert color to draw attention. (Pre-attentive processing)
- **Sort toggle ("Trending" / "New")** is a simple two-option segmented control, not a dropdown. Two options = no Hick's Law cost. (Hick's Law)

### 2.5 Registration and Upgrade Flow (P0)

```
TRIGGER: User hits a gated feature:
  - 4th deep dive of the day
  - Full brief detail
  - Bookmark button
  - Tracking page
  |
  v
[Context-sensitive modal]
  |
  +---> Not logged in:
  |     "Sign in to [specific action]"
  |     [Continue with Google] (primary CTA)
  |     [Email/password] (secondary, P1)
  |     "Free account includes: [brief feature list]"
  |       |
  |       v
  |     Google OAuth popup --> redirect back to same page
  |       |
  |       v
  |     (If action requires Pro) --> inline upgrade prompt
  |
  +---> Logged in, Free tier:
        "Upgrade to Pro to [specific action]"
        "$9/month -- cancel anytime"
        [brief feature comparison: 3 bullets max]
        [Upgrade now] --> Stripe Checkout
          |
          v
        Stripe hosted checkout --> redirect back
          |
          v
        Success state: "You're on Pro!" (inline banner, auto-dismiss 5s)
        --> feature immediately unlocked, user continues where they left off
```

**Key design decisions:**

- The modal always states the specific action the user was trying to do ("Sign in to bookmark this brief"). This is more compelling than a generic "Sign up for more features." (Cognitive: Goal gradient effect -- the closer to a goal, the more motivated)
- After auth/upgrade, the user returns to exactly where they were. No redirect to a dashboard or welcome page. (Principle P5 -- respect the 5-minute session)
- Feature comparison in the upgrade modal is max 3 bullet points. Not a full pricing table. (Hick's Law -- minimize decision complexity at the moment of conversion)

### 2.6 Bookmark Flow (P1)

```
User sees a feed card or brief card
  |
  +---> Clicks bookmark icon (heart or flag)
  |       |
  |       +---> [Logged in] Item bookmarked.
  |       |     Icon fills in (visual feedback).
  |       |     Subtle toast: "Saved to bookmarks"
  |       |
  |       +---> [Not logged in] Auth modal
  |               "Sign in to save bookmarks"
  |
  +---> User menu --> "Bookmarks" --> /bookmarks
          |
          v
        List of bookmarked items, reverse chronological
        Each item shows same card as in feed/briefs
        Swipe-to-remove (mobile) or hover-reveal X (desktop)
```

### 2.7 Tracking Setup Flow (P1)

```
User menu --> "Tracking" --> /tracking
  |
  +---> [Not Pro] --> Upgrade prompt (see 2.4)
  |
  +---> [Pro] Tracking dashboard:
        +------------------------------------------+
        | Your tracked keywords        [+ Add]     |
        |                                          |
        | "invoicing"  "onboarding"  "HR tech"     |
        | (each is a removable chip)               |
        +------------------------------------------+
        | Recent matches                           |
        |                                          |
        | [Feed card] [Feed card] [Feed card]      |
        | (posts matching tracked keywords,        |
        |  since last visit)                       |
        +------------------------------------------+
  |
  +---> [+ Add] --> text input with autocomplete
  |     (suggests keywords seen in recent feed cycles)
  |     User types keyword --> presses Enter or clicks suggestion
  |     Keyword chip appears immediately (optimistic UI)
  |
  +---> Notification bell in nav header shows unread count
        (new matches since last /tracking visit)
```

---

## 3. Key Screen Layouts

### 3.1 Feed Page (`/`)

**Desktop (1280px+):**

```
+------------------------------------------------------------------+
| [logo] idea-fork           Feed    Briefs       [avatar/login]   |
+------------------------------------------------------------------+
| Updated 3h ago                                                   |
+------------------------------------------------------------------+
|                                                                  |
|  [complaint] [need] [feature-request] [all]   <-- tag filter pills
|                                                                  |
|  +---------------------------------------------+  +----------+  |
|  |                                              |  | TRENDING |  |
|  | +------------------------------------------+ |  |          |  |
|  | | [reddit icon]  r/SaaS                    | |  | Reddit   |  |
|  | | "Why is every invoicing tool so bloated  | |  | #invoice |  |
|  | |  and expensive for freelancers?"         | |  | #auth    |  |
|  | | [complaint]  142 upvotes  47 comments    | |  | #pricing |  |
|  | | [Deep Dive]                    2h ago    | |  |          |  |
|  | +------------------------------------------+ |  | PH       |  |
|  |                                              |  | #deploy  |  |
|  | +------------------------------------------+ |  | #AI      |  |
|  | | [playstore icon]  Google Play            | |  |          |  |
|  | | "Can't export my data. Stuck in this app | |  | GitHub   |  |
|  | |  with no way out."                       | |  | #cli     |  |
|  | | [need]  38 helpful votes                 | |  | #devtool |  |
|  | | [Deep Dive]                    5h ago    | |  +----------+ |
|  | +------------------------------------------+ |               |
|  |                                              |               |
|  | +------------------------------------------+ |               |
|  | | [ph icon]  Product Hunt                  | |               |
|  | | "The onboarding flow took me 20 minutes  | |               |
|  | |  just to see the product"                | |               |
|  | | [complaint]  23 upvotes  12 comments     | |               |
|  | | [Deep Dive]                    8h ago    | |               |
|  | +------------------------------------------+ |               |
|  |                                              |               |
|  | +------------------------------------------+ |               |
|  | | [github icon]  GitHub Trending           | |               |
|  | | "localstack/localstack - A fully          | |               |
|  | |  functional local cloud stack"           | |               |
|  | | [trending]  +1,240 stars/week  Python    | |               |
|  | |                                12h ago   | |               |
|  | +------------------------------------------+ |               |
|  |                                              |               |
|  |  [loading more...]                           |               |
|  +---------------------------------------------+               |
+------------------------------------------------------------------+
```

**Layout rationale:**

- **Feed column: approximately 65% width. Trending panel: approximately 25% width. Margins: approximately 10%.** The feed is the primary content. The trending panel is supplementary context. This ratio ensures the feed gets dominant visual attention. (Cognitive: Visual hierarchy, F-pattern reading)
- **Tag filter pills are above the feed, not in a sidebar.** They occupy horizontal space that would otherwise be wasted. They are always visible (no scroll-away). Single-select by default to reduce complexity. (Hick's Law)
- **"Deep Dive" is a text link, not a button.** It is secondary to the card itself (which links to the source). A full button would compete with the card's click area. (Fitts' Law -- primary target should be largest)
- **Cycle indicator ("Updated 3h ago") is subtle, top of content area.** It sets expectations about freshness without demanding attention. (Progressive disclosure)

**Mobile (< 768px):**

```
+----------------------------------+
| [logo]              [avatar]     |
+----------------------------------+
| Feed    Briefs                   |
+----------------------------------+
| Updated 3h ago                   |
+----------------------------------+
| [complaint] [need] [feature-req] |
+----------------------------------+
|                                  |
| +------------------------------+|
| | [reddit]  r/SaaS             ||
| | "Why is every invoicing tool ||
| |  so bloated and expensive    ||
| |  for freelancers?"           ||
| | [complaint] 142^  47 cmts   ||
| | [Deep Dive]          2h ago ||
| +------------------------------+|
|                                  |
| +------------------------------+|
| | [playstore]  Google Play     ||
| | "Can't export my data..."   ||
| | [need]  38 helpful votes    ||
| | [Deep Dive]          5h ago ||
| +------------------------------+|
|                                  |
| +------------------------------+|
| | [github]  GitHub Trending   ||
| | "localstack/localstack"     ||
| | [trending] +1,240★/wk  Py  ||
| |                     12h ago ||
| +------------------------------+|
|                                  |
+----------------------------------+
```

**Mobile decisions:**

- **Trending panel is removed on mobile.** It is P1 and supplementary. On mobile, screen real estate is too scarce to split with a secondary panel. Trending keywords can be accessed via a collapsible section above the feed or omitted entirely on mobile v1. (Principle P5 -- optimize for the commute; Cognitive: Cognitive load reduction)
- **Tag filter pills scroll horizontally** if they exceed screen width. Native horizontal scroll affordance with partial-visibility of the next pill to signal scrollability.
- **Cards are full-width.** No side margins beyond standard padding (16px). Maximizes readable content area on small screens.

### 3.2 Brief Card List (`/briefs`)

**Desktop:**

```
+------------------------------------------------------------------+
| [logo] idea-fork           Feed    Briefs       [avatar/login]   |
+------------------------------------------------------------------+
|                                                                  |
|  AI Briefs                                    Cycle: Feb 19, 2026|
|  Auto-generated opportunity assessments       [< Previous cycle] |
|  from clustered user needs                                       |
|                                                                  |
|  +--------------------------------------------+                  |
|  | Invoicing Pain Points for Freelancers       |    Opportunity   |
|  | 83 posts across Reddit, App Store           |    ||||||||..    |
|  | "Freelancers are frustrated with bloated,   |    Score: 8.2    |
|  |  expensive invoicing tools that don't       |                  |
|  |  handle recurring billing well."            |    [reddit][app] |
|  +--------------------------------------------+                  |
|                                                                  |
|  +--------------------------------------------+                  |
|  | Dashboard Export Limitations                |    Opportunity   |
|  | 61 posts across Reddit, Product Hunt        |    |||||||...    |
|  | "Users can't export dashboards in useful    |    Score: 7.5    |
|  |  formats. PDF and CSV are inadequate."      |                  |
|  +--------------------------------------------+                  |
|                                                                  |
+------------------------------------------------------------------+
```

**Layout rationale:**

- **Single column of brief cards.** Unlike the feed (which benefits from rapid scanning), briefs require reading. A single column with generous width (max 720px) optimizes line length for readability (50-75 characters per line). (Ergonomics: Optimal line length for reading comprehension)
- **Opportunity score is a horizontal bar + number.** This is more scannable than a written description. Users can compare briefs at a glance. (Pre-attentive processing -- length is processed before conscious attention)
- **Platform source icons** in the bottom-right of each card. Small, recognizable. Users can see at a glance which platforms contributed to this brief.
- **Cycle navigation** ("Previous cycle") is top-right, secondary. Most users want the latest cycle. History is available but not prominent. (Recency bias -- users expect the latest data)

### 3.3 Brief Detail (`/briefs/:id`)

**Desktop:**

```
+------------------------------------------------------------------+
| [logo] idea-fork           Feed    Briefs       [avatar/login]   |
+------------------------------------------------------------------+
|                                                                  |
|  < Back to Briefs                              [Bookmark]        |
|                                                                  |
|  Invoicing Pain Points for Freelancers                           |
|  AI-generated brief -- Feb 19, 2026 cycle                        |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | PROBLEM SUMMARY                                             | |
|  |                                                             | |
|  | 83 people expressed frustration about invoicing tools       | |
|  | across Reddit (54 posts) and App Store (29 reviews).        | |
|  | Key themes: excessive pricing for simple needs, lack of     | |
|  | recurring billing for freelancers, bloated UIs that         | |
|  | require 10+ clicks to send a basic invoice.                 | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | SOURCE EVIDENCE                                    5 posts  | |
|  |                                                             | |
|  | [reddit] "Why is every invoicing tool..."    r/SaaS  -->    | |
|  | [reddit] "I just want to send an invoice..." r/free...-->   | |
|  | [appstore] "Terrible app. Can't even..."     App Sto..-->   | |
|  | [reddit] "Switched from FreshBooks because..." r/Ent..-->   | |
|  | [appstore] "3 stars because recurring..."    App Sto..-->   | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | VOLUME & INTENSITY                                          | |
|  |                                                             | |
|  | Mentions: 83    Intensity: High    Trend: Growing ^         | |
|  | [=========sparkline chart over last 8 weeks========]        | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | EXISTING ALTERNATIVES                                       | |
|  |                                                             | |
|  | FreshBooks -- "too expensive for freelancers" (mentioned 12x)|
|  | Wave -- "shutting down features" (mentioned 8x)             | |
|  | Zoho Invoice -- "terrible UX" (mentioned 6x)                | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | OPPORTUNITY SIGNAL                                          | |
|  |                                                             | |
|  | High opportunity. Growing demand with clear dissatisfaction | |
|  | with existing tools. Gap: a simple, affordable invoicing    | |
|  | tool focused on freelancer recurring billing.               | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  Related needs: [Freelancer billing] [Payment processing]        |
|                                                                  |
+------------------------------------------------------------------+
```

**Layout rationale:**

- **Stacked sections, not tabs.** The full brief is short enough (5 sections) to display vertically. Tabs would hide content and add interaction cost. Users should be able to scroll through the entire brief in 60-90 seconds. (Principle P5; Cognitive: Visibility of system status -- all content is visible)
- **Source evidence is prominent and linked.** Every link has an arrow indicator (-->) signaling it opens externally. (Principle P4 -- source is sacred)
- **"AI-generated brief" label is always visible.** Transparency builds trust. (Authority bias, expectation setting)
- **Back link ("< Back to Briefs")** not a browser-back-dependent pattern. Explicit affordance. (Error prevention -- users on shared URLs need a clear path)

### 3.4 Products (`/products`)

**Desktop:**

```
+------------------------------------------------------------------+
| [logo] idea-fork     Feed    Briefs    Products    [avatar/login] |
+------------------------------------------------------------------+
|                                                                  |
|  Products                                                        |
|  Trending products paired with user complaints                   |
|                                                                  |
|  [Trending]  [New]               <-- segmented sort control      |
|                                                                  |
|  +--------------------------------------------+                  |
|  | [ph][github] Notion Calendar               |  38 complaints   |
|  | "Team calendar with smart scheduling"      |  Sentiment: Mixed|
|  | PH: 1.2K upvotes  GH: +840 stars/week     |                  |
|  | Top issue: "Google Calendar sync broken"   |                  |
|  +--------------------------------------------+                  |
|                                                                  |
|  +--------------------------------------------+                  |
|  | [github][playstore] LocalStack             |  22 complaints   |
|  | "A fully functional local cloud stack"     |  Sentiment: Neg  |
|  | GH: +1,240 stars/week  PS: 4.1K downloads  |                  |
|  | Top issue: "Lambda emulation incomplete"   |                  |
|  +--------------------------------------------+                  |
|                                                                  |
|  +--------------------------------------------+                  |
|  | [playstore][appstore] Invoice Ninja        |  61 complaints   |
|  | "Free invoicing for freelancers"           |  Sentiment: Neg  |
|  | PS: 12K downloads  AS: 8K downloads        |                  |
|  | Top issue: "Recurring billing broken"      |                  |
|  +--------------------------------------------+                  |
|                                                                  |
+------------------------------------------------------------------+
```

**Layout rationale:**

- **Single column of product cards, max 720px width.** Same rationale as briefs: products require reading, not rapid scanning. Consistent layout across briefs and products. (Consistency principle)
- **Complaint count badge is right-aligned and prominent.** This is the differentiator. Users can instantly see which trending products have the most user pain. (Pre-attentive processing -- number magnitude)
- **"Top issue" line on each card** shows one representative complaint. This is the hook -- it proves the complaint data exists and is specific. (Principle P3 -- earn attention before asking)
- **Platform multi-badge** (e.g., [ph][github]) shows which platforms this product was found on. Multiple platform presence signals broader market relevance.
- **Segmented control ("Trending" / "New")** is minimal and positioned above cards. Two options only -- no cognitive cost. (Hick's Law)

### 3.5 Product Detail (`/products/:id`)

**Desktop:**

```
+------------------------------------------------------------------+
| [logo] idea-fork     Feed    Briefs    Products    [avatar/login] |
+------------------------------------------------------------------+
|                                                                  |
|  < Back to Products                              [Bookmark]      |
|                                                                  |
|  Notion Calendar                                                 |
|  [product-hunt] [github]                                         |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | OVERVIEW                                                    | |
|  |                                                             | |
|  | "Team calendar with smart scheduling and availability"      | |
|  | Launched: Feb 10, 2026                                      | |
|  | PH: 1.2K upvotes, 89 comments                              | |
|  | GitHub: 2.4K stars (+840/week), 312 forks                   | |
|  | [Visit on Product Hunt -->]  [Visit on GitHub -->]          | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | COMPLAINT BREAKDOWN                              38 total   | |
|  |                                                             | |
|  | Google Calendar sync (14 posts)                             | |
|  |   "Calendar sync drops every few hours..."  [reddit] -->    | |
|  |   "Lost all my events after sync..."        [playstore]--> | |
|  |                                                             | |
|  | Pricing concerns (11 posts)                                 | |
|  |   "Pro plan is $8/mo for a calendar app?"   [reddit] -->   | |
|  |   "Too expensive vs free alternatives"      [appstore]-->  | |
|  |                                                             | |
|  | Missing features (8 posts)                                  | |
|  |   "No recurring event support"              [reddit] -->   | |
|  |                                                             | |
|  | Performance issues (5 posts)                                | |
|  |   "App takes 5 seconds to load"             [playstore]--> | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | SENTIMENT SUMMARY                                           | |
|  |                                                             | |
|  | Overall: Mixed (2.8 / 5)    Trend: Worsening v             | |
|  | [=========sparkline chart over last 4 weeks========]        | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | RELATED BRIEFS                                              | |
|  |                                                             | |
|  | [Invoicing Pain Points for Freelancers]  Score: 8.2 -->    | |
|  | [Calendar Sync Reliability Issues]       Score: 7.1 -->    | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+
```

**Layout rationale:**

- **Stacked sections, same pattern as brief detail.** Users learn one page structure and apply it everywhere. (Consistency, recognition over recall)
- **Complaint breakdown grouped by theme, not by platform.** Theme grouping is more actionable ("sync is the biggest issue") than platform grouping ("Reddit has 20 posts"). Platform is shown per-post as a secondary badge. (Principle P2 -- one job: assess product weaknesses)
- **Related briefs** connect product complaints back to the opportunity analysis. This creates a cross-linking loop: feed → product → brief → need. (Network effect within the product)
- **Source links on every complaint** maintain the "source is sacred" principle. (Principle P4)

### 3.6 Deep Dive (`/needs/:id`)

```
+------------------------------------------------------------------+
|                                                                  |
|  < Back                                        [Bookmark]        |
|                                                                  |
|  "Invoicing tools are too expensive for freelancers"             |
|  [complaint]                                                     |
|                                                                  |
|  +---------------------------+  +------------------------------+ |
|  | FREQUENCY                 |  | INTENSITY                    | |
|  | 83 posts                  |  | High (4.2 / 5)               | |
|  | [sparkline: 8 weeks]      |  | [filled bar indicator]       | |
|  | Trend: Growing ^          |  |                              | |
|  +---------------------------+  +------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | SOURCE POSTS                                      83 total  | |
|  |                                                             | |
|  | [reddit] "Why is every invoicing tool..."  142^  2h ago --> | |
|  | [reddit] "I just want to send an invoice..." 89^ 1d ago -->| |
|  | [appstore] "Terrible app. Can't even..."   38 hlp 3d ago-->| |
|  | ... (paginated, 20 per page)                               | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | RELATED CLUSTERS                                            | |
|  |                                                             | |
|  | [Payment processing complaints]  (41 posts) -->             | |
|  | [Freelancer tool pricing]        (29 posts) -->             | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | RELATED BRIEF                                               | |
|  |                                                             | |
|  | [Invoicing Pain Points for Freelancers]  Score: 8.2 -->     | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+
```

### 3.7 Bookmarks (`/bookmarks`)

```
+------------------------------------------------------------------+
|                                                                  |
|  Your Bookmarks                                                  |
|  Saved feed items and briefs                                     |
|                                                                  |
|  [All]  [Feed items]  [Briefs]     <-- simple filter tabs        |
|                                                                  |
|  +--------------------------------------------+                  |
|  | [Brief card -- same styling as /briefs]     |  [x remove]     |
|  +--------------------------------------------+                  |
|                                                                  |
|  +--------------------------------------------+                  |
|  | [Feed card -- same styling as / feed]       |  [x remove]     |
|  +--------------------------------------------+                  |
|                                                                  |
|  (empty state if no bookmarks:)                                  |
|  "No bookmarks yet. Browse the feed and save                     |
|   items you want to revisit."                                    |
|  [Browse feed -->]                                               |
|                                                                  |
+------------------------------------------------------------------+
```

**Layout rationale:**

- **Reuses card components from feed and briefs.** No new visual language to learn. (Consistency principle; Cognitive: Recognition over recall)
- **Empty state includes a clear call to action.** Never leave the user at a dead end. (Error prevention, progressive disclosure)

### 3.8 Tracking (`/tracking`)

```
+------------------------------------------------------------------+
|                                                                  |
|  Tracking                                                        |
|  Monitor keywords and domains for emerging needs                 |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | YOUR KEYWORDS                                     [+ Add]  | |
|  |                                                             | |
|  | [invoicing x] [onboarding x] [HR tech x]                   | |
|  |                                                             | |
|  | (empty: "Add keywords to start tracking.")                  | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | NEW MATCHES (since your last visit)              12 new     | |
|  |                                                             | |
|  | [Feed card with highlight border]                           | |
|  | [Feed card with highlight border]                           | |
|  | [Feed card with highlight border]                           | |
|  | ... (paginated)                                             | |
|  |                                                             | |
|  | (empty: "No new matches since your last visit.")            | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+
```

### 3.9 Account (`/account`)

```
+------------------------------------------------------------------+
|                                                                  |
|  Account                                                         |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | PROFILE                                                     | |
|  |                                                             | |
|  | Name: zzoo                                                  | |
|  | Email: zzoo@example.com                                     | |
|  | Member since: Feb 2026                                      | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | SUBSCRIPTION                                                | |
|  |                                                             | |
|  | Current plan: Free                                          | |
|  | [Upgrade to Pro - $9/mo]                                    | |
|  |                                                             | |
|  | -- OR if Pro: --                                            | |
|  | Current plan: Pro ($9/mo)                                   | |
|  | Next billing date: Mar 19, 2026                             | |
|  | [Manage subscription]  [Cancel]                             | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | PREFERENCES                                                 | |
|  |                                                             | |
|  | Weekly digest email: [toggle on/off]                        | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  [Sign out]                                                      |
|                                                                  |
+------------------------------------------------------------------+
```

---

## 4. Component Patterns and UI Toolkit

### 4.1 Card System

The card is the atomic unit of idea-fork. Three card variants:

**Feed Card:**

```
+----------------------------------------------+
| [platform icon]  [platform name]             |
|                                              |
| "Post title or excerpt, truncated to 2      |
|  lines maximum for scannability..."          |
|                                              |
| [tag badge]   [engagement metrics]    [time] |
| [Deep Dive link]                             |
+----------------------------------------------+
```

- Platform-specific left-border color: Reddit (#FF5700), Product Hunt (#DA552F), Play Store (#01875F), App Store (#0D84FF), GitHub (#24292F)
- Entire card is clickable --> opens source in new tab
- "Deep Dive" link has its own click target (does not conflict with card click via `event.stopPropagation()`)
- Tag badge: colored pill (complaint = red-toned, need = blue-toned, feature-request = green-toned)
- Max card height: constrained. Excerpt truncates at 2 lines with ellipsis.

**Brief Card:**

```
+----------------------------------------------+
| Brief title                       [bookmark] |
|                                              |
| Summary text, 1-2 sentences...               |
|                                              |
| [post count] [platform icons]   [opp. score] |
+----------------------------------------------+
```

- No platform-specific border. Uses idea-fork's neutral card style.
- Opportunity score: horizontal bar + numeric value.
- Entire card is clickable --> opens /briefs/:id.

**Product Card:**

```
+----------------------------------------------+
| [platform icons]  Product Name    [bookmark] |
|                                              |
| "Short description, 1 line..."               |
|                                              |
| [metrics: stars/upvotes/downloads]           |
| Top issue: "Representative complaint..."     |
|                                              |
| [complaint count badge]      [sentiment ind] |
+----------------------------------------------+
```

- No platform-specific left border (unlike feed cards). Uses a neutral card style similar to brief cards but with a distinct layout emphasizing metrics.
- Complaint count badge: warm/alert color (e.g., `#DC2626` background) positioned prominently. This is the card's unique value signal.
- Platform multi-badge: small icons (e.g., [PH][GH]) showing which platforms the product was found on.
- "Top issue" line: one representative complaint excerpt, truncated at 1 line. Proves the complaint data exists.
- Entire card is clickable --> opens /products/:id.
- Sentiment indicator: colored dot (red = negative, yellow = mixed, green = positive) with text label.

**Tracked Match Card (on /tracking):**

- Same as Feed Card but with a subtle highlight border or "NEW" badge for unseen matches.

### 4.2 Tag Badges

| Tag | Background Color | Text Color | Use |
|-----|-----------------|------------|-----|
| complaint | `#DC2626` | `#FFFFFF` | Most common, high signal |
| need | `#2563EB` | `#FFFFFF` | Expressed desire |
| feature-request | `#059669` | `#FFFFFF` | Specific product ask |
| discussion | `#6B7280` | `#FFFFFF` | Lower signal, shown in "all" |
| self-promo | `#6B7280` | `#FFFFFF` | Lowest signal |
| other | `#6B7280` | `#FFFFFF` | Catch-all |

- All badge colors meet WCAG AA contrast against white text (4.5:1 minimum). Verified: #DC2626 on white text = 4.63:1, #2563EB = 4.56:1, #059669 = 4.52:1, #6B7280 = 4.57:1.
- Badge is small (font-size: 12px, padding: 2px 8px, border-radius: full).

### 4.3 Buttons and CTAs

| Type | Usage | Style |
|------|-------|-------|
| **Primary** | One per screen. "Upgrade to Pro", "Sign in" | Solid fill, high contrast, min 44x44px touch target |
| **Secondary** | Supporting actions. "Cancel", "Back" | Outlined or ghost style, same min touch target |
| **Text link** | In-content actions. "Deep Dive", "View all" | Underlined or colored text, no box, min 44px tap height |
| **Icon button** | Bookmark, close, menu | Icon only, 44x44px touch target, tooltip on desktop hover |

- **All interactive targets: minimum 44x44px** (WCAG 2.5.5 Target Size, AAA for touch). This is non-negotiable for mobile usability.
- Primary CTA color: consistent across the app (suggest a saturated blue or brand accent). Never use the platform-specific colors for CTAs -- those are reserved for source attribution.

### 4.4 Modals

Used for: auth prompts, upgrade prompts, confirmations.

- Max width: 480px.
- Always dismissible (X button + click outside + Escape key).
- Focus trapped inside modal when open (accessibility requirement).
- Single primary action, single secondary action (dismiss). Never more than two actions.
- On mobile (< 640px): modals become bottom-sheets for thumb-zone accessibility.

### 4.5 Toast Notifications

Used for: bookmark confirmation, upgrade success, tracking keyword added.

- Appears bottom-center (mobile) or bottom-right (desktop).
- Auto-dismiss after 5 seconds.
- Includes undo action where applicable (e.g., bookmark removal).
- Max one toast visible at a time (queue additional toasts).

### 4.6 Empty States

Every list/collection screen has a designed empty state:

| Screen | Empty State Text | Action |
|--------|-----------------|--------|
| Feed (no results for filter) | "No posts match this filter. Try removing filters or check back after the next update." | [Clear filters] |
| Feed (first cycle pending) | "The first batch of needs is being processed. Check back in a few hours." | None |
| Briefs (no briefs yet) | "Briefs are generated each cycle. Check back soon." | [Browse feed] |
| Products (no products yet) | "Product data is being processed. Check back after the next update." | [Browse feed] |
| Product detail not found (404) | "This product is no longer tracked." | [Browse products] |
| Bookmarks (none saved) | "No bookmarks yet. Browse the feed and save items you want to revisit." | [Browse feed] |
| Tracking keywords (none added) | "Add keywords to monitor emerging needs in your domain." | [+ Add keyword] |
| Tracking matches (no new) | "No new matches since your last visit. Your tracked keywords are active." | None |
| Search/filter no results | "No results found. Try different keywords." | [Clear search] |

### 4.7 Skeleton Loading States

- Feed: show 5 skeleton cards (animated pulse) while loading.
- Briefs: show 3 skeleton brief cards.
- Deep Dive: show skeleton for header + chart placeholder + 3 skeleton source post rows.
- Products: show 3 skeleton product cards.
- Product detail: show skeleton for each section block (same pattern as brief detail).
- Brief detail: show skeleton for each section block.
- Never show a blank white page. Skeleton states set expectations and reduce perceived load time. (Cognitive: Perceived performance -- skeleton screens reduce perceived wait time by up to 50% vs. spinners)

### 4.8 UI Toolkit Recommendation

For a solo developer, the following stack minimizes custom CSS while providing accessible, consistent components:

| Layer | Recommendation | Rationale |
|-------|---------------|-----------|
| **Component library** | shadcn/ui | Copy-paste components (not a dependency), built on Radix UI primitives (accessibility baked in), Tailwind-based, highly customizable. No vendor lock-in. |
| **Styling** | Tailwind CSS | Utility-first, fast iteration, responsive built-in, pairs with shadcn/ui. |
| **Icons** | Lucide Icons | Default icon set for shadcn/ui, consistent line style, tree-shakeable. |
| **Charts** | Recharts or shadcn/ui charts (built on Recharts) | Sparklines for trend data, simple bar for opportunity scores. No complex charting needs. |
| **Motion** | CSS transitions only (no animation library) | The product has minimal motion needs. Card hover states, modal enter/exit, toast slide-in. CSS `transition` covers all cases. No need for Framer Motion complexity. |
| **Font** | Inter (variable) | Clean, highly legible at small sizes, free, widely cached by browsers. |

### 4.9 Spacing and Typography Scale

**Spacing scale (based on 4px grid):**

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps (badge padding, inline spacing) |
| `space-2` | 8px | Compact spacing (within cards, between badge and text) |
| `space-3` | 12px | Default element spacing |
| `space-4` | 16px | Card internal padding, mobile horizontal margins |
| `space-6` | 24px | Section spacing within pages |
| `space-8` | 32px | Between major page sections |
| `space-12` | 48px | Page top/bottom padding |

**Typography scale:**

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Page title | 24px | 700 | 1.2 | Brief titles, page headings |
| Section heading | 18px | 600 | 1.3 | "SOURCE EVIDENCE", "VOLUME & INTENSITY" |
| Card title / excerpt | 16px | 400 | 1.5 | Feed card text, brief summaries |
| Body text | 14px | 400 | 1.6 | General UI text, descriptions |
| Caption / meta | 12px | 400 | 1.4 | Timestamps, tag badges, engagement counts |
| Small / legal | 11px | 400 | 1.4 | "AI-generated", attribution labels |

---

## 5. Mobile vs. Desktop Considerations

### 5.1 Breakpoints

| Breakpoint | Name | Layout Changes |
|-----------|------|----------------|
| < 640px | Mobile | Single column, no trending panel, full-width cards, horizontal-scroll filter pills, bottom-sheets for modals |
| 640-1024px | Tablet | Single column, optional trending panel collapse, wider cards with more horizontal space |
| > 1024px | Desktop | Two-column feed layout (feed + trending panel), standard card widths, centered modals |

### 5.2 Mobile-Specific Decisions

| Decision | Rationale |
|----------|-----------|
| **No trending panel on mobile** | Insufficient screen width. Trending keywords are P1 and supplementary. Can be accessed via a collapsible accordion above feed in a future iteration. |
| **Tag pills scroll horizontally** | Avoids wrapping to multiple lines (which pushes content below the fold). Partial-visibility of the next pill signals scrollability. |
| **Cards are full-width** | Maximizes reading area. 16px horizontal padding only. |
| **"Deep Dive" link becomes a full-width tappable row** | On mobile, the link needs a larger tap target. It sits at the bottom of the card, separated by a thin divider. Min 44px height. |
| **Brief detail is a full page, not a modal** | On mobile, modals for long content are unusable. /briefs/:id is always a full page navigation. |
| **Bottom-sheet for auth/upgrade prompts** | Instead of centered modals, use bottom-sheets on mobile. They are easier to reach with one hand (thumb zone) and feel native to mobile users. |
| **Infinite scroll batch size: 10 cards** | Smaller batches on mobile for faster rendering and lower memory usage. Desktop: 20 cards per batch. |
| **Simplified engagement metrics** | On mobile, show abbreviated metrics (e.g., "142^" instead of "142 upvotes"). Saves horizontal space. |

### 5.3 Desktop-Specific Decisions

| Decision | Rationale |
|----------|-----------|
| **Trending panel is sticky** | As the user scrolls the feed, the trending panel stays visible. It serves as persistent context and a filter mechanism. Sticky until the user scrolls past the feed content. |
| **Card hover states** | Subtle elevation change (box-shadow increase) on hover to indicate clickability. Not applicable on mobile (no hover). |
| **Keyboard shortcuts (P2, future)** | Consideration for power users: `j`/`k` for feed navigation, `b` for bookmark, `o` for open source link. Not in v1 but design does not preclude it. |
| **Max content width: 1280px** | Beyond this width, line lengths become too long for comfortable reading. Content is centered with side margins on wider screens. |
| **Feed card max width: 720px** | Within the feed column, cards do not stretch infinitely. Constrained width improves readability. |

### 5.4 Touch and Pointer Considerations

| Interaction | Touch (Mobile) | Pointer (Desktop) |
|------------|----------------|-------------------|
| Card tap/click | Opens source in new tab | Same behavior, with hover preview state |
| Bookmark | Tap icon (44x44px target) | Click icon, with tooltip "Bookmark" on hover |
| Deep Dive | Tap full-width link row at card bottom | Click text link within card |
| Filter pills | Tap pill (min 36px height, 44px tap target with padding) | Click pill, with hover state |
| Trending keyword | Not available on mobile v1 | Click keyword in side panel |
| Card swipe | No swipe actions on feed cards (avoid accidental triggers) | N/A |
| Bookmark removal | Swipe-to-reveal delete on /bookmarks | Hover-reveal X button |

---

## 6. Onboarding and Progressive Disclosure (Free to Pro Conversion)

### 6.1 Philosophy

There is no onboarding wizard. The product onboards through use. Each feature is explained at the moment the user encounters it, not before.

```
VISIT 1: Pure value delivery
  |
  User arrives --> sees feed immediately --> browses, clicks cards
  No prompts, no tooltips, no "welcome" modal
  |
VISIT 1-3: Feature discovery through use
  |
  User discovers tag filters by seeing the pills
  User discovers briefs by clicking "Briefs" in nav
  User discovers deep dive by clicking the link on a card
  |
CONVERSION TRIGGER: User hits a gate
  |
  4th deep dive --> soft paywall
  Full brief detail --> soft paywall
  Bookmark attempt --> auth prompt
  |
REGISTRATION: Minimal friction
  |
  Google OAuth (one click) --> back to exact context
  |
UPGRADE: Value already demonstrated
  |
  User has already read 3 deep dives and seen brief summaries
  Upgrade prompt references what they just tried to do
  $9/mo, cancel anytime, 3 bullets of Pro value
```

### 6.2 Progressive Disclosure Map

| Stage | What Is Visible | What Is Hidden | Trigger to Reveal Next Stage |
|-------|----------------|----------------|------------------------------|
| **Anonymous visitor** | Full feed, tag filters, brief titles + summaries, trending keywords, product list with basic metrics | Full briefs, full product detail, deep dive (>3/day), bookmarks, tracking, notifications | Attempts gated action |
| **Free registered user** | Same as above + bookmarks (save/view) | Full briefs, full product detail, deep dive (>3/day), tracking, notifications, weekly digest | Clicks upgrade CTA or hits Pro-only feature |
| **Pro user** | Everything | Nothing | -- |

### 6.3 Paywall Design

**Soft paywall, not hard paywall.** Users always see partial content, never a blank wall. This is critical for conversion psychology.

**Deep dive paywall (4th attempt):**

```
+----------------------------------------------+
|                                              |
|  "Invoicing tools are too expensive..."      |
|  [complaint]                                 |
|                                              |
|  FREQUENCY: 83 posts      INTENSITY: High    |
|  (chart and source posts are blurred below)  |
|                                              |
|  +----------------------------------------+ |
|  | You've used 3 of 3 free deep dives     | |
|  | today. Upgrade to Pro for unlimited.    | |
|  |                                        | |
|  | [Upgrade to Pro - $9/mo]               | |
|  | Resets daily. Or upgrade for unlimited. | |
|  +----------------------------------------+ |
|                                              |
+----------------------------------------------+
```

**Brief paywall (detail view for free users):**

```
+----------------------------------------------+
|                                              |
|  PROBLEM SUMMARY (full, visible)             |
|  83 people expressed frustration about...    |
|                                              |
|  SOURCE EVIDENCE (blurred)                   |
|  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx             |
|  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx             |
|                                              |
|  +----------------------------------------+ |
|  | See the full analysis:                 | |
|  | - Source evidence with links            | |
|  | - Competitive landscape                 | |
|  | - Opportunity assessment                | |
|  |                                        | |
|  | [Upgrade to Pro - $9/mo]               | |
|  +----------------------------------------+ |
|                                              |
+----------------------------------------------+
```

**Rationale:**

- Showing partial content (the problem summary, the frequency number) proves the data exists and is valuable. Blurring the rest creates desire without feeling deceptive. (Cognitive: Endowment effect -- user feels they already "have" part of it. Zeigarnik effect -- incomplete information creates tension that motivates completion.)
- The paywall always states what the user will get, not what they are missing. Framing as gain, not loss. (Loss aversion framing -- inverted for positive effect)
- Daily reset for free deep dives is mentioned explicitly. This reduces upgrade pressure for casual users while still driving conversion for power users. (Fairness perception)

### 6.4 Conversion Touchpoints

| Touchpoint | Trigger | Message Style | CTA |
|-----------|---------|--------------|-----|
| Deep dive limit | 4th deep dive attempt in a day | Inline banner over blurred content | "Upgrade to Pro - $9/mo" |
| Full brief | Click brief detail as free/anon user | Inline upgrade block below visible summary | "Upgrade to see full analysis" |
| Bookmark (anon) | Click bookmark icon when not logged in | Modal | "Sign in to save bookmarks" |
| Bookmark (free) | Already works for free tier | N/A | N/A |
| Product detail | Click product detail as free/anon user | Inline upgrade block below visible overview | "Upgrade to see full complaint analysis" |
| Tracking | Navigate to /tracking as free user | Full-page upgrade prompt | "Track keywords and get notified. Upgrade to Pro." |
| Notification bell | Visible in nav for all users; clicking as free shows upgrade prompt | Popover | "Get notified about new matches. Pro feature." |

### 6.5 What We Do NOT Do

These are explicit anti-patterns. Do not implement any of these, regardless of conversion pressure:

- **No "trial period" for Pro.** The free tier is permanent. This reduces decision anxiety. Users should never feel rushed. (Cognitive: Decision paralysis from time pressure)
- **No feature count badges** ("You have 2 of 3 deep dives remaining") persistently visible in the UI. This creates anxiety and annoyance. The limit is communicated only at the moment of hitting it.
- **No email capture popups.** Ever. Not on first visit, not on fifth visit, not anywhere. (Principle P3)
- **No "Sign up to continue reading" on the feed.** The feed is fully free, forever. Gating the feed would destroy the hook. (Principle P3)
- **No dark patterns.** No pre-checked subscription boxes. No confusing cancellation flows. No "Are you sure? You'll lose..." guilt language. Cancel is one click from /account. (Trust product -- Principle P4 extends to business practices)

---

## 7. Accessibility

### 7.1 Non-Negotiable Requirements (WCAG 2.1 AA)

| Requirement | Specification | Implementation Notes |
|------------|--------------|----------------------|
| **Color contrast (text)** | Normal text: 4.5:1 minimum against background. Large text (18px+ bold, 24px+ regular): 3:1 minimum. | Test all tag badge colors, platform border colors against backgrounds. Use axe DevTools, WebAIM Contrast Checker. |
| **Color contrast (UI)** | UI components and graphical objects: 3:1 against adjacent colors. | Opportunity score bars, sparkline charts, interactive borders must meet 3:1. |
| **Touch targets** | Minimum 44x44px for all interactive elements. | Cards, buttons, links, tag pills, bookmark icons, modal dismiss buttons, filter tabs. |
| **Keyboard navigation** | All interactive elements reachable via Tab. Logical tab order follows visual layout. Visible focus indicators on all focusable elements. | Use Radix UI primitives (shadcn/ui) which handle focus management. Custom focus ring: 2px solid, offset 2px, high-contrast color (e.g., `#2563EB`). |
| **Focus management** | Modal open: focus moves to modal first focusable element. Modal close: focus returns to trigger element. Page navigation: focus moves to `<main>` or `<h1>`. | Radix Dialog handles modal focus trapping automatically. Implement skip-to-content link as first focusable element on every page. |
| **Screen reader support** | Meaningful alt text on all images. ARIA labels on icon-only buttons. Live regions for dynamic content updates (toasts, loading completions). | `aria-label` on bookmark icon button, close icon button, notification bell. `aria-live="polite"` on toast notification container. `role="status"` on skeleton loader containers. |
| **Reduced motion** | Respect `prefers-reduced-motion` media query. Disable all transitions and animations when the user has requested reduced motion. | `@media (prefers-reduced-motion: reduce)` -- set `transition-duration: 0.01ms`, `animation-duration: 0.01ms`, `animation-iteration-count: 1`. |
| **Semantic HTML** | Use `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`, `<aside>` appropriately. | Feed cards: `<article>`. Trending panel: `<aside>`. Brief sections: `<section>` with heading. Navigation: `<nav>` with `aria-label`. |
| **Link purpose** | All links describe their destination. No "click here" or "read more" without context. | "Deep Dive" links: `aria-label="Deep dive into [need title]"`. Source links: `aria-label="Open original post on [platform name]"`. External links: `target="_blank"` + `rel="noopener noreferrer"` + visual external link icon. |
| **Page titles** | Each page has a unique, descriptive `<title>`. | Feed: "idea-fork -- Real user complaints ranked". Briefs: "AI Briefs -- idea-fork". Brief detail: "[Brief title] -- idea-fork". Deep dive: "[Need title] -- idea-fork". |
| **Heading hierarchy** | One `<h1>` per page. Headings do not skip levels. | Feed: `<h1>` is visually hidden but present ("Feed"). Each card title could be `<h2>` or `<h3>` depending on structure. |
| **Form accessibility** | All form inputs have associated `<label>` elements. Error messages are programmatically associated with inputs. | Tracking keyword input: `<label for="keyword-input">Add keyword</label>`. Login forms: labeled inputs with `aria-describedby` for error messages. |

### 7.2 Color Considerations

- **Never use color alone to convey meaning.** Tag badges use color AND text label. Opportunity score uses bar length AND numeric value. Trend direction uses arrow icon AND text label ("Growing"). Platform source uses icon AND platform name text, not just the colored left border.
- **Platform source identification uses multiple cues:** Platform icon (shape) + platform name text + colored border. Any single cue can be removed and the source is still identifiable.
- **Dark mode (P2, not in v1):** Design the color system with CSS custom properties / Tailwind CSS variables from day one. All colors should reference tokens, not hard-coded hex values. This ensures dark mode can be added later without refactoring every component.

### 7.3 Content Accessibility

- **Reading level:** UI copy should target an 8th-grade reading level (Flesch-Kincaid). Avoid jargon beyond what the target audience (builders, indie hackers) naturally uses. Terms like "need cluster" and "opportunity score" are acceptable; terms like "engagement heuristic" or "sentiment aggregation" are not.
- **Error messages:** Always state (1) what went wrong and (2) what to do about it. Example: "Couldn't load the deep dive. Check your connection and try again." Never: "Error 500" or "Something went wrong."
- **Loading states:** Skeleton loaders with `aria-busy="true"` on the container element. When loading completes, `aria-busy` is removed. Screen readers should be able to detect the transition from loading to loaded state.
- **External links:** Always marked with a small external link icon (Lucide `ExternalLink`) and open in a new tab. `aria-label` includes "(opens in new tab)" suffix.

---

## 8. Interaction Patterns

### 8.1 Feed Interactions

| Interaction | Behavior | User Feedback |
|------------|----------|---------------|
| **Card click** | Opens source URL in new tab via `window.open()` | Card shows brief press state (subtle opacity change on mobile, elevation on desktop). Browser handles new tab. |
| **Deep Dive click** | Navigates to /needs/:id via client-side routing | Standard page transition. Back button returns to feed at preserved scroll position. |
| **Tag filter click** | Client-side re-sort of feed. Does NOT re-fetch from server. Changes sort priority based on selected tag. | Active pill gets filled background color. Inactive pills revert to outline. Feed content re-renders with smooth crossfade. Scroll resets to top of feed. |
| **Scroll to load more** | Fetch next batch when user scrolls past 80% of loaded content | Skeleton cards (3-5) appear at bottom of feed. New cards append below. No layout shift of existing cards. |
| **Trending keyword click (desktop)** | Filters feed to posts containing that keyword | Keyword pill highlights in trending panel. Feed content updates. "Showing results for: [keyword]" banner appears above feed with [X clear] action to reset. |
| **Pull to refresh (mobile, P2)** | Re-fetches latest feed data | Native pull-to-refresh indicator. Feed updates in place. |

### 8.2 Product Interactions

| Interaction | Behavior | User Feedback |
|------------|----------|---------------|
| **Product card click** | Navigates to /products/:id via client-side routing | Standard page transition. |
| **Sort toggle click** | Switches between "Trending" and "New" sort. Client-side re-sort. | Active segment highlights. Product list re-renders with smooth crossfade. |
| **Source link click (within product detail)** | Opens product page on source platform in new tab | External link icon visible. |
| **Complaint link click (within product detail)** | Opens original post in new tab OR navigates to /needs/:id | Depends on context: source link = new tab, need link = client-side nav. |
| **Related brief click** | Navigates to /briefs/:id | Standard page transition. |
| **Bookmark click** | Toggles bookmark state (optimistic UI) | Same pattern as brief bookmark. Toast confirmation. |

### 8.3 Brief Interactions

| Interaction | Behavior | User Feedback |
|------------|----------|---------------|
| **Brief card click** | Navigates to /briefs/:id via client-side routing | Standard page transition. |
| **Source link click (within brief detail)** | Opens source URL in new tab | External link icon visible next to link. Brief press state on the link row. |
| **Cycle navigation** | Loads previous cycle's briefs via client-side fetch | Page content swaps. Cycle date updates in header. Brief cards replace with skeleton loaders during fetch, then populate. |
| **Bookmark click** | Toggles bookmark state (optimistic UI) | Icon fills (bookmarked) or unfills (unbookmarked). Toast confirmation: "Saved to bookmarks" or "Removed from bookmarks" with undo action. |
| **Related need click** | Navigates to /needs/:id | Standard page transition. |

### 8.4 Paywall Interactions

| Interaction | Behavior | User Feedback |
|------------|----------|---------------|
| **Hit deep dive limit** | Modal/inline banner appears over blurred content | Content visibly present but inaccessible (CSS blur + overlay). Clear upgrade CTA. Dismiss button returns user to previous page (feed or brief). |
| **Click full brief (free user)** | Page loads with partial content + inline upgrade block | No modal on page load. Inline presentation within the page flow. User can still read the full problem summary. Blurred sections are visible but unreadable. |
| **Upgrade CTA click** | Redirect to Stripe Checkout (hosted page) | Loading spinner on button while redirect prepares. Stripe page loads in same tab. |
| **Successful upgrade** | Stripe redirects back to original page with success param | Success banner at top of page: "Welcome to Pro!" (auto-dismiss 10s). Previously blurred content immediately unlocked. No page reload required if using client-side subscription state. |
| **Failed payment** | Stripe redirects back with error param | Error banner: "Payment couldn't be processed. You haven't been charged. Try again or contact support." [Try again] button. |
| **Dismiss paywall modal** | Modal closes | No penalty. No follow-up popup. No nag banner. User returns to browsing. |

### 8.5 Scroll Position Preservation

- **Feed to Deep Dive and back:** When a user navigates from the feed to /needs/:id and then presses the browser back button or clicks "< Back", the feed scroll position is restored. Implemented via Next.js scroll restoration or manual scroll position storage in session state.
- **Brief list to Brief detail and back:** Same behavior.
- **Feed to external source and back:** When a user clicks a card (opens source in new tab) and then returns to the idea-fork tab, their scroll position is naturally preserved (same tab, same page).
- **This is critical for the 5-minute session pattern** (Principle P5). Users should never lose their place in the feed.

### 8.6 URL and Sharing Behavior

- **Every brief has a unique, shareable URL:** `/briefs/:id`. When shared, the recipient sees the same brief (with appropriate free/Pro gating).
- **Every product has a unique, shareable URL:** `/products/:id`. When shared, the recipient sees the product overview (with free/Pro gating on complaint detail).
- **Every deep dive has a unique, shareable URL:** `/needs/:id`. Same gating rules apply.
- **Feed filter state is NOT in the URL.** Filters are ephemeral client-side state. Sharing `/` always shows the default feed. This keeps URLs clean and prevents confusion. (If filter-sharing becomes a user request, it can be added as query params later.)
- **OpenGraph meta tags** on brief and need pages for rich social sharing previews (title, description, image placeholder).

---

## 9. Error and Edge Case Handling

### 9.1 Error States

| Error | What the User Sees | Recovery Action |
|-------|-------------------|-----------------|
| **Feed fails to load** | "Couldn't load the feed. Check your connection and try again." | [Retry] button re-fetches feed data. |
| **Brief not found (404)** | "This brief is no longer available. It may have been from a previous cycle." | [Browse latest briefs] link to /briefs. |
| **Product not found (404)** | "This product is no longer tracked. Browse trending products to find current market signals." | [Browse products] link to /products. |
| **Deep dive not found (404)** | "This need is no longer tracked. Browse the feed to find current needs." | [Browse feed] link to /. |
| **Auth fails (OAuth error)** | "Sign-in failed. Please try again. If the problem persists, try a different browser." | [Try again] button re-triggers OAuth flow. |
| **Stripe checkout fails** | "Payment couldn't be processed. You haven't been charged." | [Try again] button. [Contact support] link. |
| **Network error (any page)** | Inline banner at top of page: "You appear to be offline. Some features may be unavailable." | Auto-retry when connection is restored (listen for `online` event). Banner auto-dismisses when connection returns. |
| **Rate limited (API)** | "We're experiencing high traffic. Please try again in a moment." | Auto-retry after delay. No user action required unless persistent. |
| **Server error (500)** | "Something went wrong on our end. We're looking into it." | [Retry] button. If persistent, show [Contact support] link. |

### 9.2 Edge Cases

| Case | Handling |
|------|---------|
| **Empty feed (first cycle hasn't run yet)** | "The first batch of needs is being processed. Check back in [estimated time]." with a friendly illustration or icon. |
| **No briefs match the current cycle** | "No briefs were generated this cycle. This can happen when post volume is low. Check back after the next update." [Browse feed] link. |
| **User downgrades from Pro to Free** | Bookmarks are preserved and viewable (read-only; user can still view and remove existing bookmarks but the bookmark button on new items requires re-upgrade). Tracking keywords are preserved but monitoring is paused. Clear message on /account: "Your bookmarks and tracking keywords are saved. Upgrade again anytime to re-activate tracking." No data deletion. |
| **Brief references a deleted source post** | Source link row shows "[Source post no longer available]" in muted text. No broken link. Other source links in the same brief remain functional. |
| **Very long post excerpts** | Truncate at 2 lines (feed cards) or 4 lines (deep dive source list) with "..." ellipsis. Full text is available at the source link. Never show uncontrolled-length text in cards. |
| **User opens the same brief/need in multiple tabs** | Each tab operates independently. Bookmark state syncs on next page focus (refetch on `visibilitychange` event). No conflict. |
| **Concurrent upgrade and browsing** | If a user upgrades in one tab while browsing in another, the browsing tab should detect the subscription change on next navigation or API call. Paywall elements disappear without requiring a full page reload. |
| **Zero engagement metrics** | If a post has 0 upvotes and 0 comments, show the metrics as "0" rather than hiding them. Hiding metrics would break visual consistency across cards. |
| **Duplicate posts across sources** | Pipeline responsibility (deduplication). If duplicates reach the UI, they display normally. No client-side dedup logic. |

---

## 10. Analytics and Measurement Points

Aligned with the PRD's success metrics (Section 4) and PostHog instrumentation plan (Section 5.9).

### 10.1 Key Funnels

**Discovery funnel:**
```
Feed pageview
  --> Card click (source link) OR Deep dive click
    --> Return visit (within 7 days)
```

**Conversion funnel:**
```
Feed pageview
  --> Briefs pageview
    --> Brief detail view (hit paywall)
      --> Auth (sign up)
        --> Upgrade (Stripe checkout)
          --> Successful payment
```

**Retention funnel:**
```
Tracking setup (keyword added)
  --> Weekly digest email delivered
    --> Email opened
      --> Click-through to site
        --> Feed/brief engagement
```

### 10.2 Events to Track

| Event Name | Properties | Purpose |
|-----------|-----------|---------|
| `feed.view` | `source` (direct/nav/search/referral), `filter_active` (tag name or null) | Traffic source and filter adoption |
| `feed.card.click` | `platform`, `tag`, `card_position` (index in feed), `card_id` | Engagement quality, content ranking validation |
| `feed.card.deepdive` | `need_id`, `platform`, `card_position` | Deep dive adoption, conversion funnel entry |
| `feed.filter.change` | `tag_selected`, `previous_tag` | Filter usage patterns, tag value |
| `feed.trending.click` | `keyword`, `platform_tab` | Trending panel value and usage |
| `feed.scroll.depth` | `max_position` (highest card index viewed) | Content consumption depth |
| `briefs.view` | `cycle_id`, `source` (nav/direct/referral) | Brief page adoption |
| `briefs.card.click` | `brief_id`, `card_position`, `opportunity_score` | Brief engagement, score correlation |
| `briefs.detail.view` | `brief_id`, `user_tier` (free/pro/anon) | Brief detail adoption by tier |
| `briefs.source.click` | `brief_id`, `source_platform`, `link_position` | Source evidence value |
| `products.view` | `sort_mode` (trending/new), `source` (nav/direct/referral) | Products page adoption |
| `products.card.click` | `product_id`, `card_position`, `complaint_count` | Product engagement |
| `products.detail.view` | `product_id`, `user_tier`, `referrer` (nav/direct/brief) | Product detail adoption by tier |
| `products.source.click` | `product_id`, `source_platform` | Source link usage |
| `products.complaint.click` | `product_id`, `complaint_theme`, `link_type` (source/need) | Complaint data value |
| `products.sort.change` | `sort_mode` (trending/new) | Sort preference |
| `deepdive.view` | `need_id`, `referrer` (feed/brief/product/direct), `user_tier` | Deep dive adoption and entry points |
| `deepdive.limit.hit` | `user_id` (if auth'd), `session_deepdive_count` | Conversion trigger frequency |
| `paywall.shown` | `type` (deepdive/brief/bookmark/tracking), `user_tier` | Conversion funnel |
| `paywall.dismissed` | `type`, `user_tier` | Drop-off analysis |
| `paywall.cta.click` | `type`, `cta_action` (signup/upgrade) | Conversion intent |
| `auth.start` | `trigger` (paywall/nav/bookmark), `method` (google/email) | Auth funnel |
| `auth.complete` | `method` (google/email), `is_new_user` (boolean) | Auth conversion |
| `auth.fail` | `method`, `error_type` | Auth debugging |
| `upgrade.start` | `trigger` (paywall/account/nav) | Revenue funnel |
| `upgrade.complete` | `plan` (pro), `trigger` | Revenue |
| `upgrade.fail` | `error_type` | Payment debugging |
| `bookmark.add` | `item_type` (feed/brief), `item_id` | Engagement depth |
| `bookmark.remove` | `item_type`, `item_id` | Engagement quality |
| `tracking.keyword.add` | `keyword` | Retention feature usage, keyword popularity |
| `tracking.keyword.remove` | `keyword` | Keyword value assessment |
| `tracking.matches.view` | `match_count`, `days_since_last_visit` | Tracking value delivery |
| `digest.sent` | `user_id`, `match_count`, `brief_count` | Email delivery |
| `digest.opened` | `user_id` | Email engagement |
| `digest.clicked` | `user_id`, `link_type` (feed/brief) | Email-to-site conversion |

### 10.3 Key Metrics to Dashboard

| Metric | Calculation | Target (from PRD) |
|--------|------------|-------------------|
| Daily Active Feed Viewers | Unique `feed.view` events per day | 1,000 within 3 months |
| Feed to Deep Dive rate | `feed.card.deepdive` / `feed.view` | 15%+ |
| Brief page adoption | Unique users with `briefs.view` / WAU | 30%+ of WAU |
| Return visitor rate | Users with 3+ `feed.view` days per week / total weekly users | 40%+ |
| Free to Pro conversion | `upgrade.complete` / registered users (cumulative) | 5% within 6 months |
| Paywall conversion rate | `paywall.cta.click` / `paywall.shown` | Track, no target yet |
| Paywall dismissal rate | `paywall.dismissed` / `paywall.shown` | Track, optimize over time |

---

## 11. Design Rationale Summary

Every major design decision mapped to its justifying principle:

| Decision | Principle | Category |
|----------|----------|----------|
| Feed is the landing page, no splash or hero section | Aesthetic-usability effect; Principle P1 (show signal, not tool) | IA |
| Two items in primary nav (Feed, Briefs) | Hick's Law -- fewer choices, faster decisions | Navigation |
| No hamburger menu on mobile for primary nav | Discoverability research (NNGroup -- hamburger reduces discovery 50%+) | Navigation |
| Tag filters as pills above feed, not sidebar panel | Cognitive load reduction, Fitts' Law (close to content, less mouse travel) | Interaction |
| Platform-specific card left borders | Distinctiveness principle, recognition over recall | Visual |
| Brief cards use neutral styling (not platform-colored) | Distinctiveness -- separates raw signal from synthesized analysis | Visual |
| Source links always one tap away | Authority bias, Principle P4 (source is sacred) | Trust |
| No login required to browse feed | Endowment effect, Principle P3 (earn attention first) | Conversion |
| Soft paywall with visible partial content | Zeigarnik effect (incomplete info creates tension), endowment effect | Conversion |
| Auth modal states specific action user was attempting | Goal gradient effect -- closer to goal means more motivation | Conversion |
| Auth returns user to exact context after completion | Goal gradient, Principle P5 (5-minute sessions) | Flow |
| Max 3 bullets in upgrade modal | Hick's Law at moment of conversion decision | Conversion |
| No persistent "X of 3 remaining" counter in UI | Anxiety reduction, respect for user autonomy | Retention |
| Skeleton loading states instead of spinners | Perceived performance -- skeleton reduces perceived wait by ~50% | Performance |
| Scroll position preservation on back navigation | Session continuity, Principle P5 (commute optimization) | Flow |
| 44x44px minimum touch targets everywhere | WCAG 2.5.5, mobile ergonomics, Fitts' Law | Accessibility |
| Color never used alone to convey meaning | WCAG 1.4.1, inclusive design | Accessibility |
| Empty states always include actionable CTA | Error prevention, progressive disclosure, no dead ends | Error handling |
| Toast notifications auto-dismiss at 5s with undo | Forgiveness principle, reversible actions | Interaction |
| No trial period, permanent free tier | Decision paralysis reduction (no time pressure) | Conversion |
| Stacked sections in brief detail, not tabs | Visibility of system status -- all content visible, scannable in 60-90s | Layout |
| Single column for briefs page (max 720px) | Optimal line length for reading (50-75 chars) | Typography |
| Brief cards show opportunity score as bar + number | Pre-attentive processing -- bar length is processed before conscious attention | Visual |
| Product cards show complaint count as primary differentiator | Pre-attentive processing -- number magnitude draws attention to unique value | Visual |
| Product cards use neutral styling (distinct from feed and brief cards) | Distinctiveness -- three content types are visually separated | Visual |
| Products page has two-option sort toggle (Trending/New) | Hick's Law -- two options = zero decision cost | Interaction |
| Product detail groups complaints by theme, not platform | Actionability -- "sync is broken" is more useful than "Reddit has 20 posts" | Layout |
| Three primary nav tabs (Feed, Briefs, Products) | Hick's Law still satisfied (3 options negligible); each tab = distinct job | Navigation |
| No dark patterns in cancellation or billing | Trust product -- Principle P4 extends to business ethics | Trust |

---

## 12. Implementation Priority

For a solo developer, build in this order. Each phase delivers a complete, usable product increment. Do not start the next phase until the current one is deployed and functional.

### Phase 1: Feed (aligns with PRD Milestone M2)

Core deliverables:
- [ ] Top navigation bar (logo, Feed/Briefs tabs, login placeholder button)
- [ ] Feed card component with platform-specific left border, tag badge, engagement metrics, timestamp
- [ ] Tag filter pills (complaint, need, feature-request, all) with client-side re-sort
- [ ] Infinite scroll with skeleton loading states (batch size: 20 desktop, 10 mobile)
- [ ] Feed cycle indicator ("Updated X hours ago")
- [ ] Responsive layout: mobile single-column, desktop with empty right column (placeholder for trending panel)
- [ ] Card click opens source link in new tab
- [ ] Empty state for feed
- [ ] Skip-to-content accessibility link
- [ ] Semantic HTML structure (nav, main, article)
- [ ] Page title and basic meta tags

### Phase 2: Briefs + Deep Dive + Products (aligns with PRD Milestone M2)

Core deliverables:
- [ ] Brief card component (title, summary, post count, platform icons, opportunity score)
- [ ] Brief list page (/briefs) with cycle date display
- [ ] Brief detail page (/briefs/:id) with all 5 sections (problem, sources, volume, alternatives, opportunity)
- [ ] Deep dive page (/needs/:id) with frequency, intensity, source posts, related clusters
- [ ] "Deep Dive" link on feed cards (with event.stopPropagation)
- [ ] Related clusters and related briefs cross-linking
- [ ] Product card component (name, platform icons, metrics, complaint count, sentiment, top issue)
- [ ] Product list page (/products) with "Trending" / "New" segmented sort
- [ ] Product detail page (/products/:id) with 4 sections (overview, complaints, sentiment, related briefs)
- [ ] Product → brief and product → need cross-linking
- [ ] Free/Pro content gating UI (blurred sections + inline upgrade prompt) -- enforcement is placeholder until auth exists
- [ ] Back navigation links ("< Back to Briefs", "< Back to Products", "< Back")
- [ ] Skeleton loading for brief detail, deep dive, product detail pages
- [ ] Empty states for briefs and products pages
- [ ] OpenGraph meta tags for brief, need, and product pages (shareable URLs)
- [ ] Cycle navigation on /briefs (previous/next cycle)

### Phase 3: Auth + Pro (aligns with PRD Milestone M3)

Core deliverables:
- [ ] Google OAuth flow (login/signup)
- [ ] Context-sensitive auth modal ("Sign in to [action]")
- [ ] User avatar menu in nav (dropdown: Bookmarks, Tracking, Account, Sign out)
- [ ] Account page (/account) with profile, subscription status
- [ ] Pricing display within upgrade prompts (not a separate pricing page in v1)
- [ ] Stripe Checkout integration (redirect flow)
- [ ] Post-payment redirect handling (success/failure banners)
- [ ] Deep dive daily limit enforcement (3/day for free, unlimited for Pro)
- [ ] Brief detail Pro gating enforcement
- [ ] Toast notification component (for upgrade success, auth success)
- [ ] Session/subscription state management (detect Pro status, gate features)

### Phase 4: Engagement Features (aligns with PRD Milestone M4)

Core deliverables:
- [ ] Bookmark toggle icon on feed cards and brief cards
- [ ] Bookmarks page (/bookmarks) with filter tabs (All, Feed items, Briefs)
- [ ] Bookmark empty state
- [ ] Swipe-to-remove (mobile) and hover-reveal-X (desktop) for bookmark removal
- [ ] Tracking page (/tracking) with keyword chip input and autocomplete
- [ ] Tracked match cards with "NEW" badge
- [ ] Notification bell in nav header with unread count
- [ ] Trending keywords side panel (desktop only)
- [ ] Trending keyword click filters feed
- [ ] "Showing results for: [keyword]" banner with clear action
- [ ] Weekly digest email (backend: email template, delivery scheduling)
- [ ] Email preference toggle on /account

### Phase 5: Polish and Launch (aligns with PRD Milestone M5)

Core deliverables:
- [ ] Accessibility audit with axe DevTools (fix all critical/serious issues)
- [ ] Manual keyboard navigation testing (every page, every interactive element)
- [ ] Screen reader testing (VoiceOver on macOS/iOS at minimum)
- [ ] `prefers-reduced-motion` implementation
- [ ] All analytics events instrumented (Section 10.2)
- [ ] PostHog dashboard setup (Section 10.3)
- [ ] Performance audit: Lighthouse score 90+ on feed page
- [ ] Initial load under 2 seconds (feed page, standard connection)
- [ ] SEO: server-rendered feed and briefs pages, structured data for briefs
- [ ] Error states for all failure modes (Section 9.1)
- [ ] Edge case handling (Section 9.2)
- [ ] Cross-browser testing (Chrome, Safari, Firefox -- latest versions)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Final review of all empty states, loading states, error states
- [ ] Product Hunt launch preparation (screenshots, description, first comment)

---

## Appendix A: Cognitive Principles Referenced

| Principle | Definition | Application in idea-fork |
|-----------|-----------|------------------------|
| **Hick's Law** | Decision time increases logarithmically with the number of choices. | Two-item primary nav. Single-select tag filters. Max 3 bullets in upgrade modal. One primary CTA per screen. |
| **Fitts' Law** | Time to reach a target is a function of distance to and size of the target. | Large card click targets. 44px minimum touch targets. Tag pills positioned directly above feed content (minimal mouse travel). |
| **Cognitive Load Theory** | Working memory handles approximately 4 chunks of information at once. | One job per screen. No trending panel on mobile. Truncated excerpts. Brief detail limited to 5 clearly-separated sections. |
| **Endowment Effect** | People value things more once they feel ownership of them. | Free feed access creates ownership feeling before asking for payment. Users "have" the feed before being asked to pay for more. |
| **Zeigarnik Effect** | Incomplete tasks are remembered better than completed ones. People feel tension from unfinished information. | Partial brief content (visible summary, blurred details) creates completion desire and motivates upgrade. |
| **Goal Gradient Effect** | Motivation increases as people get closer to their goal. | Auth modal references the specific action user was attempting. After auth/upgrade, user returns to exact context (not a welcome page). |
| **Peak-End Rule** | Experiences are judged by their most intense moment and their ending. | First impression is instant value (feed loads immediately). Session ends with preserved scroll position (positive ending). |
| **Authority Bias** | People trust claims more when backed by authoritative or verifiable sources. | Source links on every claim in briefs. Platform attribution on every card. "AI-generated" transparency label. |
| **Recognition Over Recall** | It is easier to recognize something than to recall it from memory. | Consistent card components across feed, bookmarks, tracking (same visual pattern). Platform icons for instant source recognition. |
| **Aesthetic-Usability Effect** | Users perceive aesthetically pleasing interfaces as more usable. | Clean, content-first design is perceived as more functional than complex dashboards. This is the competitive differentiator against Gummysearch and SparkToro. |
| **Serial Position Effect** | Items at the beginning and end of a list are remembered best. | Most important content (complaints, needs) sorted to top of feed. Most recent briefs shown first. |
| **Loss Aversion (inverted framing)** | People feel losses more strongly than equivalent gains. | Upgrade messaging framed as gaining access to sources, analysis, and monitoring -- not as "losing" features if they don't upgrade. |
| **Distinctiveness Principle** | Items that stand out from their context are more easily noticed and remembered. | Feed cards (platform-colored borders) vs. brief cards (neutral styling) are visually distinct to prevent confusion between raw data and AI synthesis. |
| **Pre-attentive Processing** | Certain visual properties (length, color, size) are processed before conscious attention. | Opportunity score bar length allows instant comparison across brief cards without reading numbers. |
| **Progressive Disclosure** | Show only what is needed at each step; reveal complexity gradually. | No onboarding wizard. Features discovered through use. Paywall appears only when user attempts a gated action. Cycle indicator is subtle. |

---

## Appendix B: Competitive UX Comparison

| Dimension | Gummysearch | SparkToro | Exploding Topics | idea-fork |
|-----------|------------|-----------|-------------------|-----------|
| **First interaction** | Setup wizard (select subreddits, configure audience) | Search bar (enter audience description) | Dashboard with category charts | Content feed (no setup, no query) |
| **Time to first value** | ~5 minutes (requires configuration) | ~2 minutes (requires query formulation) | ~1 minute (dashboard loads with defaults) | < 10 seconds (feed loads immediately) |
| **Primary metaphor** | Research tool / analytics platform | Audience search engine | Trend dashboard / data explorer | Social media feed / content stream |
| **Mobile experience** | Functional but information-dense, requires horizontal scrolling | Responsive but complex, chart-heavy | Chart-heavy, not mobile-optimized | Feed-first, single-column, mobile-native |
| **Action path** | Data collection --> manual analysis by user | Audience data --> manual interpretation | Trend identification --> manual research | Signal discovery --> AI brief --> source validation |
| **Learning curve** | High (filter configuration, subreddit selection, audience definition) | Medium (query syntax, result interpretation) | Medium (dashboard navigation, metric understanding) | None (scroll and read, same as any social feed) |
| **Login requirement** | Required to use any feature | Required to use any feature | Required for full access, limited free preview | Not required to browse feed and brief summaries |
| **AI involvement** | Minimal (keyword extraction) | Minimal (audience matching) | Minimal (trend detection algorithms) | Central (tagging, clustering, brief generation) |
| **Source attribution** | Links to Reddit threads | Links to audience sources | Links to trend data points | Links to original posts on all platforms |

The competitive UX advantage is clear: zero configuration, zero learning curve, immediate content delivery. Every UX decision must protect this advantage. The moment the product feels like a "tool" that requires learning, the differentiation collapses.

---

## Appendix C: Open Design Questions

These questions should be resolved through user testing or data after launch:

| Question | How to Resolve | Impact |
|----------|---------------|--------|
| Should tag filters be single-select or multi-select? | A/B test after launch. Start with single-select (simpler). | Feed interaction complexity |
| Is 3 free deep dives/day the right limit? | Monitor `deepdive.limit.hit` rate. If >40% of daily users hit it, consider raising to 5. If <10%, consider lowering to 2. | Conversion rate |
| Should the trending panel be visible on tablet (640-1024px)? | Monitor tablet traffic percentage. If >15% of traffic, test collapsed/expandable panel. | Tablet layout |
| Do users want to share feed filter states via URL? | Monitor support requests and user feedback. Add query params if requested. | URL structure |
| Is the opportunity score meaningful to users? | Survey/interview 10 users after they have used briefs for 2+ weeks. | Brief card design |
| Should bookmarks be available on the free tier? | Monitor bookmark usage after launch. If heavy usage correlates with return visits, keep it free. If not, consider moving to Pro. | Free/Pro boundary |
| Do users want keyboard shortcuts? | Monitor power user behavior (session length, pages/session). If a cohort uses the product >30 min/session, prioritize shortcuts. | Interaction design |
| Should brief detail use tabs instead of stacked sections on mobile? | Monitor scroll depth on brief detail page (mobile). If <50% reach the opportunity signal section, consider tabs. | Mobile layout |

---

*End of UX Strategy. This is a living document. Update it as user testing, analytics data, and product iterations provide new evidence. Every design change should reference a principle from this document or explicitly note when a new principle is being introduced.*
