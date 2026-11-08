# Runs the marketplace with one command, against a database the compose file
# brings up alongside it. See docker-compose.yml.
#
# Deliberately not a minimal production image. The container also runs the
# migrations and, on an empty database, the seed — so it keeps the Prisma CLI
# and the seed's TypeScript runner, which a stripped runtime image would not
# have. That trade buys "clone it and look at it", which is what this file is
# for. A production deployment should build with `output: "standalone"` and
# run migrations as a separate release step.

FROM node:22-slim AS base
# openssl is Prisma's requirement; the rest is what a slim image lacks.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------- dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
# `npm ci` runs the postinstall, which needs the schema present — hence the
# copy above. Playwright's browsers are not needed to run the site.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

# ---------------------------------------------------------------------- build
FROM base AS build
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The build only compiles; it never reaches the database. A dummy URL satisfies
# Prisma's client generation without implying a connection.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN npm run build

# -------------------------------------------------------------------- runtime
FROM base AS runtime
ENV NODE_ENV=production

# Everything the application owns is copied as `node`, the unprivileged user
# the official image already provides (uid 1000). Doing it with `--chown` on
# each COPY rather than a `RUN chown -R` afterwards keeps the layers small:
# a recursive chown rewrites every file into a new layer.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=build --chown=node:node /app/tsconfig.json ./tsconfig.json
# Carries the schema, the seed, and the content migrations the entrypoint runs.
COPY --from=build --chown=node:node /app/prisma ./prisma
# Older one-shot corrections, kept for the record and runnable with
# `docker compose exec app node scripts/audit/…`. Content changes are no longer
# written this way: they go in prisma/content-migrations/ and are applied by the
# entrypoint, so a deploy is the whole operation. See the note there.
COPY --from=build --chown=node:node /app/scripts/audit ./scripts/audit
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# The upload and document directories, created in the image so that a *new*
# named volume inherits this ownership when Docker initialises it.
#
# This does nothing for a volume that already exists — Docker only seeds an
# empty one — so an existing deployment needs a one-time chown before the
# container can write to it. That step is in deploy/README.md; without it the
# first upload after this change fails with EACCES and nothing else looks
# wrong, which is the sort of thing that is discovered by a customer.
RUN mkdir -p /data/uploads /data/documents && chown -R node:node /data

# /app itself, so the application can create files beside the ones copied in.
# The COPYs above set ownership on their own contents, not on the working
# directory WORKDIR made as root; Next writes into .next while serving and the
# entrypoint deletes .next/cache on every start.
RUN chown node:node /app

# Dropped here rather than in compose so the image is non-root wherever it is
# run, including by hand. Port 3000 is above 1024, so nothing is given up.
USER node

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
