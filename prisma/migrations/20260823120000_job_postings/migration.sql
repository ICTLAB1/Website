-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "team" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "workArrangement" "WorkArrangement" NOT NULL DEFAULT 'ON_SITE',
    "location" TEXT,
    "description" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "experienceMinYears" INTEGER,
    "experienceMaxYears" INTEGER,
    "salaryMinMinor" INTEGER,
    "salaryMaxMinor" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'INR',
    "salaryPeriod" TEXT,
    "applyEmail" TEXT NOT NULL,
    "postedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesOn" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_slug_key" ON "JobPosting"("slug");

-- CreateIndex
CREATE INDEX "JobPosting_closedAt_displayOrder_idx" ON "JobPosting"("closedAt", "displayOrder");

-- CreateIndex
CREATE INDEX "JobPosting_slug_idx" ON "JobPosting"("slug");

