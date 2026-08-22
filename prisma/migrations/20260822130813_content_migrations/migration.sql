-- CreateTable
CREATE TABLE "ContentMigration" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentMigration_pkey" PRIMARY KEY ("id")
);
