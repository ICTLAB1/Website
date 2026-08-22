#!/bin/sh
# Brings the database up to date, then starts the app.
#
# Three steps, in this order, and the order is the point:
#
#   1. `migrate deploy` — structure. Applies only what is pending, never drops
#      anything, which is why it is safe here and `migrate reset` is not.
#
#   2. the seed — but only when the database has no pages, so restarting the
#      container never overwrites content edited in the admin panel.
#
#   3. content migrations — content, for a database that step 2 skipped.
#      Without this, a release that changes seeded copy reaches a live site as
#      new code and old rows: nothing errors, nothing logs, and the site simply
#      keeps showing yesterday's pages. That happened, more than once, and it
#      is what this step exists to prevent. See prisma/content-migrations/.
#
# All three run before the server binds a port, so nothing serves a page
# half-way through a change.
#
# Set SKIP_SEED=1 to skip 2 and 3 both — it means "do not touch content".
set -e

echo "→ waiting for the database"
i=0
until node prisma/db-status.mjs >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "  gave up waiting for ${DATABASE_URL%%\?*}" >&2
    node prisma/db-status.mjs >&2 || true
    exit 1
  fi
  sleep 1
done
echo "  database is up"

echo "→ applying migrations"
npx prisma migrate deploy

if [ "${SKIP_SEED}" = "1" ]; then
  echo "→ seeding and content migrations skipped (SKIP_SEED=1)"
elif [ "$(node prisma/db-status.mjs pages)" = "0" ]; then
  echo "→ empty database, seeding catalogue and content"
  # The image runs with NODE_ENV=production, which the seed refuses by default.
  # That guard exists to stop someone seeding a database that already holds real
  # data — and the check above has just established this one holds none. The
  # emptiness test is the real protection; the override only gets past a check
  # that is asking a question already answered.
  SEED_ALLOW_PRODUCTION=true npm run db:seed

  # The seed has just written the current content, so the migrations that would
  # bring an older database up to it have nothing to do. Recorded as applied
  # rather than run, so they never run against this database later.
  echo "→ baselining content migrations"
  npx tsx prisma/content-migrate.ts --baseline
else
  echo "→ database already has content, leaving it alone"
  echo "→ applying content migrations"
  npx tsx prisma/content-migrate.ts
fi

# Cached query results, cleared on every start.
#
# `unstable_cache` persists to disk for an hour, and `docker compose restart`
# keeps the container's filesystem — so without this, content written a moment
# ago by the step above can sit behind results cached before it. The cache is
# derived data and nothing reads it yet, so clearing it costs one repopulation
# and removes a class of "I deployed it and nothing changed" entirely.
#
# The whole directory, not `cache/fetch-cache` alone. That is where a
# production build keeps these entries today, but a dev server was observed
# holding a cached navigation tree that survived deleting exactly that path —
# so the narrower target is a guess about an internal layout, and the cost of
# being wrong is the bug this line exists to prevent. Everything under here is
# derived and regenerates on demand.
rm -rf .next/cache

echo "→ starting"
exec "$@"
