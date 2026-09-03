import { calculatePricing, calculateDeliveryFee, PricingBreakdown } from "@/lib/pricing"

export interface CartLine {
  unitPrice: number
  quantity: number
}

export interface CartPricingResult {
  subtotal: number
  breakdown: PricingBreakdown
}

// تقدير سعر السلة قبل الإنشاء (Server is the source of truth).
// الأسعار النهائية للطلب تُحسب دائماً على الخادم، لا تعتمد على قيمة المتصفح.
export function computeCartPricing(lines: CartLine[]): CartPricingResult {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  )
  const breakdown = calculatePricing(subtotal)
  return { subtotal: breakdown.subtotal, breakdown }
}

export { calculatePricing, calculateDeliveryFee }
export type { PricingBreakdown }
