import "server-only";
import { prisma } from "@/lib/db";
import { hashIp } from "@/lib/auth/tokens";
import { logger, redact } from "@/lib/logger";

/**
 * Append-only audit trail for privileged and security-relevant actions.
 * Metadata passes through the same redaction used by the logger, so no
 * credential or token can be persisted here by accident.
 */
export async function recordAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata
          ? (redact(input.metadata) as object)
          : undefined,
        ipHash: hashIp(input.ip),
      },
    });
  } catch (error) {
    // An audit failure must never break the user-facing operation.
    logger.error("audit_write_failed", {
      action: input.action,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
