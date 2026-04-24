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
- [ ] OpenAI account transferred
- [ ] Docker Hub access granted
- [ ] Database backup taken and saved
- [ ] Final verification run

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
| `LIGHTSAIL_HOST` | `13.192.170.85` | Verify it's still there — no change needed |
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

The server (`13.192.170.85`) runs on AWS Lightsail under your AWS account.

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
2. In person: transfer the MFA authenticator app
   - Open your authenticator app
   - Show the operator the TOTP seed or let them scan a new QR code
   - AWS → root sign-in → Security credentials → MFA → Manage → assign a new virtual MFA device
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
  HostName 13.192.170.85
  User ubuntu
  IdentityFile ~/.ssh/automation-ecosystem.pem
```

Test: `ssh lightsail`

**Option B — Create a new key pair for the operator**

1. Operator generates their own key pair:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/automation-ecosystem-operator -C "operator"
   ```
2. They send you their public key (`automation-ecosystem-operator.pub`)
3. You add it to the server:
   ```bash
   ssh lightsail
   echo "PASTE_THEIR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   ```
4. They confirm they can SSH in with their key
5. After confirming, remove your own key from `~/.ssh/authorized_keys` on the server:
   ```bash
   ssh lightsail
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

**Note:** If your personal phone is the MFA device for the root Stripe account:
1. Stripe → Settings → Security → Two-step authentication
2. Add their phone number or authenticator app as a new MFA method first
3. Confirm they can log in
4. Remove your MFA device

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

### OpenAI

Used by: RAG / embeddings pipeline

1. Go to platform.openai.com → Settings → **Team** → Invite
2. Enter operator's email, set role to **Owner**
3. They accept and set up their own login

Billing: Settings → Billing → update payment method.

**Hand the operator:**
- The API key used in `.env` — or generate a new one from their account after they join and update the VPS `.env`

---

## 10. Docker Hub

Used by: GitHub Actions CD pipeline — Docker images are built and pushed here, then pulled to the server on deploy.

1. Log into hub.docker.com
2. Account Settings → Security → **Access Tokens** → create a new token for the operator
3. Or: transfer the Docker Hub account by changing email, password, and removing your MFA, then adding theirs
4. Update the `DOCKER_USERNAME` and `DOCKER_PASSWORD` GitHub secrets with the new credentials (see Section 2)

---

## 11. Database Backup

Before you leave, take a full PostgreSQL dump. This preserves all race data, post history, product catalogue, and run logs.

**On the VPS:**

```bash
ssh lightsail
pg_dump -U goodsoft rakutendb > ~/rakutendb-handoff-backup-$(date +%Y%m%d).sql
```

**Download to your local machine:**

```bash
scp lightsail:~/rakutendb-handoff-backup-*.sql ~/Desktop/
```

**Save this file** somewhere the operator can access it — USB drive, Google Drive, or a shared folder. Label it clearly with the date.

**To restore if needed** (operator runs this on the VPS after a disaster):

```bash
psql -U goodsoft rakutendb < rakutendb-handoff-backup-YYYYMMDD.sql
```

---

## 12. Final Verification

Before you hand over and leave, confirm everything works end-to-end.

1. **Operator can SSH into the server:** `ssh lightsail` from their machine
2. **Operator can open the dashboard** at `http://13.192.170.85:3002` and see all services green
3. **Operator can log into AWS Lightsail** and see the instance
4. **Operator can log into Stripe** and see the account balance and payouts
5. **Operator can log into WordPress** at `/wp-admin`
6. **Operator can trigger a manual XHS run** from the dashboard and confirm it completes
7. **GitHub Actions still work:** make a trivial commit to main and confirm the CD pipeline deploys successfully
8. **Operator can re-authenticate XHS** via the QR code flow on the dashboard — do this even if the session isn't expired, to confirm the flow works on their setup

Once all 8 are confirmed, the handoff is complete.
