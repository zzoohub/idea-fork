# Workflow

## 1. Product → Design → UI

```
z-product-brief
  → z-prd-craft                    # PRD → docs/prd.md
  → z-ux-designer (agent)          # UX spec → docs/ux-spec.md
    + Google Stitch (MCP)           # Visual mockups (parallel)
  → z-ui-engineer (agent)          # Component implementation
  → UX check by human
```

## 2. Architecture → Backend → Frontend

```
z-software-architect               # Design doc → docs/design-doc.md
  → z-database-architect           # DB design → docs/database-design.md
  → z-api-design                   # API endpoints (plan)
  → Backend implementation         # z-axum-hexagonal / z-fastapi-hexagonal
  → Frontend implementation        # z-nextjs
  → (auto, parallel)
      z-security-reviewer           # Security audit → fix
      z-tester                      # Test changed code → fix
```

## 3. Pre-Deployment

### GCP
- [ ] Cloud Run services (API / Worker)
- [ ] Secret Manager — API keys, DB credentials, third-party tokens
- [ ] IAM service accounts

### Cloudflare
- [ ] Domain + DNS
- [ ] SSL/TLS
- [ ] Workers / Pages (if used)

### Database
- [ ] Provision PostgreSQL (Neon)
- [ ] Run migrations
- [ ] Seed initial data (if needed)

### Observability
- [ ] Sentry — API + Worker + Web + Mobile
- [ ] PostHog — Web + Mobile

### EAS (Mobile)
- [ ] EAS project init
- [ ] Build profiles (development / preview / production)
- [ ] EAS Update (OTA) channel setup
- [ ] App Store / Play Store credentials

### CI/CD (GitHub Actions)
- [ ] Workflows per service
- [ ] Dockerfile per service
- [ ] GitHub Secrets — GCP SA key, Sentry DSN, PostHog key, EAS token

### Pulumi
- [ ] Stack init (staging / production)
- [ ] State backend configured
