import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

export interface IdempotentResult {
  resourceId: string | null
  response: unknown
}

// يكتشف ازدواجية المفاتيح (P2002) التي يرميها Prisma عند الـunique constraint.
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  )
}

// التحقق: إرجاع النتيجة إذا سبق تنفيذها بنجاح (Idempotency Replay).
export async function findIdempotentResult(
  idempotencyKey: string,
  userId?: string,
  operation?: string
): Promise<IdempotentResult | null> {
  const record = await prisma.idempotencyRecord.findFirst({
    where: {
      key: idempotencyKey,
      ...(userId ? { userId } : {}),
      ...(operation ? { operation } : {}),
    },
    select: { resourceId: true, response: true },
  })
  if (!record) return null
  return {
    resourceId: record.resourceId,
    response: record.response,
  }
}

// التسجيل داخل الـTransaction: يُنشر آخر خطوة في المعاملة لضمان الاتساق.
// P2002 يُعيد رميه ليُلغى الـTransaction بالكامل، ثم يُسترداد بالاستعاضة.
export async function recordIdempotencyResult(
  idempotencyKey: string,
  operation: string,
  resourceId: string,
  response: unknown,
  tx: Prisma.TransactionClient,
  userId: string
): Promise<void> {
  await tx.idempotencyRecord.create({
    data: {
      key: idempotencyKey,
      operation,
      userId,
      resourceId,
      response: response as Prisma.InputJsonValue,
    },
  })
}
