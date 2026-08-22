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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
# Carries the schema, the seed, and the content migrations the entrypoint runs.
COPY --from=build /app/prisma ./prisma
# Older one-shot corrections, kept for the record and runnable with
# `docker compose exec app node scripts/audit/…`. Content changes are no longer
# written this way: they go in prisma/content-migrations/ and are applied by the
# entrypoint, so a deploy is the whole operation. See the note there.
COPY --from=build /app/scripts/audit ./scripts/audit
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
