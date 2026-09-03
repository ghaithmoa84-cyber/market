import { z } from "zod"

// عنصر سلة: منتج من متجر — أو عنصر مخصص (بدون productId)
export const cartItemSchema = z
  .object({
    storeId: z.string().min(1, "مطلوب storeId"),
    productId: z.string().optional(),
    isCustom: z.boolean().optional(),
    customDescription: z.string().optional(),
    requestedQty: z
      .number({ message: "requestedQty يجب أن يكون رقمًا" })
      .refine((v) => v > 0, {
        message: "requestedQty يجب أن يكون أكبر من الصفر",
      }),
    unit: z
      .enum(["PIECE", "WEIGHT", "VOLUME", "PACKAGE"])
      .optional(),
    expectedPrice: z
      .number({ message: "expectedPrice يجب أن يكون رقمًا" })
      .refine((v) => v >= 0, {
        message: "expectedPrice لا يمكن أن يكون سالبًا",
      })
      .optional(),
  })
  .refine(
    (data) => {
      const isCustom = data.isCustom === true || !data.productId
      if (!isCustom) return true
      return (
        !!data.customDescription && data.customDescription.trim().length > 0
      )
    },
    {
      message: "العنصر المخصص يتطلب customDescription",
      path: ["customDescription"],
    }
  )

// طلب إنشاء الطلب — السعر يُحسب على الخادم، لا يُوثق من المتصفح.
export const createOrderSchema = z.object({
  addressId: z.string().min(1, "مطلوب addressId"),
  idempotencyKey: z.string().min(1, "مطلوب idempotencyKey"),
  items: z
    .array(cartItemSchema)
    .min(1, "السلة لا يمكن أن تكون فارغة"),
})

// إنشاء/اختيار عنوان للطلب
export const createAddressSchema = z.object({
  label: z.string().optional(),
  addressText: z.string().min(1, "مطلوب العنوان"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  deliveryNotes: z.string().optional(),
  isDefault: z.boolean().optional(),
})

export type CartItemInput = z.infer<typeof cartItemSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CreateAddressInput = z.infer<typeof createAddressSchema>
