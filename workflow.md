# Workflow

<!-- This is your playbook. Follow it top to bottom for each new product. -->
<!-- Agents reference this file to understand where they fit in the process. -->

## 0. Validate — Before Building Anything

```
"Products that work are obvious even when ugly and poorly marketed.
 Products that don't work stay broken no matter how polished."
```

**You do this:**
1. Write down the ONE core hypothesis: "I believe [target user] has [problem] and will [use my solution] because [reason]"
2. Build the minimum thing that tests it (hours, not days)
3. Put it in front of real users before investing in design or polish
4. Look for organic pull — users asking for more, sharing without being asked
5. No pull? Pivot the hypothesis. Don't polish the execution.

**Go/No-Go — move to step 1 only when:**
- [ ] At least one signal of organic pull (users asking for more, sharing, or returning unprompted)
- [ ] You can articulate WHY they pulled (not just that they did)
- [ ] The problem is validated, not just the solution shape

No signal after 2–3 pivots? Kill the idea. Move on.

## 1. Product → Design → UI

**You do this:** Describe what you want to build. Agents handle the rest.

```
product-brief                         # You describe the idea
  → prd-craft                         # PRD → docs/prd.md
  → ux-designer (agent)               # UX spec → docs/ux-design.md
    + Google Stitch (MCP)               # Visual mockups (parallel)
  → ui-engineer (agent)               # Component implementation
  → interactive-engineer (agent)       # Motion, 3D, gestures, atmosphere
  → You review the UX and approve
```

## 2. Architecture → Backend → Frontend + Tracking

**You do this:** Review the design doc. Agents build, test, and instrument.

Tracking plan is defined in parallel with architecture — so events are baked into
the implementation from the start, not bolted on after.

```
software-architect                    # Design doc → docs/design-doc.md
  → database-architect                # DB design → docs/database-design.md
  → api-design                        # API endpoints (plan)

data-analyst (parallel with above)    # Tracking plan defined during design
  → biz/analytics/tracking-plan.md      # Events + Aha Moment definition
  → biz/analytics/funnels.md            # Funnel stages + target conversion rates
  → biz/analytics/dashboards.md         # Dashboard specs for PostHog
  → biz/analytics/kill-criteria.md      # What numbers trigger Kill / Keep / Scale

  → Backend implementation              # axum-hexagonal / fastapi-hexagonal
                                        # (includes tracking events in code)
  → Frontend implementation             # nextjs
                                        # (includes tracking events in code)
  → (auto, parallel)
      security-reviewer               # Security audit → fix
      tester                          # Unit + integration tests → fix
```

**Test strategy at this stage:** Unit tests + integration tests only.
E2E tests come later (step 6, after Scale decision) — UI is still changing too fast.
Exception: manually test payment flows before launch if applicable.

## 3. Deploy

**You do this:** Work through in order. CI/CD is set up before first deploy
so every subsequent push goes through the pipeline.

### 1) Pulumi — define all infra as code
- [ ] Stack init (staging / production)
- [ ] State backend configured
- [ ] Resources defined:
  - Cloud Run services — API / Worker (GCP)
  - Secret Manager — API keys, DB credentials, third-party tokens
  - IAM service accounts
  - Domain + DNS + SSL (Cloudflare)
  - PostgreSQL (Neon)
- [ ] `pulumi up` → provisions infra + DB in one shot

### 2) Database — post-provision setup
- [ ] Run migrations
- [ ] Seed initial data (if needed)
- [ ] Backup schedule configured

### 3) CI/CD
- [ ] Dockerfile per service
- [ ] GitHub Actions workflows (build → push → deploy)
- [ ] GitHub Secrets configured

### 4) Mobile (if applicable)
- [ ] EAS project init + build profiles
- [ ] EAS Update (OTA) channel setup
- [ ] App Store / Play Store credentials

### 5) First deploy + verify
- [ ] Deploy to staging → smoke test
- [ ] Deploy to production
- [ ] PostHog events firing correctly
- [ ] Sentry connected (API + Worker + Web + Mobile)
- [ ] Aha Moment event works end-to-end

## 4. Launch → Marketing

**You do this:** Tell marketer about your product. It prepares all launch materials.
You execute on launch day. **Operate starts here and runs forever.**

```
marketer (agent)
  → biz/marketing/strategy.md           # Positioning, audience, channels
  → biz/marketing/pricing.md            # Tiers and packaging
  → biz/marketing/competitors.md        # Who you're up against
  → biz/marketing/launch/               # PH, HN, Reddit drafts + checklist
  → biz/marketing/content/              # Email sequences, editorial calendar, free tools
  → biz/marketing/assets/               # OG image, screenshots, demo
  → biz/marketing/seo/                  # Technical SEO: sitemap, meta, OG, structured data, robots.txt
  → biz/legal/                          # Terms of Service, Privacy Policy
  → biz/ops/                            # FAQ, runbook
```

**Technical SEO checklist (one-time, before launch):**
- [ ] Meta titles + descriptions on all pages
- [ ] Open Graph + Twitter Card tags
- [ ] Sitemap.xml generated and submitted
- [ ] robots.txt configured
- [ ] Structured data (JSON-LD) where applicable
- [ ] Canonical URLs set

**Launch day (you):**
- [ ] Post on channels per `biz/marketing/launch/checklist.md`
- [ ] Respond to ALL comments and feedback within 2 hours
- [ ] Log feedback → `biz/ops/feedback-log.md`

## Ongoing: Operate

**Starts on launch day. Runs in parallel with everything below — not a sequential step.**

- Respond to user feedback daily → `biz/ops/feedback-log.md`
- Update FAQ when same question comes 3+ times → `biz/ops/faq.md`
- Follow incident playbook when things break → `biz/ops/runbook.md`
- Feed insights back into step 1, 2, or 6

## 5. Measure → Decide

**You do this:** Check the dashboard every morning (5 min). Make the Kill/Keep/Scale call at week 2.

```
data-analyst (agent)
  → biz/analytics/reports/              # Weekly reports, deep-dives
  → biz/analytics/health-score.md       # Customer health score model
  → Kill / Keep / Scale recommendation  # You make the final call
```

**Decision timeline:**
- **Week 1:** Watch numbers. Respond to all feedback. Don't optimize yet.
- **Week 2:** First Kill / Keep / Scale evaluation per `biz/analytics/kill-criteria.md`
- **Weekly after:** Re-evaluate until the decision is clear.

**Improvement priority (always this order):**
1. **Retention** — Does a plateau exist? If not, stop everything else and fix this.
2. **Activation** — Are users reaching Aha Moment? Remove friction.
3. **Acquisition** — Only after retention and activation are healthy.

### 🔴 Kill → Write post-mortem, archive code, move on the same day.
### 🟡 Keep → Go back to step 1 or 2. Iterate on the biggest problem.
### 🟢 Scale → Continue to step 6.

## 6. Grow → Optimize

**Only after Scale decision.** Growing a leaky product is a waste of money.

**You do this:** Tell growth-optimizer what to improve. It designs experiments and optimization strategies.

```
growth-optimizer (agent)
  → biz/growth/experiments.md           # ICE-scored experiment backlog + results
  → biz/growth/referral-program.md      # Referral + viral loop design
  → biz/growth/churn-prevention.md      # Cancel flow, save offers, intervention
  → biz/growth/dunning.md              # Payment failure recovery
  → biz/growth/cro/                     # Per-page/flow CRO analyses
  → biz/growth/seo/                     # Content SEO: keyword strategy, blog, landing page optimization
  → Experiment results → data-analyst # Handoff for statistical analysis
```

**Now add E2E tests:**
Product survived — protect the core flows from regression.
- [ ] E2E tests for critical user paths (signup → Aha Moment → payment)
- [ ] E2E integrated into CI pipeline
- [ ] Flaky test budget: fix or delete within 48 hours
