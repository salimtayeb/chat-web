-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CareerGeneration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "birthDate" TEXT,
    "city" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "education" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "cv" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "includePhoto" BOOLEAN NOT NULL DEFAULT false,
    "photoDataUrl" TEXT
);
INSERT INTO "new_CareerGeneration" ("birthDate", "city", "coverLetter", "createdAt", "cv", "education", "email", "experience", "id", "name", "phone", "skills", "suggestions", "targetRole") SELECT "birthDate", "city", "coverLetter", "createdAt", "cv", "education", "email", "experience", "id", "name", "phone", "skills", "suggestions", "targetRole" FROM "CareerGeneration";
DROP TABLE "CareerGeneration";
ALTER TABLE "new_CareerGeneration" RENAME TO "CareerGeneration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
