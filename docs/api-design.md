# idea-fork — API Design

**Status**: Draft
**Author**: zzoo
**Date**: 2026-02-21
**SADD Reference**: [docs/design-doc.md](/docs/design-doc.md)
**Database Design Reference**: [database/database-design.md](/database/database-design.md)

---

## 1. Overview

REST API serving the idea-fork web frontend (Next.js SSR). Read-heavy (100:1 read/write ratio), anonymous access, single write action in MVP (brief ratings).

| Concern | Decision |
|---|---|
| Framework | FastAPI + SQLAlchemy 2.0 async (asyncpg) |
| Versioning | URL prefix (`/v1/`) |
| Response format | `{ data, meta }` envelope |
| Error format | RFC 9457 Problem Details |
| Pagination | Cursor-based (keyset) |
| Authentication | None (MVP). Anonymous session cookie for ratings only. |
| Rate limiting | slowapi on rating endpoint (10/min per session) |
| CORS | Web app origin only |

**Base URL**: `https://api.idea-fork.com/v1`

---

## 2. Conventions

### 2.1 Response Envelope

All successful responses use a consistent envelope:

```json
{
  "data": {},
  "meta": {}
}
```

- `data`: single resource object or array of resources.
- `meta`: pagination cursors, total counts, request metadata. Omitted when empty.

### 2.2 Error Response (RFC 9457)

```json
{
  "type": "https://api.idea-fork.com/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Brief with slug 'nonexistent' does not exist."
}
```

Validation errors include a `errors` array:

```json
{
  "type": "https://api.idea-fork.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Request body contains invalid fields.",
  "errors": [
    { "field": "is_positive", "code": "required", "message": "Rating value is required." }
  ]
}
```

Content-Type: `application/problem+json` for all error responses.

### 2.3 Pagination

Cursor-based (keyset) pagination on all collection endpoints.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | — | Opaque cursor from previous response |
| `limit` | integer | 20 | Items per page (max 100) |

Response meta:

```json
{
  "meta": {
    "next_cursor": "eyJpZCI6MTIzfQ",
    "has_next": true
  }
}
```

Cursor encodes the keyset values (base64-encoded JSON). Clients pass `cursor` to get the next page. No `prev_cursor` in MVP — forward-only pagination.

### 2.4 Filtering & Sorting

- Filters: query string parameters (`?tag=saas&sentiment=negative`).
- Sort: `?sort=field` (ascending) or `?sort=-field` (descending). Only whitelisted fields.
- Multi-value filters: comma-separated (`?tag=saas,mobile`).

### 2.5 Field Naming

- Snake_case for all JSON fields (matches Python/DB conventions).
- Timestamps in ISO 8601 with timezone (`2026-02-21T10:30:00Z`).
- IDs as integers (not UUIDs). Slugs for URL-addressable resources.

### 2.6 Common Headers

**Request:**

| Header | Value | When |
|---|---|---|
| `Accept` | `application/json` | Always |
| `Content-Type` | `application/json` | POST/PATCH/PUT |
| `Cookie` | `session_id=<value>` | Rating submission |

**Response:**

| Header | Value | When |
|---|---|---|
| `Content-Type` | `application/json` | Always |
| `Cache-Control` | `public, max-age=60` | GET collection endpoints |
| `Cache-Control` | `public, max-age=300` | GET detail endpoints |
| `Cache-Control` | `private, no-store` | POST/PATCH responses |
| `X-RateLimit-Limit` | `10` | Rating endpoint |
| `X-RateLimit-Remaining` | `<n>` | Rating endpoint |
| `Retry-After` | `<seconds>` | 429 responses |

---

## 3. Resources & Endpoints

### 3.1 Posts (Feed)

The feed is the landing page. Highest traffic endpoint.

#### `GET /v1/posts`

List posts with filtering, sorting, keyword search, and keyset pagination.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | — | Keyset cursor |
| `limit` | integer | 20 | Items per page (1–100) |
| `sort` | string | `-external_created_at` | Sort field. Allowed: `-external_created_at`, `-score`, `-num_comments` |
| `tag` | string | — | Filter by tag slug(s), comma-separated |
| `source` | string | — | Filter by source platform (`reddit`, `app_store`, `play_store`) |
| `subreddit` | string | — | Filter by subreddit |
| `post_type` | string | — | Filter by type (`complaint`, `feature_request`, `question`) |
| `sentiment` | string | — | Filter by sentiment (`positive`, `negative`, `neutral`, `mixed`) |
| `q` | string | — | Keyword search (pg_trgm + tsvector) |

**Response: `200 OK`**

```json
{
  "data": [
    {
      "id": 456,
      "title": "Why is Notion so slow on mobile?",
      "body": "I've been using Notion on my phone and the lag is unbearable...",
      "source": "reddit",
      "subreddit": "Notion",
      "external_url": "https://reddit.com/r/Notion/comments/abc123",
      "external_created_at": "2026-02-18T14:22:00Z",
      "score": 245,
      "num_comments": 89,
      "post_type": "complaint",
      "sentiment": "negative",
      "tags": [
        { "slug": "saas", "name": "SaaS" },
        { "slug": "mobile-app", "name": "Mobile App" }
      ]
    }
  ],
  "meta": {
    "next_cursor": "eyJleHRlcm5hbF9jcmVhdGVkX2F0IjoiMjAyNi0wMi0xOFQxNDoyMjowMFoiLCJpZCI6NDU2fQ",
    "has_next": true
  }
}
```

**Keyset implementation:** Cursor encodes `{ external_created_at, id }` (or the active sort field + id). SQL uses `WHERE (sort_col, id) < (cursor_sort_val, cursor_id)`.

**Caching:** `Cache-Control: public, max-age=60`. Feed data is refreshed by pipeline (hourly/daily), so 60s staleness is acceptable.

#### `GET /v1/posts/{id}`

Single post detail.

**Response: `200 OK`**

```json
{
  "data": {
    "id": 456,
    "title": "Why is Notion so slow on mobile?",
    "body": "I've been using Notion on my phone and the lag is unbearable. Every page takes 3-4 seconds to load...",
    "source": "reddit",
    "subreddit": "Notion",
    "external_url": "https://reddit.com/r/Notion/comments/abc123",
    "external_created_at": "2026-02-18T14:22:00Z",
    "score": 245,
    "num_comments": 89,
    "post_type": "complaint",
    "sentiment": "negative",
    "tags": [
      { "slug": "saas", "name": "SaaS" },
      { "slug": "mobile-app", "name": "Mobile App" }
    ]
  }
}
```

**Error: `404 Not Found`** — post does not exist or is soft-deleted.

---

### 3.2 Tags

Tags power the feed filter UI. Low-cardinality, rarely changes.

#### `GET /v1/tags`

List all tags. No pagination (expected < 100 tags).

**Response: `200 OK`**

```json
{
  "data": [
    { "id": 1, "slug": "saas", "name": "SaaS" },
    { "id": 2, "slug": "mobile-app", "name": "Mobile App" },
    { "id": 3, "slug": "developer-tools", "name": "Developer Tools" }
  ]
}
```

**Caching:** `Cache-Control: public, max-age=3600`. Tags change infrequently.

---

### 3.3 Briefs

AI-generated product opportunity briefs. Core value proposition.

#### `GET /v1/briefs`

List published briefs with keyset pagination.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | — | Keyset cursor |
| `limit` | integer | 20 | Items per page (1–100) |
| `sort` | string | `-published_at` | Sort field. Allowed: `-published_at`, `-upvote_count`, `-source_count` |

**Response: `200 OK`**

```json
{
  "data": [
    {
      "id": 12,
      "slug": "mobile-note-taking-performance",
      "title": "Mobile Note-Taking Apps Are Too Slow",
      "summary": "Users across multiple subreddits report severe performance issues with note-taking apps on mobile devices...",
      "status": "published",
      "published_at": "2026-02-19T08:00:00Z",
      "source_count": 47,
      "upvote_count": 23,
      "downvote_count": 4,
      "demand_signals": {
        "post_count": 47,
        "subreddit_count": 5,
        "avg_score": 142.3,
        "newest_post_at": "2026-02-18T14:22:00Z",
        "oldest_post_at": "2026-01-01T08:00:00Z"
      },
      "tags": [
        { "slug": "saas", "name": "SaaS" },
        { "slug": "mobile-app", "name": "Mobile App" }
      ]
    }
  ],
  "meta": {
    "next_cursor": "eyJwdWJsaXNoZWRfYXQiOiIyMDI2LTAyLTE5VDA4OjAwOjAwWiIsImlkIjoxMn0",
    "has_next": true
  }
}
```

**Notes:**
- Only `status = 'published'` briefs are returned. No filter param needed.
- `tags` are derived from the brief's cluster's posts (aggregated at generation time).

#### `GET /v1/briefs/{slug}`

Brief detail page with full synthesis and source posts.

**Response: `200 OK`**

```json
{
  "data": {
    "id": 12,
    "slug": "mobile-note-taking-performance",
    "title": "Mobile Note-Taking Apps Are Too Slow",
    "summary": "Users across multiple subreddits report severe performance issues...",
    "problem_statement": "Mobile note-taking applications suffer from significant performance degradation...",
    "opportunity": "A lightweight, offline-first note-taking app optimized for mobile could capture frustrated users...",
    "status": "published",
    "published_at": "2026-02-19T08:00:00Z",
    "source_count": 47,
    "upvote_count": 23,
    "downvote_count": 4,
    "demand_signals": {
      "post_count": 47,
      "subreddit_count": 5,
      "avg_score": 142.3,
      "newest_post_at": "2026-02-18T14:22:00Z",
      "oldest_post_at": "2026-01-01T08:00:00Z"
    },
    "solution_directions": [
      "Offline-first architecture with local-first sync",
      "Lightweight editor without rich formatting overhead",
      "Native mobile app vs. wrapped web view"
    ],
    "source_snapshots": [
      {
        "post_id": 456,
        "title": "Why is Notion so slow on mobile?",
        "snippet": "I've been using Notion on my phone and the lag is unbearable...",
        "external_url": "https://reddit.com/r/Notion/comments/abc123",
        "subreddit": "Notion",
        "score": 245
      },
      {
        "post_id": 789,
        "title": "Evernote mobile is a disaster",
        "snippet": "Every update makes the app slower...",
        "external_url": "https://reddit.com/r/Evernote/comments/def456",
        "subreddit": "Evernote",
        "score": 178
      }
    ]
  }
}
```

**Notes:**
- `source_snapshots` is served from the denormalized JSONB column (no join needed).
- `solution_directions` is served from the JSONB column.
- Addressed by slug (not ID) for SEO-friendly URLs.

**Error: `404 Not Found`** — brief does not exist or is not published.

**Caching:** `Cache-Control: public, max-age=300`. Briefs are static after publication.

---

### 3.4 Products

Trending products paired with user complaints. P1 feature.

#### `GET /v1/products`

List products with sorting and keyset pagination.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | — | Keyset cursor |
| `limit` | integer | 20 | Items per page (1–100) |
| `sort` | string | `-trending_score` | Sort field. Allowed: `-trending_score`, `-complaint_count` |
| `category` | string | — | Filter by category |

**Response: `200 OK`**

```json
{
  "data": [
    {
      "id": 7,
      "slug": "notion",
      "name": "Notion",
      "tagline": "One workspace. Every team.",
      "description": "All-in-one workspace for notes, docs, and project management.",
      "url": "https://notion.so",
      "image_url": "https://cdn.idea-fork.com/products/notion.png",
      "category": "Productivity",
      "source": "producthunt",
      "launched_at": "2016-08-15T00:00:00Z",
      "complaint_count": 156,
      "trending_score": 8.7
    }
  ],
  "meta": {
    "next_cursor": "eyJ0cmVuZGluZ19zY29yZSI6OC43LCJpZCI6N30",
    "has_next": true
  }
}
```

#### `GET /v1/products/{slug}`

Product detail with linked complaint posts.

**Response: `200 OK`**

```json
{
  "data": {
    "id": 7,
    "slug": "notion",
    "name": "Notion",
    "tagline": "One workspace. Every team.",
    "description": "All-in-one workspace for notes, docs, and project management.",
    "url": "https://notion.so",
    "image_url": "https://cdn.idea-fork.com/products/notion.png",
    "category": "Productivity",
    "source": "producthunt",
    "launched_at": "2016-08-15T00:00:00Z",
    "complaint_count": 156,
    "trending_score": 8.7,
    "posts": [
      {
        "id": 456,
        "title": "Why is Notion so slow on mobile?",
        "body": "I've been using Notion on my phone and the lag is unbearable...",
        "source": "reddit",
        "subreddit": "Notion",
        "external_url": "https://reddit.com/r/Notion/comments/abc123",
        "external_created_at": "2026-02-18T14:22:00Z",
        "score": 245,
        "post_type": "complaint",
        "sentiment": "negative"
      }
    ]
  },
  "meta": {
    "posts_cursor": "eyJpZCI6NDU2fQ",
    "posts_has_next": true
  }
}
```

**Notes:**
- `posts` are the first page of linked complaint posts (default 10). Client fetches more via `GET /v1/posts?product={slug}&cursor=...` (see below).
- Addressed by slug for SEO.

**Error: `404 Not Found`** — product does not exist.

---

### 3.5 Ratings

Anonymous brief ratings. The only write endpoint in MVP.

#### `POST /v1/briefs/{id}/ratings`

Submit a rating for a brief. Requires a `session_id` cookie (set by the web app).

**Request:**

```json
{
  "is_positive": true,
  "feedback": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `is_positive` | boolean | Yes | `true` = useful, `false` = not useful |
| `feedback` | string | No | Optional text feedback (max 500 chars, only when `is_positive = false`) |

**Response: `201 Created`**

```json
{
  "data": {
    "id": 892,
    "brief_id": 12,
    "is_positive": true,
    "feedback": null,
    "created_at": "2026-02-21T10:30:00Z"
  }
}
```

**Error: `409 Conflict`** — session already rated this brief.

```json
{
  "type": "https://api.idea-fork.com/errors/duplicate-rating",
  "title": "Duplicate Rating",
  "status": 409,
  "detail": "This session has already rated this brief."
}
```

**Error: `404 Not Found`** — brief does not exist.

**Error: `429 Too Many Requests`** — rate limited (10 ratings/min per session).

**Session handling:** The `session_id` is read from an httpOnly cookie. If no cookie exists, the API returns `400 Bad Request`. The web app is responsible for setting the cookie on first visit.

**Rate limiting:** 10 requests/min per session_id via slowapi. Returns `Retry-After` header on 429.

#### `PATCH /v1/briefs/{id}/ratings`

Update an existing rating (change vote or add feedback). Identified by `session_id` cookie + `brief_id`.

**Request:**

```json
{
  "is_positive": false,
  "feedback": "The solution directions were too vague."
}
```

**Response: `200 OK`**

```json
{
  "data": {
    "id": 892,
    "brief_id": 12,
    "is_positive": false,
    "feedback": "The solution directions were too vague.",
    "created_at": "2026-02-21T10:30:00Z"
  }
}
```

**Error: `404 Not Found`** — no existing rating for this session + brief.

---

## 4. Cross-Resource Queries

Some frontend views need posts filtered by product context:

#### `GET /v1/posts?product={slug}`

Returns posts linked to a product via `product_post` join table. Same response shape and pagination as `GET /v1/posts`. The `product` filter composes with other filters (`tag`, `sentiment`, etc.).

---

## 5. Status Codes Summary

| Endpoint | Success | Client Errors |
|---|---|---|
| `GET /v1/posts` | 200 | 422 (bad params) |
| `GET /v1/posts/{id}` | 200 | 404 |
| `GET /v1/tags` | 200 | — |
| `GET /v1/briefs` | 200 | 422 (bad params) |
| `GET /v1/briefs/{slug}` | 200 | 404 |
| `GET /v1/products` | 200 | 422 (bad params) |
| `GET /v1/products/{slug}` | 200 | 404 |
| `POST /v1/briefs/{id}/ratings` | 201 | 400, 404, 409, 422, 429 |
| `PATCH /v1/briefs/{id}/ratings` | 200 | 400, 404, 422, 429 |

All endpoints may return `500` for unexpected server errors.

---

## 6. Security

| Concern | Implementation |
|---|---|
| CORS | Allow only `https://idea-fork.com` origin. No wildcard. |
| TLS | Enforced by Cloud Run (TLS 1.3). |
| Input validation | Pydantic models validate all request bodies and query params. |
| SQL injection | SQLAlchemy parameterized queries. No raw SQL interpolation. |
| Rate limiting | `POST /v1/briefs/{id}/ratings`: 10/min per session. All other endpoints: 100/min per IP. |
| Session cookie | `session_id`: httpOnly, Secure, SameSite=Lax, Path=/. No PII. |
| Content-Type | Reject requests with unexpected Content-Type on POST/PATCH. |

---

## 7. Caching Strategy

| Endpoint | Cache-Control | Rationale |
|---|---|---|
| `GET /v1/posts` | `public, max-age=60` | Feed refreshed by pipeline (hourly/daily). 60s staleness OK. |
| `GET /v1/posts/{id}` | `public, max-age=300` | Post content rarely changes after ingestion. |
| `GET /v1/tags` | `public, max-age=3600` | Tags change infrequently. |
| `GET /v1/briefs` | `public, max-age=60` | New briefs published periodically. |
| `GET /v1/briefs/{slug}` | `public, max-age=300` | Brief content is static after publication. Vote counts may lag — acceptable. |
| `GET /v1/products` | `public, max-age=60` | Trending scores update with pipeline runs. |
| `GET /v1/products/{slug}` | `public, max-age=300` | Product detail is relatively stable. |
| `POST /PATCH` | `private, no-store` | Write operations, never cached. |

Next.js SSR can layer ISR (5-min revalidation) on top of these API cache headers for additional performance.

---

## 8. SADD Deviations

None. All decisions follow the SADD:
- REST API over FastAPI (Section 3.1)
- No authentication in MVP (Section 6.1)
- Anonymous session-based ratings (ADR-7)
- PostgreSQL as sole data store, no Redis caching layer (ADR-4)
- Hexagonal architecture for code structure (ADR-3)
