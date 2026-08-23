-- CreateTable
CREATE TABLE "GstinLookupSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "baseUrl" TEXT,
    "statusPath" TEXT DEFAULT '/commonapi/v1.0/tpstatus',
    "searchPath" TEXT DEFAULT '/commonapi/v1.3/search',
    "headerOneName" TEXT,
    "headerOneValue" TEXT,
    "headerTwoName" TEXT,
    "headerTwoValue" TEXT,
    "headerThreeName" TEXT,
    "headerThreeValue" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "GstinLookupSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GstinLookupSettings" ADD CONSTRAINT "GstinLookupSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

