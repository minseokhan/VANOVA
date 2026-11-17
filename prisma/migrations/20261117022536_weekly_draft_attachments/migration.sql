-- AlterTable
ALTER TABLE "WeeklyUpdate" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "WeeklyDraft" (
    "projectId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "didThisWeek" TEXT NOT NULL,
    "planNextWeek" TEXT NOT NULL,
    "issues" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyDraft_pkey" PRIMARY KEY ("projectId","weekStart")
);

-- AddForeignKey
ALTER TABLE "WeeklyDraft" ADD CONSTRAINT "WeeklyDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyDraft" ADD CONSTRAINT "WeeklyDraft_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
