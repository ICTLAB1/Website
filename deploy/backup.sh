#!/bin/sh
# Dumps the database to deploy/backups, and keeps the last 14.
#
# Run it from a cron job on the host:
#   0 2 * * *  cd /srv/techzoid/deploy && ./backup.sh >> backup.log 2>&1
#
# The catalogue and every page can be reseeded from the repository, but
# enquiries, quotations, orders, licences and customer accounts cannot. Those
# exist only here.
#
# A backup nobody has restored is a hope, not a backup. Restore one into a
# scratch database occasionally and count the rows:
#   docker compose -f docker-compose.prod.yml exec -T db \
#     psql -U "$POSTGRES_USER" -c 'CREATE DATABASE restore_check'
#   gunzip -c backups/techzoid-YYYY-MM-DD.sql.gz | docker compose -f docker-compose.prod.yml exec -T db \
#     psql -U "$POSTGRES_USER" -d restore_check
set -e

cd "$(dirname "$0")"
. ./.env

KEEP=14
STAMP=$(date +%Y-%m-%dT%H%M)
FILE="backups/${POSTGRES_DB}-${STAMP}.sql.gz"

mkdir -p backups

echo "→ dumping to ${FILE}"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -9 > "$FILE"

# A dump that failed midway can still leave a small, syntactically valid file,
# so check it holds what a real one holds rather than merely that it exists.
if ! gunzip -c "$FILE" | grep -q 'CREATE TABLE public."Order"'; then
  echo "  dump looks incomplete — keeping it for inspection, not rotating" >&2
  exit 1
fi

echo "  $(du -h "$FILE" | cut -f1)"

echo "→ keeping the newest ${KEEP}"
ls -1t backups/${POSTGRES_DB}-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  echo "  removing $(basename "$old")"
  rm -f "$old"
done

echo "done"
