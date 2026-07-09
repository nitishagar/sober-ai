-- AlterTable
ALTER TABLE "Report" ADD COLUMN "ownerToken" TEXT;

-- CreateIndex
CREATE INDEX "Report_ownerToken_idx" ON "Report"("ownerToken");
