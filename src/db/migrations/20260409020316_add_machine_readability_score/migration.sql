-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "ssrScore" INTEGER NOT NULL,
    "schemaScore" INTEGER NOT NULL,
    "semanticScore" INTEGER NOT NULL,
    "contentScore" INTEGER NOT NULL,
    "machineReadabilityScore" INTEGER NOT NULL DEFAULT 0,
    "detectedIndustry" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "auditResults" TEXT NOT NULL,
    "recommendations" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Report" ("auditResults", "contentScore", "createdAt", "detectedIndustry", "duration", "grade", "id", "overallScore", "recommendations", "schemaScore", "semanticScore", "ssrScore", "url") SELECT "auditResults", "contentScore", "createdAt", "detectedIndustry", "duration", "grade", "id", "overallScore", "recommendations", "schemaScore", "semanticScore", "ssrScore", "url" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE INDEX "Report_url_idx" ON "Report"("url");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
