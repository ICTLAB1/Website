#!/usr/bin/env bash
#
# The build must not need a database.
#
# This is the check that would have caught two separate failures, both of which
# reached the server instead. A Docker build has no database and no `.env` — the
# Dockerfile supplies a dummy `DATABASE_URL` so Prisma can generate its client,
# pointing at a host that is not listening. Anything that queries during
# `next build` therefore fails there and only there, which is the worst place to
# find out.
#
# The subtlety that made this hard to catch by hand: an *absent* DATABASE_URL
# produces a Prisma validation error that Next tolerates, while an *unreachable*
# one produces a connection error that aborts the export. Building locally with
# `.env` removed exits 0 and proves nothing. This reproduces the real thing —
# same dummy URL, no `.env`, no server.
#
# Run it from a clean checkout with the database stopped, or let it stop the
# database itself; either way it puts things back.

set -uo pipefail
cd "$(dirname "$0")/../.."

DUMMY_URL="postgresql://build:build@localhost:5432/build?schema=public"
STOPPED_DB=0
MOVED_ENV=0

cleanup() {
  [ "$MOVED_ENV" = "1" ] && mv .env.verify-backup .env
  [ "$STOPPED_DB" = "1" ] && pg_ctlcluster 16 main start >/dev/null 2>&1
  return 0
}
trap cleanup EXIT

if pg_isready >/dev/null 2>&1; then
  pg_ctlcluster 16 main stop >/dev/null 2>&1 && STOPPED_DB=1
  sleep 1
fi

if [ -f .env ]; then
  mv .env .env.verify-backup
  MOVED_ENV=1
fi

echo "  building with no database and no .env, as Docker does…"
DATABASE_URL="$DUMMY_URL" npm run build > /tmp/build-without-database.log 2>&1
status=$?

queries=$(grep -c "Can't reach database server" /tmp/build-without-database.log || true)
prerender=$(grep -c "Error occurred prerendering" /tmp/build-without-database.log || true)

failed=0

if [ "$status" != "0" ]; then
  echo "  ✗ the build failed without a database (exit $status)"
  grep -iE "Export encountered|Error occurred prerendering|Type error" /tmp/build-without-database.log | head -5 | sed 's/^/      /'
  failed=1
else
  echo "  ✓ the build succeeds with no database reachable"
fi

# Zero, not "few", and this is the check that actually matters.
#
# The exit code alone is not a reliable test. Removing the fix and re-running
# this script produced a *successful* build that nevertheless attempted 50
# queries: whether the export aborts depends on a race between the layout
# awaiting a query and the header reading the session cookie, and which of the
# two throws first varies between runs and machines. That is precisely why the
# failure passed locally and broke on the server.
#
# The query count does not vary. If a route is being prerendered while reading
# the database, this number is greater than zero every time, whether or not the
# build happens to survive it.
if [ "$queries" != "0" ]; then
  echo "  ✗ $queries database queries were attempted during the build"
  echo "      Something under app/ reads the database at build time. Every page"
  echo "      here is rendered on demand, so nothing should need to."
  failed=1
else
  echo "  ✓ no database query is attempted during the build"
fi

if [ "$prerender" != "0" ]; then
  echo "  ✗ $prerender route(s) failed to prerender"
  failed=1
fi

if [ "$failed" = "0" ]; then
  echo ""
  echo "Build is independent of the database."
fi
exit $failed
