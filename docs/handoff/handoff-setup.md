# Handoff Setup Guide

**Platform:** running.moximoxi.net automation ecosystem  
**Audience:** Developer completing the handoff  
**Purpose:** Everything the new operator needs before the developer leaves — accounts, access, keys, and backups

---

## Master Checklist

Work through each section below. Check off each item as it's done.

- [ ] GitHub repo transferred
- [ ] GitHub Actions secrets updated
- [ ] AWS Lightsail access granted
- [ ] AWS MFA transferred or set up on operator's account (Section 3)
- [ ] SSH key handed over (or new key set up)
- [ ] Domain registrar access transferred
- [ ] Stripe team member added
- [ ] Stripe MFA transferred to operator's device (Section 6)
- [ ] WordPress admin account created
- [ ] XHS creator credentials handed over
- [ ] Anthropic API account transferred
- [ ] Rakuten API account transferred
- [ ] DeepL account transferred
- [ ] Google Translate API key transferred (TranslatePress)
- [ ] WooCommerce REST API credentials handed over
- [ ] Docker Hub access granted
- [ ] PostgreSQL credentials handed over
- [ ] XHS auth secret handed over
- [ ] Database backup taken and saved (both databases)
- [ ] Final verification run

---

## Credential Inventory

Every secret the automation system depends on. Use this as the checklist when collecting credentials for handoff.

| Credential | Used by | Where to find it | Env var name |
|---|---|---|---|
| Anthropic API key | XHS generator, Rakuten genre classifier | console.anthropic.com → API Keys | `ANTHROPIC_API_KEY` |
| DeepL API key | Scraper (race translation), Rakuten (product names) | deepl.com/pro → Account → API keys | `DEEPL_API_KEY` |
| Rakuten App ID | Rakuten pipeline | webservice.rakuten.co.jp → Applications | `RAKUTEN_APP_ID` |
| Rakuten Access Key | Rakuten pipeline | webservice.rakuten.co.jp → Applications | `RAKUTEN_ACCESS_KEY` |
| WooCommerce Consumer Key | Rakuten → WooCommerce push | WordPress admin → WooCommerce → Settings → Advanced → REST API | `WP_WOOCOMMERCE_CONSUMER_KEY` |
| WooCommerce Consumer Secret | Rakuten → WooCommerce push | Same as above | `WP_WOOCOMMERCE_CONSUMER_SECRET` |
| PostgreSQL credentials | All services | Set on VPS at install time — ask developer | `DATABASE_URL` (both DBs) |
| XHS Auth Secret | XHS ↔ Dashboard SSE auth | Current `.env` on VPS | `XHS_AUTH_SECRET` |
| Google Translate API key | TranslatePress (WP plugin, JA→ZH) | console.cloud.google.com → Credentials | WordPress admin → TranslatePress → Settings |
| AWS root / IAM credentials | Lightsail VPS | AWS console | N/A — console login |
| SSH private key | VPS access | `~/.ssh/automation-ecosystem.pem` | N/A |
| Docker Hub credentials | GitHub Actions CD pipeline | hub.docker.com → Account Settings → Security | GitHub secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD` |
| GitHub Actions secrets | CD pipeline | GitHub repo → Settings → Secrets | See Section 2 |
| Stripe login | Payments | dashboard.stripe.com | N/A — console login |
| WordPress admin | Site management | running.moximoxi.net/wp-admin | N/A — console login |
| XHS creator account | Content publishing | creator.xiaohongshu.com | N/A — phone + password |
| Domain registrar login | DNS / renewal | Wherever moximoxi.net is registered | N/A — console login |

**To retrieve any env var from the live server:**
```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
cat /home/ubuntu/automation-ecosystem/services/<service>/.env
```

---

## 1. GitHub Repository Transfer

The automation code lives on your personal GitHub account. Transfer it to the company or to the new operator's account.

**If transferring to another GitHub account:**

1. Go to the repo on GitHub
2. Settings → Danger Zone → **Transfer**
3. Enter the repo name to confirm
4. Enter the destination GitHub username or org name
5. Click **Transfer**

The new owner receives an email to accept. Until they accept, the transfer is pending.

**After transfer — critical:**
- Your GitHub Actions workflows and secrets do NOT automatically carry over to the new owner's account cleanly. See Section 2.
- Any personal access tokens (PATs) you set as secrets will still work until they expire — but they're tied to your account. Replace them immediately (see Section 2).

**If the company has no GitHub account:**
1. Create a free GitHub org: github.com → + → New organization
2. Transfer the repo into that org
3. Invite the new operator as an Owner of the org

---

## 2. GitHub Actions Secrets

After repo transfer, the GitHub Actions secrets need to be verified and updated.

Go to: GitHub → repo → Settings → Secrets and variables → Actions

| Secret | What it is | Action required |
|---|---|---|
| `LIGHTSAIL_HOST` | `<SERVER_IP>` | Verify it's still there — no change needed |
| `LIGHTSAIL_USER` | `ubuntu` | Verify — no change needed |
| `LIGHTSAIL_SSH_KEY` | Contents of `automation-ecosystem.pem` | Update if new operator uses a different key pair (see Section 4) |
| `DOCKER_USERNAME` | Docker Hub username | Update to new operator's Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password or access token | Update to new operator's Docker Hub token |

**To update a secret:**
1. Click the secret name
2. Click **Update**
3. Paste the new value
4. Save

---

## 3. AWS Lightsail Access

The server (`<SERVER_IP>`) runs on AWS Lightsail under your AWS account.

**Option A — Add the new operator as an IAM user (recommended)**

1. Log into AWS console → IAM → Users → **Add users**
2. Set a username for the operator
3. Select **Provide user access to the AWS Management Console**
4. Set a temporary password (they'll reset it on first login)
5. Attach permissions: at minimum, **AmazonLightsailFullAccess**
6. Enable MFA for their account: IAM → Users → [their name] → Security credentials → MFA → Assign MFA device
7. Send them the console login URL, username, and temporary password

**Option B — Transfer root account (only if operator will own the AWS account entirely)**

1. Change the root account email to the operator's email: AWS → Account → Email address
2. **Transfer MFA (do this in person):**
   - Open Google Authenticator on your phone → ⋮ → **Transfer accounts** → **Export accounts** → select the AWS root entry → a QR code appears
   - Operator scans it with Google Authenticator on their phone
   - **Add their device to AWS first — do not remove yours yet:**
     - AWS → root sign-in → Account → Security credentials → MFA → **Manage** → Assign MFA device
     - Select "Authenticator app" → let operator scan the QR code shown
     - Enter two consecutive codes from their phone to confirm
   - Confirm the operator can log in using their MFA code
   - Only then: deactivate your old MFA device from the same page
3. Change the root account password to something the operator sets themselves

---

## 4. SSH Key Handoff

The VPS uses key-based SSH auth. The original key pair is `automation-ecosystem.pem`.

**Option A — Hand over the existing `.pem` file (simplest)**

1. Securely transfer `~/.ssh/automation-ecosystem.pem` to the operator (USB drive, encrypted email, or 1Password)
2. Instruct them to place it at `~/.ssh/automation-ecosystem.pem` on their machine
3. Set correct permissions: `chmod 400 ~/.ssh/automation-ecosystem.pem`
4. Add SSH config entry:

```
Host lightsail
  HostName <SERVER_IP>
  User ubuntu
  IdentityFile ~/.ssh/automation-ecosystem.pem
```

Test: `ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>`

**Option B — Create a new key pair for the operator**

1. Operator generates their own key pair:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/automation-ecosystem-operator -C "operator"
   ```
2. They send you their public key (`automation-ecosystem-operator.pub`)
3. You add it to the server:
   ```bash
   ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
   echo "PASTE_THEIR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   ```
4. They confirm they can SSH in with their key
5. After confirming, remove your own key from `~/.ssh/authorized_keys` on the server:
   ```bash
   ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
   nano ~/.ssh/authorized_keys
   # Delete the line containing your public key, save
   ```
6. Update the `LIGHTSAIL_SSH_KEY` GitHub secret with their private key content (see Section 2)

---

## 5. Domain Registrar

The domain `running.moximoxi.net` must stay active or the entire website goes down.

**Steps:**

1. Log into your domain registrar (wherever `moximoxi.net` is registered)
2. Find account/user settings → **Add user** or **Transfer account**
3. Add the operator as a co-owner, or:
   - Change the account email to the operator's email
   - Change the account password
   - In person: transfer the MFA device (authenticator app or SMS)
4. Confirm auto-renewal is enabled so the domain doesn't expire
5. Confirm the nameservers are still pointing to wherever DNS is managed (likely the registrar itself or Cloudflare)

**Critical:** If the domain expires or DNS is misconfigured, the website, Race Hub API, and all automation goes offline. Make sure the operator knows the renewal date.

---

## 6. Stripe

Stripe processes payments for the WooCommerce store.

**Add operator as a team member:**

1. Stripe dashboard → Settings → **Team**
2. Click **Invite**
3. Enter operator's email, set role to **Administrator**
4. They receive an invite email — they accept and set up their own login and MFA

**Transfer MFA from your account:**

Once the operator is set up as admin, they can manage the account. Remove yourself:

1. Stripe → Settings → Team → find your name → **Remove**
2. If you're the only admin and can't remove yourself: add the operator first, confirm they can log in and see everything, then remove yourself

**Transfer MFA from your phone (do this in person):**
1. Open Google Authenticator on your phone → ⋮ → **Transfer accounts** → **Export accounts** → select the Stripe entry → QR code appears
2. Operator scans it with Google Authenticator on their phone — both phones now show the same codes
3. Stripe → Settings → **Security** → Two-step authentication → **Add authentication method**
4. Operator scans Stripe's setup QR code with their Authenticator app
5. Stripe will ask for two consecutive codes from their phone to confirm — enter them
6. **Confirm they can log out and back in using their MFA before touching yours**
7. Then remove your MFA device from Stripe → Settings → Security

---

## 7. WordPress Admin

The operator needs their own admin account on running.moximoxi.net.

1. Log into WordPress admin: `running.moximoxi.net/wp-admin`
2. Users → **Add New**
3. Set username, email (operator's email), and a strong password
4. Set Role: **Administrator**
5. Click **Add New User**
6. Confirm they can log in at `/wp-admin` with their credentials
7. Optionally: Users → your account → **Delete** (transfer any content to their account when prompted)

---

## 8. XHS Creator Account

The Xiaohongshu account used for publishing (`creator.xiaohongshu.com`) needs to be accessible to the operator.

**Hand over:**
- Phone number tied to the XHS account
- Account password
- If the account uses a Chinese phone number for login: they will need access to receive SMS verification codes — the SIM or phone must be transferred, or a VOIP number substituted

**Note:** The automation pipeline stores the XHS session in `xhs/auth.json` on the server. After the operator logs in via the dashboard QR code flow, this file is refreshed automatically. They don't need to touch it manually.

---

## 9. API Accounts

Each API used by the pipelines has its own account. The operator needs to own or have access to each one so they can renew keys, manage billing, and view usage.

### Anthropic (Claude API)

Used by: XHS post generator

1. Go to console.anthropic.com
2. Settings → **Members** → Invite → enter operator's email
3. Set role to **Admin** or **Owner**
4. They accept the invite and set up their own login

Alternatively, if this should be a single-owner account: Settings → Account → change email and password to theirs.

Billing: Settings → Billing → update payment method to operator's card.

---

### Rakuten API

Used by: Rakuten product pipeline

1. Go to webservice.rakuten.co.jp
2. Account settings → find the API application registered (the one with the key used in `.env`)
3. Transfer the Rakuten account by changing the login email and password
4. The API key itself does not change unless you regenerate it — the key in `.env` on the VPS stays valid

**Hand the operator:**
- Rakuten account login
- Application ID and Secret (from the Rakuten developer console) — these match what's in the server's `.env`

---

### DeepL

Used by: Scraper (Japanese→Chinese race descriptions)

1. Go to deepl.com/pro → account settings
2. Look for **Team** or **User management** (available on Team plans)
3. If on an Individual plan: change account email and password to the operator's

**Hand the operator:**
- DeepL account login
- Current API key (found in deepl.com/pro → Account → API keys) — matches what's in the server's `.env`
- Monthly character limit and reset date

---

### Google Translate API (TranslatePress)

Used by: TranslatePress WordPress plugin — auto-translates new product content JA→ZH on the WooCommerce store.

This key lives in WordPress admin settings, not in any `.env` file.

1. Go to console.cloud.google.com → Credentials
2. Find the API key used for the Cloud Translation API
3. Transfer the Google Cloud project or add the operator as an Owner: IAM → Add → enter their Google account email → Role: Owner
4. Or: generate a new API key from their own Google Cloud project, restrict it to Cloud Translation API, and update it in WordPress:
   - WordPress admin → TranslatePress → Settings → Google Translate API key

**Hand the operator:**
- Google Cloud account access (or new API key)
- Confirm the key is restricted to Translation API only

---

### WooCommerce REST API

Used by: Rakuten pipeline — pushes products into WooCommerce.

1. Log into WordPress admin → WooCommerce → Settings → Advanced → **REST API**
2. You'll see the existing Consumer Key and Secret (key is shown on creation only — if you don't have the secret saved, generate a new pair)
3. To generate a new pair:
   - Click **Add Key**
   - Description: e.g. "Rakuten pipeline"
   - User: your admin user
   - Permissions: **Read/Write**
   - Click **Generate API Key**
   - Copy the Consumer Key and Consumer Secret immediately (only shown once)
4. Update these values on the VPS: `services/rakuten/.env` → `WP_WOOCOMMERCE_CONSUMER_KEY` and `WP_WOOCOMMERCE_CONSUMER_SECRET`
5. Restart the Rakuten container: `docker-compose restart rakuten`

**Hand the operator:**
- Consumer Key and Consumer Secret
- Or: walk through generating a new pair in their presence

---

### OpenAI

Not currently used — planned for a future analytics/embeddings pipeline that has not been built. No API key is active in production `.env` files. Skip this for now.

---

## 10. PostgreSQL Database Credentials

PostgreSQL runs as a Docker container on the VPS. All services connect using a shared database user.

**Credentials to hand over:**
- PostgreSQL user: `goodsoft`
- Password: [stored in VPS `.env` files — retrieve with `cat /home/ubuntu/automation-ecosystem/services/xhs/.env`]
- `ecosystemdb` — XHS, Scraper, Race Hub
- `rakutendb` — Rakuten pipeline

**To verify the operator can connect:**
```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
psql -U goodsoft -d ecosystemdb -h localhost
psql -U goodsoft -d rakutendb -h localhost
```

**If they need to change the password:**
```bash
psql -U goodsoft -d ecosystemdb -h localhost -c "ALTER USER goodsoft WITH PASSWORD 'new_password';"
```
Then update `DATABASE_URL` in every `.env` file on the VPS and restart all containers.

---

## 11. Redis

Used by: Rakuten rate limiting (`express-rate-limit` + Redis). Redis runs as a Docker container on the VPS.

No external account required — Redis runs locally. No credentials to hand over separately.

**To verify it's running:**
```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
docker-compose ps redis
```

If it's not running, `docker-compose up -d redis` starts it.

---

## 12. XHS Auth Secret

`XHS_AUTH_SECRET` is a shared secret used to authenticate the SSE connection between the Dashboard and the XHS container. It must match in both services.

**Where it lives:**
- `services/xhs/.env` → `XHS_AUTH_SECRET`
- `services/dashboard/.env` → `XHS_AUTH_SECRET`

**To retrieve:**
```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
grep XHS_AUTH_SECRET /home/ubuntu/automation-ecosystem/services/xhs/.env
```

Hand this value to the operator so they can update both `.env` files if they ever need to rotate it.

---

## 13. Docker Hub

Used by: GitHub Actions CD pipeline — Docker images are built and pushed here, then pulled to the server on deploy.

1. Log into hub.docker.com
2. Account Settings → Security → **Access Tokens** → create a new token for the operator
3. Or: transfer the Docker Hub account by changing email, password, and removing your MFA, then adding theirs
4. Update the `DOCKER_USERNAME` and `DOCKER_PASSWORD` GitHub secrets with the new credentials (see Section 2)

---

## 14. Database Backup

Before you leave, take a full PostgreSQL dump of both databases. This preserves all race data, post history, XHS archive, product catalogue, and run logs.

**On the VPS:**

```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
DATE=$(date +%Y%m%d)
pg_dump -U goodsoft ecosystemdb > ~/ecosystemdb-handoff-backup-$DATE.sql
pg_dump -U goodsoft rakutendb  > ~/rakutendb-handoff-backup-$DATE.sql
```

**Download to your local machine:**

```bash
scp -i ~/.ssh/automation-ecosystem.pem "ubuntu@<SERVER_IP>:~/ecosystemdb-handoff-backup-*.sql" ~/Desktop/
scp -i ~/.ssh/automation-ecosystem.pem "ubuntu@<SERVER_IP>:~/rakutendb-handoff-backup-*.sql" ~/Desktop/
```

**Save both files** somewhere the operator can access — USB drive, Google Drive, or a shared folder. Label them clearly with the date.

**To restore if needed** (operator runs this on the VPS after a disaster):

```bash
psql -U goodsoft ecosystemdb < ecosystemdb-handoff-backup-YYYYMMDD.sql
psql -U goodsoft rakutendb   < rakutendb-handoff-backup-YYYYMMDD.sql
```

---

## 15. Final Verification

Before you hand over and leave, confirm everything works end-to-end.

1. **Operator can SSH into the server:** `ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>` from their machine
2. **Operator can open the dashboard** at `http://<SERVER_IP>:3002` and see all services green
3. **Operator can log into AWS Lightsail** and see the instance
4. **Operator can log into Stripe** and see the account balance and payouts
5. **Operator can log into WordPress** at `/wp-admin`
6. **Operator can trigger a manual XHS run** from the dashboard and confirm it completes
7. **GitHub Actions still work:** make a trivial commit to main and confirm the CD pipeline deploys successfully
8. **Operator can re-authenticate XHS** via the QR code flow on the dashboard — do this even if the session isn't expired, to confirm the flow works on their setup

Once all 8 are confirmed, the handoff is complete.
