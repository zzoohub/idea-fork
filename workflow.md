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

## 1. Product → Design → UI

**You do this:** Describe what you want to build. Agents handle the rest.

```
z-product-brief                         # You describe the idea
  → z-prd-craft                         # PRD → docs/prd.md
  → z-ux-designer (agent)               # UX spec → docs/ux-design.md
    + Google Stitch (MCP)               # Visual mockups (parallel)
  → z-ui-engineer (agent)               # Component implementation
  → You review the UX and approve
```

## 2. Architecture → Backend → Frontend

**You do this:** Review the design doc. Agents build and test.

```
z-software-architect                    # Design doc → docs/design-doc.md
  → z-database-architect                # DB design → docs/database-design.md
  → z-api-design                        # API endpoints (plan)
  → Backend implementation              # z-axum-hexagonal / z-fastapi-hexagonal
  → Frontend implementation             # z-nextjs
  → (auto, parallel)
      z-security-reviewer               # Security audit → fix
      z-tester                          # Test changed code → fix
```

## 3. Set Up Tracking

**You do this:** Tell z-data-analyst about your product. It defines what to measure.

This happens BEFORE launch — you can't measure what you didn't set up.

```
z-data-analyst (agent)
  → biz/analytics/tracking-plan.md      # Events + Aha Moment definition
  → biz/analytics/funnels.md            # Funnel stages + target conversion rates
  → biz/analytics/dashboards.md         # Dashboard specs for PostHog
  → biz/analytics/kill-criteria.md      # What numbers trigger Kill / Keep / Scale
```

**Then verify:**
- [ ] PostHog installed (Web + Mobile)
- [ ] Sentry installed (API + Worker + Web + Mobile)
- [ ] Core events firing correctly in dev
- [ ] Aha Moment event works end-to-end

## 4. Deploy

**You do this:** Check off each item. Most of this is one-time setup.

### Infra
- [ ] Cloud Run services — API / Worker (GCP)
- [ ] Secret Manager — API keys, DB credentials, third-party tokens
- [ ] IAM service accounts
- [ ] Domain + DNS + SSL (Cloudflare)

### Database
- [ ] Provision PostgreSQL (Neon)
- [ ] Run migrations
- [ ] Seed initial data (if needed)

### Mobile (if applicable)
- [ ] EAS project init + build profiles
- [ ] EAS Update (OTA) channel setup
- [ ] App Store / Play Store credentials

### CI/CD
- [ ] GitHub Actions workflows per service
- [ ] Dockerfile per service
- [ ] GitHub Secrets configured

### Pulumi
- [ ] Stack init (staging / production)
- [ ] State backend configured

## 5. Launch → Marketing

**You do this:** Tell z-marketer about your product. It prepares all launch materials. You execute on launch day.

```
z-marketer (agent)
  → biz/marketing/strategy.md           # Positioning, audience, channels
  → biz/marketing/pricing.md            # Tiers and packaging
  → biz/marketing/competitors.md        # Who you're up against
  → biz/marketing/launch/               # PH, HN, Reddit drafts + checklist
  → biz/marketing/content/              # Email sequences, editorial calendar, free tools
  → biz/marketing/assets/               # OG image, screenshots, demo
  → biz/legal/                          # Terms of Service, Privacy Policy
  → biz/ops/                            # FAQ, runbook
```

**Launch day (you):**
- [ ] Post on channels per `biz/marketing/launch/checklist.md`
- [ ] Respond to ALL comments and feedback within 2 hours
- [ ] Log feedback → `biz/ops/feedback-log.md`

## 6. Measure → Decide

**You do this:** Check the dashboard every morning (5 min). Make the Kill/Keep/Scale call at week 2.

```
z-data-analyst (agent)
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
### 🟢 Scale → Continue to step 7.

## 7. Grow → Optimize

**Only after Scale decision.** Growing a leaky product is a waste of money.

**You do this:** Tell z-growth-optimizer what to improve. It designs experiments and optimization strategies.

```
z-growth-optimizer (agent)
  → biz/growth/experiments.md           # ICE-scored experiment backlog + results
  → biz/growth/referral-program.md      # Referral + viral loop design
  → biz/growth/churn-prevention.md      # Cancel flow, save offers, intervention
  → biz/growth/dunning.md              # Payment failure recovery
  → biz/growth/cro/                     # Per-page/flow CRO analyses
  → Experiment results → z-data-analyst # Handoff for statistical analysis
```

## Ongoing: Operate

**This runs in parallel from launch day onward — not a sequential step.**

- Respond to user feedback daily → `biz/ops/feedback-log.md`
- Update FAQ when same question comes 3+ times → `biz/ops/faq.md`
- Follow incident playbook when things break → `biz/ops/runbook.md`
- Feed insights back into step 1, 2, or 7
