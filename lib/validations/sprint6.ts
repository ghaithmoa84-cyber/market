import { z } from "zod"

export const deliverOrderSchema = z.object({
  idempotencyKey: z.string().min(1),
})

export const confirmOrderSchema = z.object({
  idempotencyKey: z.string().min(1),
})

export const createSettlementSchema = z.object({
  courierId: z.string().min(1),
  settlementDate: z.string().datetime(),
})

export const markSettledSchema = z.object({
  amountSettled: z
    .number()
    .positive("المبلغ يجب أن يكون موجباً")
    .max(999999999999.99, "المبلغ كبير جداً")
    .multipleOf(0.01, "المبلغ يجب أن يكون بحد أقصى خانتان عشريتان"),
  idempotencyKey: z.string().min(1),
})
