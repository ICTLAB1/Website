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
  www.*)    bad "SITE_DOMAIN must not start with www" "Got '$SITE_DOMAIN'. Set the bare name; www is served and redirected to it." ;;
  *.*)      ok  "SITE_DOMAIN is $SITE_DOMAIN" ;;
  *)        bad "SITE_DOMAIN does not look like a domain" "Got '$SITE_DOMAIN'." ;;
esac

WWW="www.${SITE_DOMAIN}"

# Is this the real domain, or the subdomain used for testing?
#
# It changes what the www checks mean. On `techzoidtechnologies.com`, a missing
# `www.techzoidtechnologies.com` is a failure — visitors type it. On
# `new.techzoidtechnologies.com`, `www.new.techzoidtechnologies.com` is a name
# nobody will ever type and which has no DNS record; demanding it would have
# Caddy chase a certificate forever, which is precisely what the Caddyfile
# warns about. So on a subdomain the www checks are skipped, and said to be.
#
# Two labels is an apex. Three is normally a subdomain, except where the
# registry sells names one level down — .co.in and .co.uk being the two this
# business is most likely to meet.
label_count="$(printf '%s' "$SITE_DOMAIN" | tr '.' '\n' | grep -c .)"
second_level="$(printf '%s' "$SITE_DOMAIN" | rev | cut -d. -f2 | rev)"
case "$label_count:$second_level" in
  2:*) APEX=yes ;;
  3:co|3:com|3:net|3:org|3:gov|3:edu|3:ac|3:firm|3:gen|3:ind|3:res) APEX=yes ;;
  *) APEX=no ;;
esac

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
        "It is currently '$SITE_ADDRESS'. Caddy serves only the names listed here, so the site would not answer on its own domain." ;;
esac

if [ "$APEX" = "no" ]; then
  printf '        %s\n' "$SITE_DOMAIN is a subdomain, so the www checks do not apply"
else
  case ",${SITE_ADDRESS// /}," in
    *",${WWW},"*) ok "Caddy is set to serve $WWW" ;;
    *) bad "SITE_ADDRESS does not include $WWW" \
          "It is currently '$SITE_ADDRESS'. Visitors do type www, and if the www record is a CNAME to the bare name it will arrive here whether Caddy expects it or not — and get a certificate warning. Set SITE_ADDRESS=\"$SITE_DOMAIN, $WWW\"." ;;
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
  APEX_HERE="unknown"; WWW_HERE="unknown"
else
  printf '        this server is %s\n' "$MY_IP"
  APEX_IPS="$(resolve "$SITE_DOMAIN")"
  WWW_IPS="$(resolve "$WWW")"

  case " $APEX_IPS " in *" $MY_IP "*) APEX_HERE=yes ;; *) APEX_HERE=no ;; esac
  case " $WWW_IPS "  in *" $MY_IP "*) WWW_HERE=yes  ;; *) WWW_HERE=no  ;; esac
fi

# Which run is this? If the apex already points here the switch has happened,
# and anything still wrong is wrong now rather than pending.
if [ "$APEX_HERE" = "yes" ]; then LIVE=yes; else LIVE=no; fi

if [ "$APEX_HERE" = "yes" ]; then
  ok "$SITE_DOMAIN points at this server"
elif [ "$APEX_HERE" = "no" ]; then
  warned "$SITE_DOMAIN does not point here yet (currently ${APEX_IPS:-nothing})" \
         "Expected before the switch. This is the one record you change to go live."
fi

if [ "$APEX" = "no" ]; then
  : # a subdomain has no www to check
elif [ "$WWW_HERE" = "yes" ]; then
  ok "$WWW points at this server"
elif [ "$WWW_HERE" = "no" ]; then
  if [ "$LIVE" = "yes" ]; then
    bad "$WWW does not point here, but $SITE_DOMAIN does (currently ${WWW_IPS:-nothing})" \
        "Visitors who type www will reach the old server. If www is a CNAME to the bare name it should have followed automatically; if it is its own A record, change it too."
  else
    warned "$WWW does not point here yet (currently ${WWW_IPS:-nothing})" \
           "Expected before the switch."
  fi
fi

# ────────────────────────────────────────────────────────────────── the stack
section "The stack"

running() { $COMPOSE ps --status running --services 2>/dev/null | grep -qx "$1"; }
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

# Force the request to this machine whatever DNS says. Before the switch that
# is the only way to test the real domain at all; after it, it removes any
# doubt about which server answered.
#
# Caddy cannot hold a certificate for a name that does not resolve here yet, so
# before the switch the certificate is genuinely absent, and verifying it would
# only restate what the DNS section already said. `-k` skips that one check
# until the run after the switch. Everything else — routing, redirects,
# canonical URLs — is real now and worth proving now.
INSECURE=()
if [ "$LIVE" != "yes" ]; then
  INSECURE=(-k)
  printf '        %s\n' "certificate checks deferred: they need DNS pointing here first"
fi

fetch() {
  local url="$1" host="$2"
  curl -sS --max-time 20 "${INSECURE[@]}" \
    --resolve "${host}:443:127.0.0.1" --resolve "${host}:80:127.0.0.1" "$url" 2>/dev/null
}
code_of() {
  local url="$1" host="$2"
  curl -sS -o /dev/null -m 20 "${INSECURE[@]}" \
    --resolve "${host}:443:127.0.0.1" --resolve "${host}:80:127.0.0.1" \
    -w '%{http_code} %{redirect_url}' "$url" 2>/dev/null
}

read -r apex_code apex_redirect <<<"$(code_of "https://${SITE_DOMAIN}/" "$SITE_DOMAIN")"
if [ "$apex_code" = "200" ]; then
  ok "https://${SITE_DOMAIN}/ answers 200"
else
  bad "https://${SITE_DOMAIN}/ answered ${apex_code:-nothing}" "Caddy is not serving this name. Check SITE_ADDRESS above and: $COMPOSE logs caddy"
fi

read -r www_code www_redirect <<<"$(code_of "https://${WWW}/" "$WWW")"
if [ "$APEX" = "no" ]; then
  : # no www on a subdomain
elif [ "$www_code" = "301" ] && [ "$www_redirect" = "https://${SITE_DOMAIN}/" ]; then
  ok "https://${WWW}/ redirects permanently to https://${SITE_DOMAIN}/"
elif [ "$www_code" = "200" ]; then
  bad "https://${WWW}/ serves the site instead of redirecting" \
      "Two addresses for every page splits search ranking between them and makes the canonical tags wrong."
else
  bad "https://${WWW}/ answered ${www_code:-nothing}" \
      "Visitors who type www would see an error. Check that SITE_ADDRESS lists $WWW."
fi

read -r plain_code plain_redirect <<<"$(code_of "http://${SITE_DOMAIN}/" "$SITE_DOMAIN")"
case "$plain_code" in
  30*) ok "http:// redirects to https://" ;;
  *) bad "http://${SITE_DOMAIN}/ answered ${plain_code:-nothing} instead of redirecting to https" ;;
esac

if [ "$LIVE" = "yes" ]; then
  names=("$SITE_DOMAIN")
  [ "$APEX" = "yes" ] && names+=("$WWW")
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

sitemap="$(fetch "https://${SITE_DOMAIN}/sitemap.xml" "$SITE_DOMAIN")"
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

robots="$(fetch "https://${SITE_DOMAIN}/robots.txt" "$SITE_DOMAIN")"
if printf '%s' "$robots" | grep -qi "sitemap:.*${SITE_DOMAIN}/sitemap.xml"; then
  ok "robots.txt points at the sitemap on this domain"
else
  bad "robots.txt does not point at https://${SITE_DOMAIN}/sitemap.xml"
fi

# ────────────────────────────────────────────── the old site's URLs still work
section "The old site's URLs"

# Only a sample. The full mapping is section 6 of README.md, and the paths a
# WordPress or WooCommerce site typically uses are already in next.config.ts —
# but a redirect that is configured and not actually reachable is worse than
# none, because nobody checks it again.
redirect_ok() {
  local from="$1" to="$2"
  read -r c r <<<"$(code_of "https://${SITE_DOMAIN}${from}" "$SITE_DOMAIN")"
  case "$c" in
    30*) if [ "$r" = "https://${SITE_DOMAIN}${to}" ]; then ok "${from} → ${to}"; else warned "${from} redirects to ${r#https://$SITE_DOMAIN}, not ${to}"; fi ;;
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
