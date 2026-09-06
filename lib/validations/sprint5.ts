import { z } from "zod"

const MAX_DECIMAL_14_2 = 999999999999.99

export const alternativeProposalSchema = z.object({
  description: z.string().min(3, "الوصف قصير جداً"),
  price: z.number()
    .positive("السعر يجب أن يكون موجباً")
    .max(MAX_DECIMAL_14_2, "السعر كبير جداً")
    .multipleOf(0.01, "السعر يجب أن يكون بحد أقصى خانتان عشريتان"),
  idempotencyKey: z.string().min(1),
})

export const alternativeResponseSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  idempotencyKey: z.string().min(1),
})

export const actualItemSchema = z.object({
  actualQty: z.number()
    .positive("الكمية يجب أن تكون موجبة")
    .max(9999.999, "الكمية كبيرة جداً"),
  actualPrice: z.number()
    .positive("السعر يجب أن يكون موجباً")
    .max(MAX_DECIMAL_14_2, "السعر كبير جداً")
    .multipleOf(0.01, "السعر يجب أن يكون بحد أقصى ختان عشريتان"),
  idempotencyKey: z.string().min(1),
}).refine(
  (data) => data.actualQty * data.actualPrice <= MAX_DECIMAL_14_2,
  { message: "إجمالي القيمة يتجاوز الحد المسموح به" }
)

export const priceApprovalResponseSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  idempotencyKey: z.string().min(1),
})
