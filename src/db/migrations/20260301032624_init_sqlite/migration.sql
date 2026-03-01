-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "ssrScore" INTEGER NOT NULL,
    "schemaScore" INTEGER NOT NULL,
    "semanticScore" INTEGER NOT NULL,
    "contentScore" INTEGER NOT NULL,
    "detectedIndustry" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "auditResults" TEXT NOT NULL,
    "recommendations" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Report_url_idx" ON "Report"("url");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");
