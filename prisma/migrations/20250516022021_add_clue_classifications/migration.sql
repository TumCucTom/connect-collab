-- AlterTable
ALTER TABLE "Clue" ADD COLUMN     "wordData" JSONB;

-- AlterTable
ALTER TABLE "Solution" ADD COLUMN     "hintsUsed" INTEGER NOT NULL DEFAULT 0;
