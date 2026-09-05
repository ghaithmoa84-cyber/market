-- DropIndex
DROP INDEX IF EXISTS "IdempotencyRecord_key_key";

-- DropIndex
DROP INDEX IF EXISTS "IdempotencyRecord_userId_operation_idx";

-- AlterTable
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_key_userId_operation_key" UNIQUE ("key","userId","operation");
