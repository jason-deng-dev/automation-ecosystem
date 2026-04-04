# VPS Setup — Automation Ecosystem

## 1. Instance

| Setting | Value |
|---|---|
| Provider | AWS Lightsail |
| Instance name | `automation-ecosystem-prod` |
| Region | Tokyo, Zone A (`ap-northeast-1a`) |
| Plan | General purpose — 2 GB RAM, 2 vCPUs, 60 GB SSD |
| OS | Ubuntu 24.04 LTS |
| Network type | Dual-stack |
| Default user | `ubuntu` |
| Public IPv4 | `13.192.170.85` |
| Private IPv4 | `172.26.11.67` |
| Public IPv6 | `2406:da14:1f2c:800:2b18:e0f3:2ddf:8883` |
| SSH key file | `~/.ssh/automation-ecosystem.pem` |
| Purpose | Runs all five automation containers via docker-compose |

---

## 2. Launch Script

Pasted into the Lightsail "Launch script" field at instance creation. Runs once on first boot as root.

```bash
#!/bin/bash
set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group (no sudo needed for docker commands)
usermod -aG docker ubuntu

# Enable Docker on boot
systemctl enable docker
systemctl start docker

# Firewall — SSH + web only, Postgres stays internal
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## 3. Firewall (Lightsail + UFW)

Configure both the Lightsail networking firewall (console) and UFW (on the instance). They must both allow the same ports.

| Port | Protocol | Open to | Purpose |
|---|---|---|---|
| 22 | TCP | Your IPs only | SSH |
| 80 | TCP | Public | HTTP (NGINX reverse proxy) |
| 443 | TCP | Public | HTTPS |
| 3000 | TCP | Internal only | Dashboard (NGINX proxies this) |
| 3001 | TCP | Internal only | Race Hub (NGINX proxies this) |
| 3002 | TCP | Internal only | Rakuten Express (NGINX proxies this) |
| 5432 | — | **Never open** | PostgreSQL — SSH tunnel only |

---

## 4. PostgreSQL

PostgreSQL runs natively on the VPS (not in Docker). It is **not exposed on a public port**. Remote access from home or work is via SSH tunnel only.

### Install

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Database credentials

| Setting | Value |
|---|---|
| Database name | `rakutendb` |
| User | `goodsoft` |
| Password | `1234` |

### Setup commands (run once)

```bash
sudo -u postgres psql
```

```sql
CREATE USER goodsoft WITH PASSWORD '1234';
CREATE DATABASE rakutendb OWNER goodsoft;
GRANT ALL PRIVILEGES ON DATABASE rakutendb TO goodsoft;
\q
```

### SSH tunnel (remote dev access)

Local port 5432 is taken by the local Postgres install, so tunnel to **5433** instead:

```bash
ssh -L 5433:localhost:5432 lightsail -N
```

Keep this terminal open while working. The tunnel maps `localhost:5433` → VPS `localhost:5432`.

Add an alias so you don't have to remember it:

```bash
echo "alias db-tunnel='ssh -L 5433:localhost:5432 lightsail -N'" >> ~/.bashrc
source ~/.bashrc
```

Then just run `db-tunnel` in a spare terminal before starting work.

### Local `.env` connection string

```
DATABASE_URL=postgresql://goodsoft:1234@localhost:5433/rakutendb
```

---

## 5. SSH Access

```bash
ssh ubuntu@13.192.170.85
```

Key pair generated via Lightsail console and downloaded as `automation-ecosystem.pem`.

```bash
cp /mnt/c/Users/jason/Downloads/automation-ecosystem.pem ~/.ssh/
chmod 400 ~/.ssh/automation-ecosystem.pem
```

`~/.ssh/config`:

```
Host lightsail
  HostName 13.192.170.85
  User ubuntu
  IdentityFile ~/.ssh/automation-ecosystem.pem
```

Then just: `ssh lightsail`

---

## 6. Connecting from a New Machine (e.g. Work)

Do this once on any new machine you want to develop from.

### Step 1 — Copy the SSH key onto the machine

The `.pem` file is on your USB. Copy it to the machine's SSH folder:

**WSL / Linux / Mac:**
```bash
cp /path/to/automation-ecosystem.pem ~/.ssh/
chmod 400 ~/.ssh/automation-ecosystem.pem
```

**Windows (PowerShell):**
```powershell
copy D:\automation-ecosystem.pem $HOME\.ssh\
icacls $HOME\.ssh\automation-ecosystem.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

### Step 2 — Add SSH config entry

Open (or create) `~/.ssh/config` and add:

```
Host lightsail
  HostName 13.192.170.85
  User ubuntu
  IdentityFile ~/.ssh/automation-ecosystem.pem
```

Test it: `ssh lightsail` — you should be in immediately.

### Step 3 — Add the db-tunnel alias

```bash
echo "alias db-tunnel='ssh -L 5433:localhost:5432 lightsail -N'" >> ~/.bashrc
source ~/.bashrc
```

### Step 4 — Set your `.env`

In `services/rakuten/.env`, set:

```
DATABASE_URL=postgresql://goodsoft:1234@localhost:5433/rakutendb
```

### Every session — before running the app

Open a spare terminal and run:

```bash
db-tunnel
```

Leave it open. Then start the app normally in another terminal. The tunnel keeps the DB connection alive.

---

## 7. GitHub Secrets (for CD workflows)

| Secret name | Value |
|---|---|
| `LIGHTSAIL_HOST` | Public IP of the instance |
| `LIGHTSAIL_USER` | `ubuntu` |
| `LIGHTSAIL_SSH_KEY` | Contents of `lightsail.pem` |
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password or access token |

Set at: GitHub → repo → Settings → Secrets and variables → Actions

---

## 7. Environment Variables on the VPS

Never committed to git. Each service has a `.env` on the VPS at the same path as in local dev. Inject via `docker-compose.yml` using `env_file`:

```yaml
services:
  rakuten:
    env_file:
      - ./services/rakuten/.env
```

On first deploy, manually `scp` the `.env` files up:

```bash
scp services/rakuten/.env ubuntu@13.192.170.85:~/automation-ecosystem/services/rakuten/.env
```

---

## 8. Docker Compose

`docker-compose.yml` lives at the repo root and orchestrates all five containers + the shared volume. Not yet written — see `docs/cicd-checklist.md` Phase 5.

When it exists, the full stack starts with:

```bash
docker compose up -d
```

---

## 9. Deploy Order

Services must be deployed in this order due to dependencies:

1. **scraper** — no dependencies
2. **race-hub** — reads scraper's shared volume
3. **xhs** — reads races.json from shared volume
4. **rakuten** — depends on PostgreSQL
5. **dashboard** — depends on all services running

---

## 10. Status

| Task | Done |
|---|---|
| Pick Lightsail OS (Ubuntu 24.04 LTS) | ✓ |
| Launch script written | ✓ |
| Instance provisioned | ✓ |
| Launch script ran (Docker 29.3.1 + Compose v5.1.1 confirmed) | ✓ |
| SSH key downloaded + configured | ✓ |
| SSH config set up (`ssh lightsail` works) | ✓ |
| GitHub Secrets populated | — |
| Docker Hub account created | — |
| PostgreSQL set up on VPS | ✓ |
| `.env` files transferred to VPS | — |
| docker-compose.yml written | — |
| All services deployed | — |
