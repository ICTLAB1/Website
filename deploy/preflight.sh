#!/usr/bin/env bash
#
# Is this deployment ready to be the real site?
#
#   cd /srv/techzoid/deploy
#   chmod +x preflight.sh
#   ./preflight.sh
#
# Run it twice: once before you move DNS, and once after.
#
# The trick that makes the first run worth anything is `curl --resolve`, which
# forces a request for techzoidtechnologies.com to the copy of Caddy on this
# machine regardless of where DNS currently points. So the real domain — its
# redirects, its canonical URLs, its sitemap — can be tested while the old site
# is still live and serving customers. Nothing here changes anything; every
# check is a read.
#
# The script works out for itself which run this is. Before the switch, a
# domain still pointing at the old server is expected and reported as such;
# afterwards the same finding is a failure.
#
# Exit code is 0 only when nothing FAILED. Warnings do not stop it: some of
# them are things you may have decided to live with, and the script does not
# get to overrule that.

set -uo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml"

pass=0 warn=0 fail=0
if [ -t 1 ]; then G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; B=$'\033[1m'; Z=$'\033[0m'
else G=""; Y=""; R=""; B=""; Z=""; fi

ok()   { pass=$((pass+1)); printf '  %sPASS%s  %s\n' "$G" "$Z" "$1"; }
warned() { warn=$((warn+1)); printf '  %sWARN%s  %s\n' "$Y" "$Z" "$1"; [ $# -gt 1 ] && printf '        %s\n' "$2"; }
bad()  { fail=$((fail+1)); printf '  %sFAIL%s  %s\n' "$R" "$Z" "$1"; [ $# -gt 1 ] && printf '        %s\n' "$2"; }
section() { printf '\n%s%s%s\n' "$B" "$1" "$Z"; }

# ─────────────────────────────────────────────────────── the configuration file
section "Configuration"

if [ ! -f .env ]; then
  bad ".env does not exist" "Copy .env.prod.example to .env and fill it in."
  exit 1
fi

# Read it without executing it: a value containing a backtick or \$(…) would
# otherwise run as a command, and this script is the last place that should be
# the first to notice.
getenv() {
  local key="$1"
  sed -n "s/^[[:space:]]*${key}=//p" .env | tail -n1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

SITE_DOMAIN="$(getenv SITE_DOMAIN)"
SITE_ADDRESS="$(getenv SITE_ADDRESS)"
SITE_REDIRECT_FROM="$(getenv SITE_REDIRECT_FROM)"
APP_URL="$(getenv APP_URL)"
TLS_EMAIL="$(getenv TLS_EMAIL)"
AUTH_SECRET="$(getenv AUTH_SECRET)"
POSTGRES_PASSWORD="$(getenv POSTGRES_PASSWORD)"
POSTGRES_USER="$(getenv POSTGRES_USER)"
POSTGRES_DB="$(getenv POSTGRES_DB)"
SEED_ADMIN_EMAIL="$(getenv SEED_ADMIN_EMAIL)"
SEED_ADMIN_PASSWORD="$(getenv SEED_ADMIN_PASSWORD)"
SMTP_HOST="$(getenv SMTP_HOST)"
MAIL_FROM="$(getenv MAIL_FROM)"

if [ -z "$SITE_DOMAIN" ]; then
  bad "SITE_DOMAIN is not set" "This is the one name the site calls itself. Nothing below can be checked without it."
  exit 1
fi

case "$SITE_DOMAIN" in
  http*|*/) bad "SITE_DOMAIN must be a bare name" "Got '$SITE_DOMAIN'. No https://, no trailing slash." ;;
  *.*)      ok  "the canonical name is $SITE_DOMAIN" ;;
  *)        bad "SITE_DOMAIN does not look like a domain" "Got '$SITE_DOMAIN'." ;;
esac

# The other name, taken from configuration rather than guessed.
#
# Which of `example.com` and `www.example.com` is canonical is a real decision —
# it changes every URL on the site and where search ranking accumulates — so it
# is stated in .env and read here. An earlier version inferred that the bare
# name was always canonical, which quietly made the choice for the operator.
#
# When there is only one name, as while testing on a subdomain,
# SITE_REDIRECT_FROM equals SITE_DOMAIN and every check about the second name is
# skipped and said to be.
ALTERNATE="$SITE_REDIRECT_FROM"
if [ -z "$ALTERNATE" ]; then
  bad "SITE_REDIRECT_FROM is not set" \
      "It names the other hostname, which redirects to $SITE_DOMAIN — or $SITE_DOMAIN itself when there is only one. Easiest fix: ./set-domain.sh $SITE_DOMAIN"
  ALTERNATE="$SITE_DOMAIN"
fi
if [ "$ALTERNATE" = "$SITE_DOMAIN" ]; then PAIRED=no; else PAIRED=yes; fi

# The check this script was written for.
#
# SITE_ADDRESS is the list of names Caddy serves and obtains certificates for.
# Going live by changing only SITE_DOMAIN — which is the obvious thing to do,
# and what an earlier version of the runbook said — leaves SITE_ADDRESS on
# whatever subdomain was used for testing. Caddy then serves that subdomain and
# nothing else, and the real domain answers with a certificate error on a name
# it was never asked to serve. The site is down and the logs look fine.
case ",${SITE_ADDRESS// /}," in
  *",${SITE_DOMAIN},"*) ok "Caddy is set to serve $SITE_DOMAIN" ;;
  *) bad "SITE_ADDRESS does not include $SITE_DOMAIN" \
        "It is currently '$SITE_ADDRESS'. Caddy serves only the names listed here, so the site would not answer on its own domain. Fix with: ./set-domain.sh $SITE_DOMAIN" ;;
esac

if [ "$PAIRED" = "no" ]; then
  printf '        %s\n' "only one name is configured, so the second-name checks do not apply"
else
  case ",${SITE_ADDRESS// /}," in
    *",${ALTERNATE},"*) ok "Caddy is set to serve $ALTERNATE, which redirects to $SITE_DOMAIN" ;;
    *) bad "SITE_ADDRESS does not include $ALTERNATE" \
          "It is currently '$SITE_ADDRESS'. The name that redirects needs a certificate of its own: a browser completes the TLS handshake before it ever sees a redirect, so a name Caddy does not serve shows a security warning instead of forwarding. Fix with: ./set-domain.sh $SITE_DOMAIN" ;;
  esac
fi

if [ "$APP_URL" = "https://${SITE_DOMAIN}" ]; then
  ok "APP_URL matches the domain"
else
  bad "APP_URL is '$APP_URL', not 'https://${SITE_DOMAIN}'" \
      "Canonical tags, the sitemap, Open Graph images and the redirect safety checks all read this. A mismatch shows up as quietly wrong links rather than as an error."
fi

case "$TLS_EMAIL" in
  ?*@?*.?*) ok "TLS_EMAIL is set" ;;
  *) bad "TLS_EMAIL is not a usable address" "Let's Encrypt writes here if a renewal ever fails. That is the warning you want to receive." ;;
esac

if [ ${#AUTH_SECRET} -ge 32 ]; then
  ok "AUTH_SECRET is set"
else
  bad "AUTH_SECRET is missing or too short" "Generate one with: openssl rand -base64 48"
fi

case "$POSTGRES_PASSWORD" in
  "") bad "POSTGRES_PASSWORD is not set" "Generate one with: openssl rand -hex 24" ;;
  *[/@:\#?]*) bad "POSTGRES_PASSWORD contains a character that breaks the connection URL" \
                  "A / @ : # or ? in it silently corrupts DATABASE_URL. Use: openssl rand -hex 24" ;;
  *) ok "POSTGRES_PASSWORD is set and URL-safe" ;;
esac

# The example file is in a public repository, so these two values are public.
case "$SEED_ADMIN_EMAIL" in
  ""|admin@example.test) bad "SEED_ADMIN_EMAIL is unset or still the public example value" ;;
  *) ok "SEED_ADMIN_EMAIL is your own address" ;;
esac
case "$SEED_ADMIN_PASSWORD" in
  ""|ChangeMe!Admin123) bad "SEED_ADMIN_PASSWORD is unset or still the public example value" \
                            "It is published in this repository's example file. Anyone can read it." ;;
  *) ok "SEED_ADMIN_PASSWORD is not the published example" ;;
esac

if [ -n "$SMTP_HOST" ] && [ -n "$MAIL_FROM" ]; then
  ok "Outbound email is configured ($SMTP_HOST)"
else
  warned "Outbound email is not configured" \
         "Enquiry confirmations, order confirmations and account verification links will be written to the container log instead of sent. Customers get nothing. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM."
fi

# ──────────────────────────────────────────────────────────────────────── DNS
section "DNS"

resolve() {
  if command -v dig >/dev/null 2>&1; then
    dig +short A "$1" | grep -E '^[0-9.]+$' | sort -u | tr '\n' ' '
  else
    getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' '
  fi
}

MY_IP="$(curl -fsS --max-time 6 https://api.ipify.org 2>/dev/null \
      || curl -fsS --max-time 6 https://ifconfig.me 2>/dev/null \
      || ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.*src \([0-9.]*\).*/\1/p')"

if [ -z "$MY_IP" ]; then
  warned "Could not determine this server's public IP address" \
         "The DNS checks below are skipped. Find it with: curl ifconfig.me"
  CANON_HERE="unknown"; ALT_HERE="unknown"
else
  printf '        this server is %s\n' "$MY_IP"
  CANON_IPS="$(resolve "$SITE_DOMAIN")"
  ALT_IPS="$(resolve "$ALTERNATE")"

  case " $CANON_IPS " in *" $MY_IP "*) CANON_HERE=yes ;; *) CANON_HERE=no ;; esac
  case " $ALT_IPS "  in *" $MY_IP "*) ALT_HERE=yes  ;; *) ALT_HERE=no  ;; esac
fi

# Which run is this? If the apex already points here the switch has happened,
# and anything still wrong is wrong now rather than pending.
if [ "$CANON_HERE" = "yes" ]; then LIVE=yes; else LIVE=no; fi

if [ "$CANON_HERE" = "yes" ]; then
  ok "$SITE_DOMAIN points at this server"
elif [ "$CANON_HERE" = "no" ]; then
  warned "$SITE_DOMAIN does not point here yet (currently ${CANON_IPS:-nothing})" \
         "Expected before the switch. This is the one record you change to go live."
fi

if [ "$PAIRED" = "no" ]; then
  : # only one name
elif [ "$ALT_HERE" = "yes" ]; then
  ok "$ALTERNATE points at this server"
elif [ "$ALT_HERE" = "no" ]; then
  if [ "$LIVE" = "yes" ]; then
    bad "$ALTERNATE does not point here, but $SITE_DOMAIN does (currently ${ALT_IPS:-nothing})" \
        "Visitors arriving on that name will reach the old server. If it is a CNAME to the other name it should have followed automatically; if it is its own A record, change it too."
  else
    warned "$ALTERNATE does not point here yet (currently ${ALT_IPS:-nothing})" \
           "Expected before the switch."
  fi
fi

# ────────────────────────────────────────────────────────────────── the stack
section "The stack"

# Can Compose read .env at all?
#
# Checked first, and fatally, because a single malformed line makes every
# Compose command fail — including the ones this section uses to ask whether the
# containers are running. The result was a report saying db, app and caddy were
# all down while `docker ps` showed three healthy containers, and a separate
# claim that the business details were unset, because the query that reads them
# also goes through Compose. Every one of those findings was wrong, and not one
# of them named the actual cause.
#
# The real case that produced this: a `www.` split across two lines by a
# terminal wrapping a long paste, leaving `w.example.com"` orphaned at the top
# of the file. Compose reported it exactly and nothing else did.
if ! compose_error="$($COMPOSE config --quiet 2>&1)"; then
  bad "docker compose cannot read this deployment's configuration" \
      "${compose_error:-see: $COMPOSE config}"
  printf '        %s\n' "Every check below depends on Compose, so they would all report failure"
  printf '        %s\n' "for this one reason. Fix the line named above and run this again."
  section "Result"
  printf '  %s%d passed%s, %s%d warnings%s, %s%d failed%s\n' "$G" "$pass" "$Z" "$Y" "$warn" "$Z" "$R" "$fail" "$Z"
  printf '\n  Stopping here rather than reporting %d misleading failures.\n\n' 20
  exit 1
fi

# `docker compose ps -q <service>` rather than `--status running --services`.
#
# The latter is not accepted by every Compose 2.x, and when it is rejected the
# error goes to stderr, the output is empty, and every service reads as not
# running. Asking for the container id and then asking Docker about its state
# behaves the same way on every version.
running() {
  local id
  id="$($COMPOSE ps -q "$1" 2>/dev/null | head -n1)"
  [ -n "$id" ] && [ "$(docker inspect -f '{{.State.Running}}' "$id" 2>/dev/null)" = "true" ]
}
for service in db app caddy; do
  if running "$service"; then ok "$service is running"; else bad "$service is not running" "Start it with: $COMPOSE up -d"; fi
done

health="$($COMPOSE exec -T app node -e \
  "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(t=>console.log(t)).catch(e=>console.log('unreachable'))" 2>/dev/null | tail -n1)"
case "$health" in
  *'"ok"'*) ok "The app is serving and can reach its database" ;;
  *'degraded'*) bad "The app is running but cannot reach its database" "See: $COMPOSE logs app" ;;
  *) bad "The app did not answer its own health check" "See: $COMPOSE logs app" ;;
esac

# ────────────────────────────────────────────── the real domain, through Caddy
section "The site, on its real name"

# How the site is reached depends on whether DNS has moved, and the reason is
# not obvious.
#
# `curl --resolve` forces a request for the real domain to this machine
# whatever DNS says, which is what makes a pre-switch test possible at all. Over
# HTTPS it is not enough. Caddy obtains a certificate from Let's Encrypt, which
# proves control of a name by resolving it — so before the switch there is no
# certificate for this name and there cannot be one. A TLS handshake for it
# fails outright, and `-k` does not help: it skips *validating* a certificate,
# and here the server has none to present. An earlier version of this script
# tried exactly that and reported eight failures for a deployment that was
# entirely correct.
#
# So before the switch the application is asked directly, inside the compose
# network, over plain HTTP. That covers everything that actually depends on
# configuration — the canonical URLs, the sitemap's host, robots.txt, the old
# site's redirects — because all of them come from APP_URL and from the app.
# What it cannot cover is Caddy's part: serving both names and holding
# certificates for them. That is checked on the run after the switch, which is
# the first moment it can be true.
if [ "$LIVE" = "yes" ]; then
  printf '        %s\n' "DNS points here, so this is the real thing: through Caddy, over HTTPS"
else
  printf '        %s\n' "DNS has not moved yet, so Caddy cannot hold a certificate for this name"
  printf '        %s\n' "and an HTTPS request to it cannot succeed. Asking the application"
  printf '        %s\n' "directly instead; the HTTPS and certificate checks run after the switch."
fi

# `<code> <redirect-location>` for a path on the site.
site_code() {
  local path="$1"
  if [ "$LIVE" = "yes" ]; then
    curl -sS -o /dev/null -m 20 --resolve "${SITE_DOMAIN}:443:127.0.0.1" \
      -w '%{http_code} %{redirect_url}' "https://${SITE_DOMAIN}${path}" 2>/dev/null
  else
    $COMPOSE exec -T app node -e "
      fetch('http://127.0.0.1:3000' + process.argv[1], { redirect: 'manual' })
        .then((r) => console.log(r.status + ' ' + (r.headers.get('location') || '')))
        .catch(() => console.log('000 '))
    " "$path" 2>/dev/null | tail -n1
  fi
}

site_body() {
  local path="$1"
  if [ "$LIVE" = "yes" ]; then
    curl -sS -m 20 --resolve "${SITE_DOMAIN}:443:127.0.0.1" "https://${SITE_DOMAIN}${path}" 2>/dev/null
  else
    $COMPOSE exec -T app node -e "
      fetch('http://127.0.0.1:3000' + process.argv[1])
        .then((r) => r.text())
        .then((t) => process.stdout.write(t))
        .catch(() => {})
    " "$path" 2>/dev/null
  fi
}

read -r apex_code _ <<<"$(site_code "/")"
if [ "$apex_code" = "200" ]; then
  if [ "$LIVE" = "yes" ]; then ok "https://${SITE_DOMAIN}/ answers 200"; else ok "the application answers 200"; fi
else
  if [ "$LIVE" = "yes" ]; then
    bad "https://${SITE_DOMAIN}/ answered ${apex_code:-nothing}" \
        "Caddy is not serving this name. Check SITE_ADDRESS above and: $COMPOSE logs caddy"
  else
    bad "the application answered ${apex_code:-nothing}" "See: $COMPOSE logs app"
  fi
fi

# Caddy's own job: serving www so it can redirect. Only testable once DNS moved.
if [ "$PAIRED" = "yes" ] && [ "$LIVE" = "yes" ]; then
  read -r alt_code alt_redirect <<<"$(curl -sS -o /dev/null -m 20 \
    --resolve "${ALTERNATE}:443:127.0.0.1" -w '%{http_code} %{redirect_url}' "https://${ALTERNATE}/" 2>/dev/null)"
  if [ "$alt_code" = "301" ] && [ "$alt_redirect" = "https://${SITE_DOMAIN}/" ]; then
    ok "https://${ALTERNATE}/ redirects permanently to https://${SITE_DOMAIN}/"
  elif [ "$alt_code" = "200" ]; then
    bad "https://${ALTERNATE}/ serves the site instead of redirecting" \
        "Two addresses for every page splits search ranking between them and makes the canonical tags wrong."
  else
    bad "https://${ALTERNATE}/ answered ${alt_code:-nothing}" \
        "Visitors arriving on that name would see an error. Check that SITE_ADDRESS lists $ALTERNATE."
  fi
fi

# Plain HTTP needs no certificate, so this one is honest in both states.
read -r plain_code _ <<<"$(curl -sS -o /dev/null -m 20 \
  --resolve "${SITE_DOMAIN}:80:127.0.0.1" -w '%{http_code} %{redirect_url}' \
  "http://${SITE_DOMAIN}/" 2>/dev/null)"
case "$plain_code" in
  30*) ok "http:// redirects to https://" ;;
  *) bad "http://${SITE_DOMAIN}/ answered ${plain_code:-nothing} instead of redirecting to https" ;;
esac

if [ "$LIVE" = "yes" ]; then
  names=("$SITE_DOMAIN")
  [ "$PAIRED" = "yes" ] && names+=("$ALTERNATE")
  for name in "${names[@]}"; do
    if curl -sS -o /dev/null -m 20 --resolve "${name}:443:127.0.0.1" "https://${name}/" 2>/dev/null; then
      ok "the certificate for ${name} is valid and trusted"
    else
      bad "the certificate for ${name} is missing or not trusted" \
          "Caddy obtains it on the first request after DNS resolves here; give it a minute, then: $COMPOSE logs caddy"
    fi
  done
fi

# ──────────────────────────────────────────────────── what the site says it is
section "Canonical URLs"

sitemap="$(site_body /sitemap.xml)"
url_count="$(printf '%s' "$sitemap" | grep -c '<loc>')"

if [ "$url_count" -gt 20 ]; then
  ok "the sitemap lists ${url_count} pages"
else
  bad "the sitemap lists only ${url_count} pages" "Something is wrong with the content, or the request did not reach the app."
fi

# Only meaningful when there is something to check. An empty sitemap satisfies
# "every URL uses the right host" vacuously, and reporting that as a pass beside
# the failure above would be the script contradicting itself.
stale="$(printf '%s' "$sitemap" | grep -o '<loc>https\?://[^<]*' | grep -v "//${SITE_DOMAIN}" | head -n3)"
if [ "$url_count" -eq 0 ]; then
  : # already failed above; nothing to say
elif [ -z "$stale" ]; then
  ok "every sitemap URL uses ${SITE_DOMAIN}"
else
  bad "the sitemap still points at another host" \
      "For example: $(printf '%s' "$stale" | head -n1 | sed 's/<loc>//'). APP_URL is what produces these; correct it and restart the app."
fi

robots="$(site_body /robots.txt)"
robots_sitemap="$(printf '%s' "$robots" | grep -i '^[[:space:]]*sitemap:' | head -n1 | sed 's/^[[:space:]]*[Ss]itemap:[[:space:]]*//')"

# Three outcomes, each reported for what it is. An earlier version said only
# "does not point at …", which is the least useful thing it could have said:
# a robots.txt that failed to fetch, one with no Sitemap line, and one naming
# the wrong host are three different problems with three different fixes, and
# they were indistinguishable.
if [ -z "$robots" ]; then
  bad "robots.txt could not be fetched" "The request returned nothing. Try: curl -sS https://${SITE_DOMAIN}/robots.txt"
elif [ -z "$robots_sitemap" ]; then
  bad "robots.txt has no Sitemap line" "It fetched $(printf '%s' "$robots" | wc -l) lines but none of them names a sitemap."
elif [ "$robots_sitemap" = "https://${SITE_DOMAIN}/sitemap.xml" ]; then
  ok "robots.txt points at the sitemap on this domain"
else
  bad "robots.txt names the wrong sitemap URL" \
      "It says '${robots_sitemap}' and should say 'https://${SITE_DOMAIN}/sitemap.xml'. APP_URL is what produces this."
fi

# ────────────────────────────────────────────── the old site's URLs still work
section "The old site's URLs"

# Only a sample. The full mapping is section 6 of README.md, and the paths a
# WordPress or WooCommerce site typically uses are already in next.config.ts —
# but a redirect that is configured and not actually reachable is worse than
# none, because nobody checks it again.
redirect_ok() {
  local from="$1" to="$2"
  read -r c r <<<"$(site_code "$from")"
  # Compare the path only. Asked directly, the app builds its Location header
  # from the request host, so it says 127.0.0.1:3000 — correct, and not the
  # public origin. The path is the part that carries the meaning.
  local landed
  landed="$(printf '%s' "$r" | sed -E 's#^[a-z]+://[^/]+##')"
  case "$c" in
    30*) if [ "$landed" = "$to" ]; then ok "${from} → ${to}"; else warned "${from} redirects to ${landed:-nothing}, not ${to}"; fi ;;
    *) bad "${from} answered ${c:-nothing} instead of redirecting to ${to}" ;;
  esac
}
redirect_ok /shop /products
redirect_ok /my-account /account
redirect_ok /contact-us /contact
redirect_ok /privacy-policy /privacy

# ───────────────────────────────────────────────── legally required to publish
section "Business details the site is required to publish"

# Read the same way the site reads them: the stored value wins, and an empty
# one falls back to the environment. Mirrors getSiteConfig in
# src/lib/site-config.ts — if that rule ever changes, this must change with it.
stored() {
  $COMPOSE exec -T db psql -tA -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "select coalesce(\"$1\", '') from \"SiteSettings\" where id='singleton'" 2>/dev/null | tr -d '\r' | head -n1
}
effective() {
  local value; value="$(stored "$1")"
  [ -n "$value" ] && { printf '%s' "$value"; return; }
  getenv "$2"
}

check_detail() {
  local label="$1" column="$2" envkey="$3" why="$4"
  if [ -n "$(effective "$column" "$envkey")" ]; then ok "$label is published"; else bad "$label is not set" "$why"; fi
}

check_detail "The grievance officer" grievanceName COMPANY_GRIEVANCE_OFFICER_NAME \
  "An online seller in India must publish a named officer and a way to reach them. Until it is set, that section of the legal pages renders nothing at all. Set it at https://${SITE_DOMAIN}/admin/settings."
check_detail "The grievance officer's email" grievanceEmail COMPANY_GRIEVANCE_OFFICER_EMAIL \
  "Set it at https://${SITE_DOMAIN}/admin/settings."
check_detail "The GSTIN" gstin COMPANY_GSTIN \
  "A registered business must show it on the site and on its invoices. Set it at https://${SITE_DOMAIN}/admin/settings."
check_detail "The registered address" addressLine1 COMPANY_ADDRESS_LINE1 \
  "Set it at https://${SITE_DOMAIN}/admin/settings."
check_detail "A sales email address" emailSales COMPANY_EMAIL_SALES \
  "Set it at https://${SITE_DOMAIN}/admin/settings."
check_detail "A sales phone number" phoneSales COMPANY_PHONE_SALES \
  "Set it at https://${SITE_DOMAIN}/admin/settings."

# ───────────────────────────────────────────────────────── the first password
section "The administrator account"

# The only way to know whether the seeded password was ever changed is to try
# it. One request, from inside the network, and the session it might create is
# never used.
if [ -n "$SEED_ADMIN_EMAIL" ] && [ -n "$SEED_ADMIN_PASSWORD" ]; then
  login="$($COMPOSE exec -T app node -e "
    fetch('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: process.argv[1], password: process.argv[2] }),
    }).then(r => console.log(r.status)).catch(() => console.log('error'))
  " "$SEED_ADMIN_EMAIL" "$SEED_ADMIN_PASSWORD" 2>/dev/null | tail -n1)"

  case "$login" in
    2*) bad "the administrator password is still the one in .env" \
            "It has sat in a file on this server, in your shell history and possibly in a chat window. Sign in and change it at https://${SITE_DOMAIN}/account." ;;
    4*) ok "the administrator password has been changed from the seeded one" ;;
    *)  warned "could not check the administrator password (login returned '${login:-nothing}')" ;;
  esac
fi

# ──────────────────────────────────────────────────────────────────── verdict
section "Result"
printf '  %s%d passed%s, %s%d warnings%s, %s%d failed%s\n' "$G" "$pass" "$Z" "$Y" "$warn" "$Z" "$R" "$fail" "$Z"

if [ "$fail" -gt 0 ]; then
  printf '\n  Fix the failures above before moving DNS.\n\n'
  exit 1
fi

if [ "$LIVE" = "yes" ]; then
  printf '\n  %sThe site is live on %s.%s\n\n' "$G" "$SITE_DOMAIN" "$Z"
else
  printf '\n  %sReady.%s Point the A record for @ at %s, wait for it to propagate,\n' "$G" "$Z" "${MY_IP:-this server}"
  printf '  then run this again. Rolling back is the same record, pointed back.\n\n'
fi
exit 0
