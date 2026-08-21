#!/bin/sh
# Brings the database up to date, then starts the app.
#
# Migrations run on every start and are idempotent — `migrate deploy` applies
# only what is pending and never drops anything, which is why it is safe here
# and `migrate reset` is not.
#
# The seed runs only when the database has no pages, so restarting the
# container never overwrites content edited in the admin panel. Set
# SKIP_SEED=1 to skip it entirely.
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
  echo "→ seeding skipped (SKIP_SEED=1)"
elif [ "$(node prisma/db-status.mjs pages)" = "0" ]; then
  echo "→ empty database, seeding catalogue and content"
  # The image runs with NODE_ENV=production, which the seed refuses by default.
  # That guard exists to stop someone seeding a database that already holds real
  # data — and the check above has just established this one holds none. The
  # emptiness test is the real protection; the override only gets past a check
  # that is asking a question already answered.
  SEED_ALLOW_PRODUCTION=true npm run db:seed
else
  echo "→ database already has content, leaving it alone"
fi

echo "→ starting"
exec "$@"
