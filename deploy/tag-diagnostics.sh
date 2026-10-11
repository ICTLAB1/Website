#!/usr/bin/env bash
#
# What the live page and the published Tag Manager container actually contain —
# read-only.
#
# This exists to answer one question without guessing at it: does the container
# already fire a Google Ads conversion? If it does, adding a second one in the
# site's own code double-counts every lead, and an inflated conversion count is
# the number an advertising budget gets set from. The container's published
# payload is served to every visitor, so reading it needs no credential and
# tells us exactly which tags are in it.
#
# Everything this prints is already public: the container id, the measurement
# ids and any conversion id are served in the page source or fetched by every
# visitor's browser, and the codebase says as much where it defines them. None
# of them grants access to anything. No customer data is touched.
#
# Read-only: no container is modified, nothing is deployed, nothing restarts.
set -euo pipefail

SITE="${SITE:-https://techzoidtechnologies.com}"
CONTAINER="${CONTAINER:-GTM-THHL334G}"

say() { printf '\n%s\n' "$1"; printf '%s\n' "$(printf '%*s' "${#1}" '' | tr ' ' '-')"; }

say "The live page's own tag setup ($SITE)"

page="$(mktemp)"
if ! curl -fsS --max-time 20 -A 'Mozilla/5.0 (tag-diagnostics)' "$SITE" -o "$page"; then
  echo "(could not fetch the page)"
else
  printf 'gtag.js loaded:            %s\n' "$(grep -c 'gtag/js' "$page" || true)"
  printf 'GTM container referenced:  %s\n' "$(grep -co "$CONTAINER" "$page" || true)"
  printf 'GA4 measurement ids:       %s\n' "$(grep -oE 'G-[A-Z0-9]{6,20}' "$page" | sort -u | tr '\n' ' ')"
  # The question that decides whether code may fire a conversion.
  printf 'AW- ids in the page HTML:  %s\n' "$(grep -oE 'AW-[0-9]{8,}' "$page" | sort -u | tr '\n' ' ' | sed 's/^$/none/')"
  printf 'consent defaults present:  %s\n' "$(grep -c "consent'*,\s*'*default" "$page" || true)"
fi

say "One canonical hostname, or two competing ones"

# Why this is here, next to the tags: both hostnames were ranking for the
# brand name on the same results page — `techzoidtechnologies.com/products`
# and `www.techzoidtechnologies.com/services/it-procurement`. That is either
# Google still holding old URLs it will drop, or two hosts genuinely serving
# the same pages, which splits every inbound link between them. The
# Caddyfile can express either direction; this reports which one is live.
host="${SITE#https://}"
for candidate in "$host" "www.${host#www.}"; do
  landed="$(curl -fsS -o /dev/null -w '%{http_code} -> %{url_effective}' -L --max-time 20 \
    -A 'Mozilla/5.0 (tag-diagnostics)' "https://$candidate" 2>/dev/null || echo 'unreachable')"
  printf '  %-34s %s\n' "$candidate" "$landed"
done
echo
echo "  Both should finish on the same hostname. If each serves itself, every"
echo "  link to one of them is credited to the wrong site — set SITE_DOMAIN and"
echo "  SITE_REDIRECT_FROM in deploy/.env so one permanently redirects."

say "The published container ($CONTAINER)"

gtm="$(mktemp)"
if ! curl -fsS --max-time 20 "https://www.googletagmanager.com/gtm.js?id=$CONTAINER" -o "$gtm"; then
  echo "(could not fetch the container — an unpublished container returns 400)"
else
  printf 'payload size:              %s bytes\n' "$(wc -c < "$gtm")"
  printf 'AW- conversion ids:        %s\n' "$(grep -oE 'AW-[0-9]{8,}' "$gtm" | sort -u | tr '\n' ' ' | sed 's/^$/none/')"
  # A conversion label travels as "AW-123/LABEL" or as a send_to value.
  printf 'conversion send_to pairs:  %s\n' "$(grep -oE 'AW-[0-9]{8,}/[A-Za-z0-9_-]+' "$gtm" | sort -u | tr '\n' ' ' | sed 's/^$/none/')"
  printf 'GA4 ids in container:      %s\n' "$(grep -oE 'G-[A-Z0-9]{6,20}' "$gtm" | sort -u | tr '\n' ' ' | sed 's/^$/none/')"
  printf 'Conversion Linker:         %s\n' "$(grep -c 'conversion_linker\|"cl"' "$gtm" || true)"
  printf 'Ads conversion tag type:   %s\n' "$(grep -oE '"(awct|sp|gclidw|gaawc|gaawe)"' "$gtm" | sort -u | tr '\n' ' ' | sed 's/^$/none/')"
  echo
  echo "Custom event names the container triggers on:"
  # Container triggers compare against this key; the event names are the
  # site's own vocabulary, defined in src/lib/analytics.ts.
  grep -oE '"(quote_form_submit|enquiry_submit|order_placed|contact_form_submit|[a-z][a-z0-9_]{4,40}_submit)"' "$gtm" \
    | sort -u | sed 's/^/  /' || echo "  (none found)"
fi
rm -f "$page" "$gtm"

say "How to read this"
cat <<'GUIDE'
AW- id present in the container, none in the page HTML
    The container is already counting the conversion. Do NOT also fire it from
    the site's code: every lead would count twice, and the inflated number is
    what a budget gets set from. The site's job stops at pushing the dataLayer
    event, which it already does.

AW- id present in the page HTML as well as the container
    It is being counted twice right now. Remove one of them.

No AW- id anywhere
    Nothing is counting Ads conversions. The dataLayer event is being pushed
    and nothing is listening, so either add the tag in the container (no
    deploy needed) or fire it from code — one or the other, never both.

Container fetch fails with 400
    The container has never been published. A container id in the page with no
    published version loads nothing at all.
GUIDE
printf '\n'
