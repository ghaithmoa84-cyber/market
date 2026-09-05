-- Validate no NULL userId remains and no (key, userId, operation) conflicts before enforcing NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "IdempotencyRecord" WHERE userId IS NULL) THEN
    RAISE EXCEPTION 'NULL userId found in IdempotencyRecord; backfill required before SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "IdempotencyRecord" ir
    JOIN (
      SELECT key, userId, operation, COUNT(*) AS cnt
      FROM "IdempotencyRecord"
      GROUP BY key, userId, operation
      HAVING COUNT(*) > 1
    ) dup ON ir.key = dup.key AND ir.userId = dup.userId AND ir.operation = dup.operation
  ) THEN
    RAISE EXCEPTION 'Duplicate (key, userId, operation) found in IdempotencyRecord; resolve conflicts before SET NOT NULL';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "IdempotencyRecord" ALTER COLUMN "userId" SET NOT NULL;
