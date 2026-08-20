import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { destroySession, getSessionUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { ipFromRequest } from "@/lib/auth/request";

export const POST = withErrorHandling("auth.logout", async (request: Request) => {
  if (await verifyCsrf(request)) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const user = await getSessionUser();
  // Revokes the row in the database, so the token is dead even if the cookie
  // has already been copied elsewhere.
  await destroySession();

  if (user) {
    await recordAudit({
      actorId: user.id,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
      ip: ipFromRequest(request),
    });
  }

  return jsonOk({ redirectTo: "/" });
});
