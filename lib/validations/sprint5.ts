import { z } from "zod"

export const alternativeProposalSchema = z.object({
  description: z.string().min(3, "الوصف قصير جداً"),
  price: z.number().positive("السعر يجب أن يكون موجباً"),
  idempotencyKey: z.string().min(1),
})

export const alternativeResponseSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  idempotencyKey: z.string().min(1),
})

export const actualItemSchema = z.object({
  actualQty: z.number().positive("الكمية يجب أن تكون موجبة"),
  actualPrice: z.number().positive("السعر يجب أن يكون موجباً"),
  idempotencyKey: z.string().min(1),
})

export const priceApprovalResponseSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  idempotencyKey: z.string().min(1),
})
