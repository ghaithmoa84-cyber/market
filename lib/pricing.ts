import config from "@/lib/config"

export interface PricingBreakdown {
  subtotal: number
  deliveryFee: number
  yallaShare: number
  courierEarning: number
  total: number
}

function round2(value: number): number {
  return Number(Math.round((value + Number.EPSILON) * 100) / 100)
}

// Delivery Fee = baseFee + MAX(minVariableFee, percent × cartValue)
// Example: cart 500 -> 60 + MAX(20, 10) = 80
//          cart 1000 -> 60 + MAX(20, 20) = 80
//          cart 2000 -> 60 + MAX(20, 40) = 100
//          cart 5000 -> 60 + MAX(20, 100) = 160
export function calculateDeliveryFee(cartValue: number): number {
  const { baseFee, minVariableFee, percent } = config.delivery
  const variableFee = Math.max(minVariableFee, cartValue * percent)
  return round2(baseFee + variableFee)
}

// MVP: Yalla Share = 20 (minimum). Future rule is 0 in MVP, so MAX(20, 0) = 20.
// Courier Earning = Delivery Fee - Yalla Share
export function calculateYallaShare(): number {
  return Math.max(config.yalla.minShare, 0)
}

export function calculateCourierEarning(
  deliveryFee: number,
  yallaShare: number
): number {
  return round2(deliveryFee - yallaShare)
}

// Full server-side pricing breakdown.
// Server is the source of truth for: delivery fee, yalla share, courier earning, total.
// The browser must never trust a client-sent price.
export function calculatePricing(subtotal: number): PricingBreakdown {
  const deliveryFee = calculateDeliveryFee(subtotal)
  const yallaShare = calculateYallaShare()
  const courierEarning = calculateCourierEarning(deliveryFee, yallaShare)
  const total = round2(subtotal + deliveryFee)

  return {
    subtotal: round2(subtotal),
    deliveryFee,
    yallaShare,
    courierEarning,
    total,
  }
}
