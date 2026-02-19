-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quizTitle" TEXT,
    "jobText" TEXT NOT NULL,
    "quizScorePct" INTEGER NOT NULL,
    "cvMode" TEXT NOT NULL,
    "cvText" TEXT,
    "cvFileName" TEXT,
    "matchPct" INTEGER NOT NULL,
    "report" TEXT NOT NULL
);
