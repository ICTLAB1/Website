import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Is this instance actually serving?
 *
 * Not the same question as "is the process running", which is all Docker knows
 * without this. A Next.js server whose database has gone away keeps answering
 * on port 3000 and keeps returning 500s to customers; from the outside that
 * looks identical to a healthy container. So this asks the one question that
 * distinguishes them — can the app reach Postgres — and nothing else.
 *
 * Deliberately says almost nothing. It is reachable without authentication,
 * because a health check that needs a session cannot be used by a load balancer
 * or by `docker compose`, so it must not become a way to learn about the
 * deployment. No version, no hostname, no error text, no configuration state:
 * "ok" or "degraded", and the status code, which is what a monitor reads
 * anyway. The operator gets the detail from the container log.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "cache-control": "no-store" };

  try {
    // The cheapest statement that proves a working connection and an actual
    // round trip. `SELECT 1` would be satisfied by a pooler answering on the
    // database's behalf; reading a row that must exist proves the schema is
    // migrated and the real database is behind it.
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    return NextResponse.json({ status: "ok" }, { headers });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503, headers });
  }
}
