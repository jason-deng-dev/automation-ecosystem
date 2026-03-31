# CI/CD — Automation Ecosystem

## What CI/CD Is

**CI (Continuous Integration)** — every push to GitHub automatically runs tests and build checks. If anything fails, the push is flagged and the merge is blocked. You never land broken code on main.

**CD (Continuous Deployment)** — when a merge to main passes CI, the new version is automatically built, packaged, and deployed to the server. No manual SSH, no manual docker commands.

The core principle: **CD never runs unless CI passes.** The pipeline is a gate, not just automation.

---

## Industry Standard Pipeline

```
developer pushes code
    ↓
CI runs on GitHub Actions
    ├── lint
    ├── run tests
    └── build check (tsc / docker build)

    if any step fails → PR is blocked, no merge allowed

    if all steps pass → merge allowed
    ↓
CD runs on merge to main
    ├── build Docker image
    ├── push image to registry (Docker Hub / AWS ECR)
    └── SSH into server → docker pull → docker restart
```

This is the same pattern used at startups and large companies. The tooling may differ (Jenkins vs GitHub Actions vs CircleCI, ECR vs Docker Hub) but the structure is identical.

---

## This Project's Setup

### Services with tests
| Service | Test framework | Test command | What's tested |
|---|---|---|---|
| `scraper` | Vitest | `npm test` | Output shape, required fields, field formats against fixture data |
| `xhs` | Vitest | `npm test` | `buildContext()` per post type, `generatePost()` with mocked Anthropic client |
| `rakuten` | — | — | Not yet written |

### Deployment targets
All services deploy to AWS Lightsail as Docker containers. `scraper` and `race-hub` share a volume for `races.json`.

---

## GitHub Actions Workflow

Workflows live in `.github/workflows/`. Each service has its own workflow file so they run independently.

### CI — runs on every push and PR

`.github/workflows/ci-xhs.yml`:
```yaml
name: CI — xhs

on:
  push:
    paths:
      - 'services/xhs/**'
  pull_request:
    paths:
      - 'services/xhs/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
        working-directory: services/xhs
      - run: npm test
        working-directory: services/xhs
```

Same structure for `scraper` — just change the paths and working-directory.

### CD — runs on merge to main (to be added at deploy time)

```yaml
name: CD — xhs

on:
  push:
    branches: [main]
    paths:
      - 'services/xhs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          docker build -t yourdockerhubuser/xhs:latest services/xhs
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push yourdockerhubuser/xhs:latest
      - name: Deploy to Lightsail
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.LIGHTSAIL_HOST }}
          username: ${{ secrets.LIGHTSAIL_USER }}
          key: ${{ secrets.LIGHTSAIL_SSH_KEY }}
          script: |
            docker pull yourdockerhubuser/xhs:latest
            docker stop xhs || true
            docker run -d --restart unless-stopped --name xhs yourdockerhubuser/xhs:latest
```

Secrets (Docker credentials, Lightsail SSH key) are stored in GitHub → Settings → Secrets — never in code.

---

## Incremental Rollout Plan

Services are containerized and deployed independently. The order:

1. **scraper** — no external dependencies, simplest container
2. **race-hub** — reads scraper's shared volume output
3. **xhs** — depends on races.json from race-hub volume
4. **rakuten** — depends on PostgreSQL (needs DB provisioning on Lightsail first)
5. **dashboard** — depends on all services being deployed

Each service gets its own CI workflow immediately. CD is added per service at deploy time.

---

## Secrets Management

Environment variables are never committed to GitHub. The pattern:

- `.env` — local dev only, gitignored
- `.env.example` — committed, shows required keys with no values
- GitHub Secrets — used by Actions for deploy credentials (Docker Hub, Lightsail SSH key)
- Lightsail — env vars injected at container runtime via `docker run -e` or a remote `.env` file

---

## Why This Matters

At any company with a real engineering team, CI/CD is non-negotiable. The workflow here mirrors what you'd encounter on day one at a fintech or any tech company:

- PRs are blocked until tests pass — you can't ship broken code by accident
- Deployments are automated and auditable — every deploy is a GitHub Actions run with a full log
- Secrets are never in code — credentials live in the secrets manager, not the repo
- Services are independent — a failing test in `xhs` doesn't block a deploy of `scraper`
