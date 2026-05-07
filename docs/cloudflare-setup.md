# Cloudflare Proxy Setup — dash.moximoxi.net

Route the dashboard through Cloudflare so operators in China can access it via `https://dash.moximoxi.net` instead of the raw AWS Lightsail IP.

**What changes:** A new subdomain `dash.moximoxi.net` is added, proxied through Cloudflare to Lightsail. WordPress (`running.moximoxi.net`) is untouched.

---

## Cloudflare Account Setup

- [ ] Go to cloudflare.com → create free account
- [ ] Click **Add a site** → enter `moximoxi.net` → select **Free plan**
- [ ] On the onboarding screen select **Connect and accelerate traffic**
- [ ] Cloudflare scans and imports existing DNS records — verify `running.moximoxi.net` → `160.251.148.240` is in the list before continuing
- [ ] Add new A record:
  - Name: `dash`
  - IPv4: `13.192.170.85`
  - Proxy status: **Proxied** (orange cloud ON)
- [ ] Copy the two Cloudflare nameservers shown (e.g. `xxx.ns.cloudflare.com`)

---

## Onamae — Change Nameservers

- [ ] Log into Onamae → domain settings for `moximoxi.net`
- [ ] Replace existing nameservers with the two Cloudflare nameservers
- [ ] Save — propagation takes anywhere from 5 minutes to a few hours

---

## Lightsail — NGINX Config

- [ ] SSH into Lightsail
- [ ] Add a new NGINX server block for `dash.moximoxi.net` → proxies to `localhost:3002`
- [ ] Reload NGINX: `sudo nginx -s reload`

> See Jason for the exact NGINX config block — he'll generate it when you reach this step.

---

## Verify

- [ ] Open `https://dash.moximoxi.net` — dashboard loads
- [ ] Open `https://running.moximoxi.net` — WordPress still loads normally
- [ ] Confirm access from China — ask operator to test

---

## Cleanup

- [ ] Update dashboard URL in `docs/handoff/index.zh.md` — replace `http://13.192.170.85:3002` with `https://dash.moximoxi.net`
