#!/usr/bin/env bash
#
# What happened to the last emails this site tried to send.
#
#   cd /srv/techzoid/deploy
#   ./mail-log.sh
#
# A script rather than a command to paste, for the same reason as
# set-domain.sh: the pipeline this replaces is long enough that a terminal
# wraps it or inserts bracketed-paste escapes into it, and the result is an
# error about `tail` rather than an answer about email. Twelve characters typed
# by hand cannot be mangled.
#
# Every customer-facing flow deliberately carries on when mail fails, so a
# rejected message leaves no trace in the interface. This is where the trace is.

set -uo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml"
SINCE="${1:-2h}"

if [ -t 1 ]; then G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; B=$'\033[1m'; Z=$'\033[0m'
else G=""; Y=""; R=""; B=""; Z=""; fi

log="$($COMPOSE logs app --since "$SINCE" --no-log-prefix 2>/dev/null)"

if [ -z "$log" ]; then
  printf '%sNo application log for the last %s.%s\n' "$Y" "$SINCE" "$Z"
  printf 'Try a longer window:  ./mail-log.sh 24h\n'
  exit 0
fi

count() { printf '%s' "$log" | grep -c "$1"; }

sent=$(count '"message":"mail_sent"')
failed=$(count '"message":"mail_send_failed"')
graph=$(count '"message":"graph_send_failed"')
skipped=$(count '"message":"mail_not_configured_message_skipped"')

printf '\n%sOutbound email, last %s%s\n\n' "$B" "$SINCE" "$Z"
printf '  %sdelivered%s  %s\n' "$G" "$Z" "$sent"
printf '  %sfailed%s     %s\n' "$R" "$Z" "$((failed + graph))"
printf '  %sskipped%s    %s   (no mail server configured at the time)\n\n' "$Y" "$Z" "$skipped"

# ── What was tried, most recent last ────────────────────────────────────────
printf '%sMessages%s\n' "$B" "$Z"
printf '%s' "$log" \
  | grep -E '"message":"(mail_sent|mail_send_failed|graph_send_failed|mail_not_configured_message_skipped|verification_link_not_emailed)"' \
  | tail -25 \
  | sed -E \
      -e 's/.*"message":"mail_sent".*"to":"([^"]*)".*"subject":"([^"]*)".*/  sent      \1  —  \2/' \
      -e 's/.*"message":"mail_send_failed".*"to":"([^"]*)".*"subject":"([^"]*)".*"message":"([^"]*)".*/  FAILED    \1  —  \2\n            reason: \3/' \
      -e 's/.*"message":"graph_send_failed".*"status":([0-9]+).*"code":"([^"]*)".*/  FAILED    Microsoft refused it — HTTP \1 \2/' \
      -e 's/.*"message":"mail_not_configured_message_skipped".*"to":"([^"]*)".*"subject":"([^"]*)".*/  skipped   \1  —  \2/' \
      -e 's/.*"message":"verification_link_not_emailed".*/  a verification link could not be emailed; see the full log for it/'

if [ "$((failed + graph))" -eq 0 ] && [ "$sent" -gt 0 ]; then
  printf '\n%sEvery message was accepted by the mail server.%s\n' "$G" "$Z"
  printf 'If one has not arrived, it left here successfully and the problem is at the\n'
  printf 'other end — check the spam folder first. For an address outside your own\n'
  printf 'domain, the usual cause is SPF or DKIM: check with\n\n'
  printf '  dig +short TXT %s\n\n' "$(sed -n 's/^[[:space:]]*SITE_DOMAIN=//p' .env | tail -n1 | tr -d '"')"
  printf 'and look for include:spf.protection.outlook.com in the reply.\n\n'
fi

if [ "$skipped" -gt 0 ] && [ "$sent" -eq 0 ]; then
  printf '\n%sNothing was sent because no mail server was configured.%s\n' "$Y" "$Z"
  printf 'Set one at /admin/settings, then press Send a test email.\n\n'
fi
