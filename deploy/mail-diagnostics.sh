#!/usr/bin/env bash
#
# What production actually did with its notification email — read-only.
#
# This exists because "notifications are not arriving" has at least five
# distinct causes that look identical from a customer's side, and arguing about
# which one it is from the outside wasted days:
#
#   1. No address to notify.
#   2. No channel configured to send through.
#   3. A channel that rejected the message.
#   4. Sent successfully, and the receiving mailbox filed it as spam.
#   5. Sent successfully to an address nobody reads.
#
# Each leaves a different trace. This prints those traces and nothing else.
#
# PRINTS NOTHING SENSITIVE, BY DESIGN. The repository is public, so every line
# this writes ends up in a world-readable Actions log. It therefore reports
# configuration as booleans rather than values, and log activity as event names
# and counts rather than lines — never an address, a subject, a reference, a
# customer name or a rejection detail. Read the container logs over SSH when a
# specific message needs tracing; do not widen this script to do it.
#
# Read-only: it starts nothing, stops nothing, writes nothing. Safe to run on
# the live site at any time.
set -euo pipefail

COMPOSE="docker compose --project-directory /home/azureuser/app/deploy -f /home/azureuser/app/deploy/docker-compose.prod.yml"
SINCE="${SINCE:-168h}"

say() { printf '\n%s\n' "$1"; printf '%s\n' "$(printf '%*s' "${#1}" '' | tr ' ' '-')"; }

say "Mail configuration (true/false only — no values are printed)"

# A heredoc through `psql -f -` rather than -c, so the SQL stays readable.
# Connected over the container's local socket as the image's own superuser, so
# no password is passed, stored or echoed anywhere.
$COMPOSE exec -T db sh -c 'psql -X -A -F"=" -t -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f -' <<'SQL'
select 'mail_settings_row_exists=' || (count(*) > 0) from "MailSettings";
select 'provider', coalesce(max(provider::text), 'none') from "MailSettings";
select 'smtp_host_set', coalesce(max((host is not null and host <> ''))::text, 'false') from "MailSettings";
select 'smtp_password_set', coalesce(max((password is not null))::text, 'false') from "MailSettings";
select 'from_address_set', coalesce(max(("fromAddress" is not null and "fromAddress" <> ''))::text, 'false') from "MailSettings";
select 'graph_complete', coalesce(max(("graphTenantId" is not null and "graphClientId" is not null and "graphClientSecret" is not null and "graphSender" is not null))::text, 'false') from "MailSettings";
select 'acs_enabled', coalesce(max("acsEnabled")::text, 'false') from "MailSettings";
select 'acs_complete', coalesce(max(("acsConnectionString" is not null and "acsSenderAddress" is not null))::text, 'false') from "MailSettings";
select 'notification_address_set', coalesce(max(("salesNotificationEmail" is not null and "salesNotificationEmail" <> ''))::text, 'false') from "MailSettings";
select 'site_sales_address_set', coalesce(max(("emailSales" is not null and "emailSales" <> ''))::text, 'false') from "SiteSettings";
SQL

say "Inbound messages stored in the last 7 days (counts only)"

$COMPOSE exec -T db sh -c 'psql -X -A -F"=" -t -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f -' <<'SQL'
select 'support_tickets', count(*) from "SupportTicket" where "createdAt" > now() - interval '7 days';
select 'of_those_sales_or_enterprise', count(*) from "SupportTicket"
  where "createdAt" > now() - interval '7 days' and category in ('SALES', 'ENTERPRISE');
select 'enquiries', count(*) from "Enquiry" where "createdAt" > now() - interval '7 days';
SQL

say "Mail events in the container log, last $SINCE (event name and count)"

# Event names are a closed set defined in the source. Matching on them rather
# than printing lines is what keeps customer addresses out of a public log.
if ! $COMPOSE logs app --since "$SINCE" --no-log-prefix 2>/dev/null \
  | grep -oE '"message":"(internal_notification_[a-z_]+|mail_[a-z_]+|contact_[a-z_]+|enquiry_[a-z_]+)"' \
  | sed 's/.*:"//; s/"$//' \
  | sort | uniq -c | sort -rn
then
  echo "(no mail events in this window)"
fi

say "How notifications were delivered, last $SINCE"

# `via` says which channel carried it; `failure` says why one did not. Both are
# fixed vocabularies from the source, so neither can leak a detail string.
$COMPOSE logs app --since "$SINCE" --no-log-prefix 2>/dev/null \
  | grep -oE '"via":"[a-z]+"|"failure":"[a-z_]+"' \
  | sort | uniq -c | sort -rn \
  || echo "(none recorded — this deployment may predate the change that logs them)"

say "What to conclude"
cat <<'GUIDE'
internal_notification_sent, via "mailbox" or "azure"
    The site handed the message to a working mail server. If it is still not
    in the inbox the remaining causes are on the receiving side: a spam or
    quarantine rule, or an address that forwards somewhere nobody reads. Check
    the junk folder and the mailbox's own rules first.

internal_notification_failed, with a failure kind
    no_host / no_from / graph_incomplete  - nothing is configured to send
                                            through. Set the mail server under
                                            Settings -> Email.
    rejected_connection                   - wrong host, port, or credentials.
    rejected_message                      - the server signed us in and
                                            refused the message. Usually the
                                            From address is not a mailbox or
                                            confirmed alias of the account we
                                            sign in as.

internal_notification_no_recipient
    No address to notify at all: neither the notification field nor the sales
    address on the contact page is set.

mail_not_configured_message_skipped
    Nothing was attempted, because no channel exists. Expected in a deployment
    that has not had mail set up; never expected on a live site.

Tickets stored but no notification events at all
    The running image predates the change that notifies and logs. Deploy.
GUIDE
printf '\n'
