# Publishing the site

A runbook for putting this on one virtual machine, behind automatic HTTPS,
replacing the site currently on the domain.

The order below matters. It puts the new site on a subdomain first, so
everything can be checked against the real domain and a real certificate before
anything customers see changes. The switch at the end is a DNS change that
takes minutes and is reversible in minutes.

---

## 1. A server

Any provider with a region in India — the privacy policy commits to keeping
personal data here, and a server in Bangalore or Mumbai is also simply faster
for Indian customers.

| | |
| --- | --- |
| **Size** | 2 vCPU, 4 GB RAM, 50 GB disk is comfortable. 2 GB works but leaves little room for the build. |
| **Region** | DigitalOcean Bangalore (BLR1), AWS Mumbai (ap-south-1), or an equivalent. |
| **Image** | Ubuntu 24.04 LTS. |
| **Cost** | Roughly ₹1,500–2,500 a month. |

Then, as root on the new machine:

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# A user that is not root
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Only SSH and the web are reachable
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# Refuse password logins and root logins over SSH
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Confirm you can still log in as `deploy` **in a second terminal** before
closing the first. Locking yourself out of a fresh server is recoverable; it is
just tedious.

---

## 2. The code and the configuration

As `deploy`:

```bash
git clone https://github.com/ICTLAB1/Website.git /srv/techzoid
cd /srv/techzoid/deploy
cp .env.prod.example .env

# Generate the two secrets. POSTGRES_PASSWORD is hex rather than base64 on
# purpose: it is substituted into a connection URL, and a `/` in it would
# break that URL in a way whose error message points nowhere near the cause.
echo "AUTH_SECRET=\"$(openssl rand -base64 48)\""
echo "POSTGRES_PASSWORD=\"$(openssl rand -hex 24)\""
```

Edit `.env` and fill it in. While testing, point all three domain settings at a
subdomain — the example file ships with the live values, so all three need
changing:

```
SITE_DOMAIN="new.techzoidtechnologies.com"
SITE_ADDRESS="new.techzoidtechnologies.com"
APP_URL="https://new.techzoidtechnologies.com"
```

`SITE_ADDRESS` has no `www.` while testing. There is no
`www.new.techzoidtechnologies.com` record and there never will be, and listing
a name that does not resolve leaves Caddy chasing a certificate for it forever.
On the real domain it gains `www`; section 7 covers that.

Set a real `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` **now**, before the
first start. They create the first administrator, and the values in the
repository's example file are public.

---

## 3. DNS for the subdomain

At your domain registrar, add one record:

| Type | Name | Value |
| --- | --- | --- |
| A | `new` | the server's IP address |

Nothing about the live site changes. Wait until `dig +short new.techzoidtechnologies.com`
returns the new IP before continuing — Caddy cannot obtain a certificate until
the name resolves here.

---

## 4. Start it

```bash
cd /srv/techzoid/deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
```

The first build takes several minutes. Watch for, in order: the database
becoming healthy, migrations applying, `empty database, seeding catalogue and
content`, `starting`, and Caddy reporting a certificate obtained.

Then open `https://new.techzoidtechnologies.com`.

---

## 5. Check it before anyone else sees it

First, the checks a script can make for you:

```bash
cd /srv/techzoid/deploy
chmod +x preflight.sh
./preflight.sh
```

On the subdomain it verifies the configuration is internally consistent, the
three containers are up, the app can reach its database, the site answers over
HTTPS, the sitemap and `robots.txt` name the right host, the old site's URLs
redirect, and the business details you are required to publish are set. It
knows it is looking at a subdomain and skips the www checks accordingly.

Then work through the rest by hand, on the real subdomain and not on a laptop:

- [ ] The home page, catalogue, a product page, and a brand page.
- [ ] Submit an enquiry as a customer. It should arrive by email — if SMTP is
      unset it goes to the container log instead, which tells you SMTP is unset.
- [ ] Sign in at `/admin` with the credentials from `.env`. Change the password.
- [ ] Edit a page in the admin panel and confirm the public page changes
      without a restart.
- [ ] `https://new.techzoidtechnologies.com/sitemap.xml` lists your pages.
- [ ] The admin dashboard's missing-configuration list is empty, or you know
      why each remaining item is still there. Everything on it except the
      company name and tagline is editable at `/admin/settings` — contact
      details, registered address, GSTIN, CIN and the grievance officer — and
      saving takes effect on the public site immediately.
- [ ] Appoint a grievance officer at `/admin/settings`. Publishing a named
      officer and their contact details is required of an online seller in
      India. Until it is set, the grievance section of the legal pages renders
      nothing at all — silently, which is the right behaviour for a visitor,
      and still a gap you need to close.
- [ ] Work through `docs/legal-review-checklist.md` with your adviser. It lists
      the clauses in the five legal documents that are commercial decisions
      rather than legal requirements — payment terms, the liability cap, the
      refund window. Every one is editable in the admin panel without a deploy.

Nothing here is optional except the last item's timing. The legal documents
carry no visible draft notice: a warning block addressed to a reviewer used to
open each of them, which every customer read, and which made finished documents
look provisional. What it said now lives in that checklist instead. Each page
prints an effective and a last-updated date taken from the page record, so an
edit made after the review moves the date on its own.

---

## 6. Keeping the old site's URLs working

This is the part of a cutover that quietly costs the most if it is skipped:
every URL the old site had that search engines and other people's links still
point at.

**Find them first.** From Google Search Console for the domain, export the
pages with impressions over the last twelve months. If you do not have Search
Console set up, crawl the current site — `wget --spider -r -l 5` produces a
usable list — or ask whoever built it for a sitemap.

**Then map them.** `next.config.ts` already redirects the paths a
WordPress or WooCommerce site typically uses:

```
/shop, /shop/*        → /products
/product/:slug        → /products/:slug
/category/:slug       → /products
/brand/:slug          → /brands/:slug
/cart, /checkout      → /enquiry
/my-account           → /account
/about-us             → /about
/contact-us           → /contact
/privacy-policy       → /privacy
/terms-and-conditions → /terms
/index.php, /index.html, /home → /
```

Anything the old site had beyond that needs adding to the `redirects()` list in
`next.config.ts`. That is a code change and a rebuild — a few minutes, but not
something a non-developer can do from the admin panel. If the old site has many
one-off URLs, say so and a database-backed redirect table would be worth
building instead.

**Send the ones you cannot map to something sensible**, not to the home page.
A customer looking for a discontinued product is better served by the category
than by the front door.

---

## 7. The switch

The order matters here more than anywhere else in this runbook. **The server is
reconfigured for the real domain first, and DNS moves last.** Doing it the other
way round means the domain points at a server that is not yet expecting it, and
customers see a certificate warning during the gap.

### 7a. Reconfigure the server

Change **three** values in `.env`, not two. Rather than editing by hand, run
this — each line is a complete command, so nothing breaks if your terminal
wraps a long paste:

```bash
cd /srv/techzoid/deploy
cp .env .env.backup
grep -vE '^[[:space:]]*(export[[:space:]]+)?(SITE_DOMAIN|SITE_ADDRESS|APP_URL)=' .env.backup > .env
echo 'SITE_DOMAIN="techzoidtechnologies.com"' >> .env
echo 'SITE_ADDRESS="techzoidtechnologies.com, www.techzoidtechnologies.com"' >> .env
echo 'APP_URL="https://techzoidtechnologies.com"' >> .env
docker compose -f docker-compose.prod.yml config --quiet && echo "ENV IS VALID"
```

That last line matters. A `.env` Compose cannot parse makes *every* Compose
command fail, so the stack silently keeps running its previous configuration
while every command you type appears to do nothing. It has happened once
already, from a `www.` split across two lines by a terminal wrapping a paste —
`preflight.sh` now checks for it first and reports it rather than letting it
surface as twenty unrelated failures.

`SITE_ADDRESS` is the one that is easy to miss and expensive to miss. It is the
list of names Caddy actually serves and obtains certificates for. Leave it on
the test subdomain and Caddy serves the subdomain and nothing else: the real
domain answers with a certificate error, for a name it was never asked to
serve, while the logs look entirely healthy. Both names belong in the list —
`www` is served so that it can redirect, and it cannot redirect without a
certificate of its own.

Then:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 7b. Prove it before anyone can see it

```bash
./preflight.sh
```

This is the point of the script. It forces requests for
`techzoidtechnologies.com` to the copy of Caddy on this machine regardless of
where DNS currently points, so the real domain — its redirects, its canonical
URLs, its sitemap, the old site's URLs — is tested while the old site is still
live and serving customers. Everything it does is a read; it changes nothing.

It also checks the things that are quietly wrong rather than obviously broken:
`APP_URL` disagreeing with `SITE_DOMAIN`, a sitemap still advertising the test
subdomain, the seeded administrator password never having been changed, and the
business details an Indian online seller is required to publish.

Do not move DNS until it exits without failures.

### 7c. Move DNS

1. Lower the TTL on the domain's existing `A` record to 300 seconds, and wait
   for the old TTL to expire. This is what makes the switch — and any rollback
   — take minutes rather than hours.
2. Point the `A` record for `@` at the new server.
3. `www` needs changing **only if it is its own A record**. If it is a CNAME to
   the bare name, as it is on this domain today, it follows automatically.
   Check with `dig www.techzoidtechnologies.com` before assuming either way.
4. Watch `docker compose -f docker-compose.prod.yml logs -f caddy` for the
   certificate being issued. It happens on the first request after DNS
   propagates, for each name in `SITE_ADDRESS`.

### 7d. Confirm

```bash
./preflight.sh
```

The second run notices that DNS now points here and checks what it could not
check before: that the certificates for both names are real and trusted, and
that `www` genuinely redirects to the bare name rather than serving a second
copy of the site.

Then, by hand: submit one real enquiry end to end and confirm the confirmation
email arrives. Raise the TTL back to 3600 once you are confident.

**To roll back**, point the A record back at the old server. Nothing on the new
one is destroyed, and the database keeps whatever came in while it was live.

Afterwards: resubmit the sitemap in Search Console, and keep the old server
running for a couple of weeks in case something turns out to have been missed.

---

## 8. Backups

The catalogue and every page can be rebuilt from this repository. Enquiries,
quotations, orders, licences and customer accounts cannot — they exist only in
the database.

```bash
cd /srv/techzoid/deploy
chmod +x backup.sh
./backup.sh                     # check it works
crontab -e
```

```
0 2 * * *  cd /srv/techzoid/deploy && ./backup.sh >> backup.log 2>&1
```

That keeps fourteen daily dumps in `deploy/backups`, and refuses to rotate if a
dump comes out looking incomplete. Copy them off the machine as well — a backup
on the same disk as the database is not a backup. Any object storage with an
India region will do.

**Restore one occasionally.** A backup nobody has restored is a hope, not a
backup; `backup.sh` has the commands in its header.

---

## 9. Updating the site

```bash
cd /srv/techzoid
git pull
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
```

Migrations apply automatically on start, and the seed does not run again
because the database is no longer empty — so content edited in the admin panel
survives a deploy.

Content changes made in the admin panel do not need any of this. They are live
the moment they are saved.

If you want the repository's seed file to reflect content edited in production,
run `npm run content:export` against that database and commit the result.

### When a release corrects seeded copy

That "the seed does not run again" is right — it is what stops a redeploy
overwriting work done in the admin panel. It also means a release that corrects
*seeded* copy reaches an already-running deployment as new code and old text.
Wording fixes, removed blocks and rewritten page descriptions all live in rows,
not in the bundle.

One release so far is in that position: the audit that replaced the ambiguous
supplier terminology, removed the "Awaiting legal review" notices from the five
legal documents, dropped the duplicated product grid from the home page, and
shortened four meta descriptions. To apply it to a deployment that was already
running before that release:

```bash
cd /srv/techzoid/deploy
docker compose -f docker-compose.prod.yml exec app \
  node scripts/audit/apply-content-fixes.mjs
docker compose -f docker-compose.prod.yml restart app
```

**The restart is not optional.** Page content is cached under tags that are
invalidated when the admin panel writes; a script writing straight to the
database cannot invalidate anything, so without a restart the old text keeps
being served until each cache entry ages out — which looks exactly like the
script having done nothing.

Every step is idempotent and prints what it changed, so running it twice is
safe, and running it on a database seeded from this release is a no-op that
says so. It never touches a page you have edited yourself: each change is
matched against the exact text it expects to replace, and anything that has
moved on is reported and left alone.

---

## Housekeeping

Two functions are safe to run on a schedule, and neither is a correctness
requirement — expiry is also checked at the moment a customer responds:

- `purgeExpiredSessions()` in `src/lib/auth/session.ts`
- `expireStaleQuotes()` in `src/lib/quote-service.ts`
