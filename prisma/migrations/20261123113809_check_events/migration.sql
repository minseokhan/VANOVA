-- CreateEnum
CREATE TYPE "CheckKind" AS ENUM ('MEETING', 'TASK');

-- CreateTable
CREATE TABLE "CheckEvent" (
    "id" TEXT NOT NULL,
    "kind" "CheckKind" NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckEntry" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CheckEntry_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateIndex
CREATE INDEX "CheckEvent_date_idx" ON "CheckEvent"("date");

-- CreateIndex
CREATE INDEX "CheckEntry_userId_idx" ON "CheckEntry"("userId");

-- AddForeignKey
ALTER TABLE "CheckEntry" ADD CONSTRAINT "CheckEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CheckEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckEntry" ADD CONSTRAINT "CheckEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
