# UX Review: Feed Page - Post Type Tabs + Tag Tabs

> Date: 2026-02-23
> Mode: UX Diagnosis (Mode B)
> Status: Analysis + Improvement Options

---

## 1. Current Structure Analysis

### 1.1 What the user sees (top to bottom)

```
+------------------------------------------------------------------+
|  [All] [Need] [Complaint] [Feature Request] [Alternative]        |
|  [Comparison] [Question] [Review]                   <- Row 1     |
+------------------------------------------------------------------+
|  [All] [SaaS] [Developer Tools] [AI] [Fintech] [+3] <- Row 2    |
+------------------------------------------------------------------+
|  PostCard                                                         |
|  PostCard                                                         |
|  PostCard                                                         |
|  ...                                                              |
|  [Load More]                                                      |
+------------------------------------------------------------------+
```

- **Row 1**: Post Type Tabs (8 options) -- `POST_TYPE_TABS` in `feed-page.tsx`
- **Row 2**: Tag Filter Chips -- `FilterChipBar` component, tags from API

### 1.2 How they interact

- Post Type Tabs: URL param `?post_type=need` etc. Single select, "All" = no filter.
- Tag Filter Chips: URL param `?tag=SaaS` etc. Single select, "All" = no filter.
- Both filters are AND-combined on the API call.
- PostCard also shows tags as clickable buttons (3rd filter entry point).

### 1.3 PostCard badge duplication

Each card shows up to 3 badges in the top-right:
- `postType` badge (e.g., "Complaint", "Feature Request")
- `sentiment` badge (e.g., "Frustrated", "Question")
- `category` badge (first tag name)

---

## 2. Identified UX Problems

### Problem 1: Two similar-looking filter rows cause confusion (Hick's Law + Cognitive Load)

**Symptom**: The user sees two rows of chips that look visually identical.

**Root cause**: Post Type Tabs (Row 1) and Tag Chips (Row 2) use the same `<Chip>` component, same sizing, same styling. They are visually indistinguishable despite being fundamentally different filters.

**Cognitive cost**: The user must hold two separate mental models:
- "Which ROW am I in?"
- "What does each row filter?"

There is no label, heading, or visual differentiation between the two rows. This violates Hick's Law (too many undifferentiated choices) and increases cognitive load (user must parse 8 + 7+ chips = 15+ options simultaneously).

### Problem 2: Conceptual overlap between Post Type, Sentiment, and Tags

**Symptom**: The user cannot tell the difference between "post type" and "tag."

**Examples of confusion**:
- Post Type "Question" vs. Sentiment "Question" -- what is the difference?
- Post Type "Complaint" vs. Sentiment "Frustrated" -- nearly synonymous
- Tags like "SaaS" are a different dimension (domain/category), but they look the same as Post Types

**Root cause**: Three classification axes (post_type, sentiment, tag) are exposed raw from the backend data model without user-facing abstraction.

### Problem 3: Too many Post Type options (Hick's Law)

**8 tabs** in Row 1: All, Need, Complaint, Feature Request, Alternative, Comparison, Question, Review.

- This exceeds Miller's Law (7+/-2 items). While 8 is at the boundary, the REAL problem is that many of these are infrequently relevant.
- On mobile, these overflow horizontally with hidden scrollbar, meaning users may never discover options off-screen.
- No usage data to guide which are most valuable; no progressive disclosure.

### Problem 4: PostCard badge overload (Cognitive Load)

Each card can show up to **3 badges** (postType + sentiment + category), plus inline tag chips below the snippet, plus source info.

- postType badge often says the same thing as the filter the user already selected
- sentiment badge semantically overlaps with postType
- category badge duplicates the first tag shown in the tag list below

This violates "show only information needed for current decision."

### Problem 5: Two "All" chips (Cognitive Load)

Both Row 1 and Row 2 start with "All." The user sees two "All" chips with different behaviors (one resets post_type, one resets tag). This is disorienting.

### Problem 6: Hidden scrollbar hides options (Fitts's Law)

Both rows use `[scrollbar-width:none]` -- the user gets no affordance that more options exist off-screen. On mobile with 8 Post Type tabs, at least 3-4 will be invisible with no visual cue.

### Problem 7: Tag clicks on cards create unexpected navigation

Clicking a tag inside a PostCard triggers a filter change at the page level. This is not predictable because:
- Tags inside cards look like metadata labels, not interactive filters
- The entire feed reloads when clicked, which may not match user intent (they might want to "see more like this" without losing context)

---

## 3. Summary: Root Causes

| Problem | Principle Violated | Severity |
|---------|--------------------|----------|
| Two visually identical filter rows | Cognitive Load, Hick's Law | High |
| Post Type vs Sentiment vs Tag overlap | Cognitive Load | High |
| 8 Post Type options visible at once | Hick's Law, Miller's Law | Medium |
| PostCard badge overload | Cognitive Load | Medium |
| Two "All" chips | Cognitive Load | Medium |
| Hidden scrollbar | Fitts's Law | Medium |
| Tag clicks cause unexpected navigation | Peak-End Rule (surprise) | Low |

---

## 4. Improvement Options

### Option A: Merge into a single filter row with grouped dropdown

**Concept**: Replace the two separate rows with ONE primary filter row. Post types become a dropdown or a secondary filter within a unified bar.

```
+------------------------------------------------------------------+
|  [All] [SaaS] [Dev Tools] [AI] [Fintech] [+3]   [Type: All  v]  |
+------------------------------------------------------------------+
|  PostCard                                                         |
```

**How it works**:
- Tags remain as the primary horizontal chip bar (they represent "what domain/market" -- the user's most likely mental model)
- Post Type becomes a compact dropdown on the right ("Type: All" that opens to show Need, Complaint, Feature Request, etc.)
- Sentiment badges removed from cards (postType covers the intent)
- Only ONE "All" exists

**Principles applied**:
- Hick's Law: Reduces visible choices from 15+ to ~7 chips + 1 dropdown
- Cognitive Load: Single visual row to parse
- Von Restorff: Dropdown visually distinct from chips, clear it is a different filter dimension

**Trade-off**: Post Type is less discoverable; users who primarily filter by type need one extra click.

---

### Option B: Tab bar + filter chips (clear visual hierarchy)

**Concept**: Keep both dimensions, but make them visually distinct and reduce Post Type options.

```
+------------------------------------------------------------------+
|  [All]  [Problems]  [Requests]  [Questions]     <- 4 TABS        |
|  ─────────────────────────────────────────────   (underline nav)  |
+------------------------------------------------------------------+
|  [All] [SaaS] [Dev Tools] [AI] [Fintech] [+3]  <- Chip filters  |
+------------------------------------------------------------------+
|  PostCard                                                         |
```

**How it works**:
- Consolidate 7 Post Types into 3-4 super-categories:
  - "Problems" = need + complaint + alternative_seeking
  - "Requests" = feature_request
  - "Questions" = question + comparison
  - (Remove "Review" or fold into "Problems")
- Render as a tab bar with underline indicator (visually distinct from chips)
- Tags remain as chip filters below

**Principles applied**:
- Hick's Law: 4 tabs instead of 8
- Cognitive Load: Two filter dimensions are visually differentiated (tabs vs chips)
- Miller's Law: 4 tabs + 6 chips = 10 visible items, well within limits when visually grouped

**Trade-off**: Loses granularity in Post Type filtering. Power users cannot filter to exactly "alternative_seeking."

---

### Option C: Single filter bar with faceted "smart chips"

**Concept**: Flatten everything into one filter row with mixed chip types.

```
+------------------------------------------------------------------+
|  [x Frustrated] [SaaS] [Dev Tools] [+ Add filter]               |
+------------------------------------------------------------------+
```

**How it works**:
- No pre-rendered chip rows at all
- "Add filter" button opens a panel with all available dimensions (Type, Category, Sentiment)
- Selected filters appear as removable chips in a single row
- Default state shows no chips (= all posts)

**Principles applied**:
- Cognitive Load: Minimal -- nothing shown until needed
- Hick's Law: Progressive disclosure -- choices only when requested

**Trade-off**: Lower discoverability. New users may not explore filtering at all. The product's value proposition (browsing problems by category) becomes hidden.

---

### Option D: Primary tag navigation + inline type indicators (Recommended)

**Concept**: Tags are the primary navigation. Post type is shown only as a visual indicator on cards, not as a separate filter.

```
+------------------------------------------------------------------+
|  [All] [SaaS] [Dev Tools] [AI] [Fintech] [Health] [+3]          |
+------------------------------------------------------------------+
|  Sort: [Recent v]                                                 |
+------------------------------------------------------------------+
|  PostCard (with post_type badge only, no sentiment badge)         |
|  PostCard                                                         |
```

**How it works**:
- Remove the Post Type tab row entirely
- Tags are the only filter chips (one mental model)
- Post type stays as a single badge on each card (informational, not a filter)
- Remove sentiment badge from cards (overlaps with post_type)
- Remove category badge from cards (redundant with tag chips)
- Add a sort dropdown (recent / most upvotes / most comments) since this is currently hard-coded to "recent"

**Principles applied**:
- Cognitive Load: ONE filter dimension, ONE row, ONE "All" chip
- Hick's Law: ~7 visible choices max
- Von Restorff: Post type badge on card serves as visual differentiation without competing for filter attention
- Remove step (Design Process Step 4): Post Type filter removed because Tags are more actionable for the target user (indie hackers looking for opportunities in a domain)

**Trade-off**: Users who want to see "only complaints" cannot do so directly. However, this can be added back as a sort/filter dropdown if analytics show demand.

---

## 5. PostCard Simplification (applies to all options)

Regardless of which option is chosen, the PostCard should be simplified:

### Current badge state (up to 3 badges):
```
[Feature Request] [Request] [SaaS]
```

### Recommended badge state (1 badge):
```
[Feature Request]
```

**Changes**:
1. Remove `sentiment` badge -- it overlaps with `postType` conceptually
2. Remove `category` badge -- it duplicates the first tag shown in the tag list below
3. Keep `postType` badge only -- it is the most informative single label
4. Keep inline tags below the snippet (these are interactive filter triggers)

**Rationale (Cognitive Load)**: Each badge competes for attention. One clear badge communicates type; the tag list below provides category context.

---

## 6. Recommendation

**Option D (Primary tag navigation + inline type indicators)** is recommended for the following reasons:

1. **User's ONE goal**: "Find interesting product opportunities in my domain." Tags (SaaS, AI, Dev Tools) directly map to this goal. Post types are secondary metadata.
2. **Minimum needed**: One filter dimension (tag) + one sort option + well-labeled cards.
3. **What can be removed**: Post Type as a filter row (keep as card badge), Sentiment badge (redundant), Category badge (redundant).

If user research later reveals that filtering by post type is a common need, it can be reintroduced as a secondary dropdown (per Option A) without disrupting the primary flow.

---

## 7. Accessibility Notes

Regardless of chosen option:

- Tab/chip rows MUST have `role="tablist"` or `role="group"` with `aria-label` explaining the filter purpose
- Active filter must be communicated via `aria-selected` (tabs) or `aria-pressed` (toggle chips)
- Hidden horizontal scroll must show a gradient fade or arrow affordance so off-screen options are discoverable
- Focus states must use 2px+ visible outline per WCAG 2.1 AA
- Color must not be the sole indicator for active state (current implementation correctly uses background color change + text weight, which is acceptable)
- The "+N" overflow dropdown should trap focus when open and return focus to trigger on close (currently implemented correctly)

---

## 8. Open Questions

1. Do we have analytics on Post Type filter usage? If >30% of sessions use it, Option B (consolidated tabs + chips) may be better than Option D.
2. Are tags curated or auto-generated? If auto-generated with high cardinality, the FilterChipBar overflow "+N" approach may need rethinking (search instead of dropdown).
3. Is there a plan to add a search/query feature? The API already supports `q` parameter but the UI has no search input.
