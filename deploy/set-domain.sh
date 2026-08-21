#!/usr/bin/env bash
#
# Point this deployment at a domain.
#
#   ./set-domain.sh www.techzoidtechnologies.com     # live, www is canonical
#   ./set-domain.sh techzoidtechnologies.com         # live, bare is canonical
#   ./set-domain.sh new.techzoidtechnologies.com     # testing on a subdomain
#
# Four settings have to agree with each other, and getting one wrong produces a
# site that is down with nothing in the logs looking wrong. Worse, they are long
# values, and a terminal wrapping a long paste has already put half a hostname
# on its own line at the top of a .env — after which `docker compose` refused to
# read the file at all and every command anybody typed silently did nothing.
#
# So this takes one short argument, works the four values out, writes them, and
# refuses to leave a file Compose cannot read. Nothing long is ever typed.
#
#   SITE_DOMAIN         the canonical name: search results, links, sitemap
#   SITE_REDIRECT_FROM  the other name, which permanently redirects to it
#   SITE_ADDRESS        every name Caddy serves and holds a certificate for
#   APP_URL             https:// plus the canonical name
#
# Which name is canonical is your choice and this script takes it from the
# argument rather than deciding for you. Both keep working either way; only the
# direction of the redirect changes.

set -uo pipefail
cd "$(dirname "$0")"

if [ -t 1 ]; then G=$'\033[32m'; R=$'\033[31m'; B=$'\033[1m'; Z=$'\033[0m'
else G=""; R=""; B=""; Z=""; fi

die() { printf '%s\n' "${R}$*${Z}" >&2; exit 1; }

CANONICAL="${1:-}"
[ -n "$CANONICAL" ] || die "Usage: ./set-domain.sh <hostname>
  e.g. ./set-domain.sh www.techzoidtechnologies.com"

case "$CANONICAL" in
  http*|*/*) die "Give a bare hostname — no https://, no trailing slash. Got '$CANONICAL'." ;;
  *.*) : ;;
  *) die "'$CANONICAL' does not look like a hostname." ;;
esac

[ -f .env ] || die ".env does not exist here. Copy .env.prod.example to .env first."

# ── Work out the other name ─────────────────────────────────────────────────
#
# A live domain has a pair: the bare name and its www form, whichever way round
# the canonical one is. A test subdomain has neither — there is no
# www.new.example.com and there never will be, and asking Caddy to serve a name
# with no DNS record leaves it chasing a certificate for it forever.
#
# Two labels is a bare domain. Three is normally a subdomain, except where the
# registry sells names one level down (.co.in, .co.uk), or where the first label
# is literally www.
labels="$(printf '%s' "$CANONICAL" | tr '.' '\n' | grep -c .)"
second="$(printf '%s' "$CANONICAL" | rev | cut -d. -f2 | rev)"

case "$CANONICAL" in
  www.*) ALTERNATE="${CANONICAL#www.}" ;;
  *)
    case "$labels:$second" in
      2:*|3:co|3:com|3:net|3:org|3:gov|3:edu|3:ac|3:firm|3:gen|3:ind|3:res)
        ALTERNATE="www.${CANONICAL}" ;;
      *) ALTERNATE="" ;;   # a subdomain: one name only
    esac
    ;;
esac

if [ -n "$ALTERNATE" ]; then
  ADDRESS="${CANONICAL}, ${ALTERNATE}"
  REDIRECT_FROM="$ALTERNATE"
  MODE="live"
else
  ADDRESS="$CANONICAL"
  # Set to the canonical name rather than left empty: Caddy needs a valid
  # matcher to parse, and one that only ever matches an already-canonical
  # request never fires.
  REDIRECT_FROM="$CANONICAL"
  MODE="single name"
fi

printf '\n%sSetting the domain%s\n\n' "$B" "$Z"
printf '  canonical      %s\n' "$CANONICAL"
if [ -n "$ALTERNATE" ]; then
  printf '  redirects here %s\n' "$ALTERNATE"
else
  printf '  redirects here %s\n' "(none — $CANONICAL is a subdomain)"
fi
printf '  Caddy serves   %s\n' "$ADDRESS"
printf '  site URL       https://%s\n\n' "$CANONICAL"

# ── Write it ────────────────────────────────────────────────────────────────
#
# Strip any existing form of the four keys — with or without leading whitespace
# or an `export` prefix — then append fresh ones, so a duplicate left behind by
# an earlier edit cannot win by being later in the file.
cp .env .env.backup
grep -vE '^[[:space:]]*(export[[:space:]]+)?(SITE_DOMAIN|SITE_REDIRECT_FROM|SITE_ADDRESS|APP_URL)=' \
  .env.backup > .env.new

{
  printf 'SITE_DOMAIN="%s"\n' "$CANONICAL"
  printf 'SITE_REDIRECT_FROM="%s"\n' "$REDIRECT_FROM"
  printf 'SITE_ADDRESS="%s"\n' "$ADDRESS"
  printf 'APP_URL="https://%s"\n' "$CANONICAL"
} >> .env.new

mv .env.new .env

# ── Refuse to leave a file Compose cannot read ──────────────────────────────
#
# The check that would have saved an afternoon. A malformed .env makes every
# Compose command fail, so the stack keeps running its previous configuration
# while everything typed at it appears to do nothing.
if ! error="$(docker compose -f docker-compose.prod.yml config --quiet 2>&1)"; then
  mv .env.backup .env
  printf '%sdocker compose still cannot read .env, so nothing was changed:%s\n' "$R" "$Z" >&2
  printf '  %s\n\n' "$error" >&2
  printf 'Your .env has been put back exactly as it was.\n' >&2
  printf 'The problem is a line that was already there — find it with:\n' >&2
  printf "  awk 'NF && \$0 !~ /^[[:space:]]*#/ && \$0 !~ /^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=/ {print NR\": \"\$0}' .env\n" >&2
  exit 1
fi

printf '%sDone (%s). docker compose can read the file.%s\n\n' "$G" "$MODE" "$Z"
printf 'Now apply it:\n'
printf '  docker compose -f docker-compose.prod.yml up -d\n'
printf '  ./preflight.sh\n\n'
printf 'The previous .env is saved as .env.backup.\n\n'
