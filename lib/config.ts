import { z } from "zod"

const numberSchema = z.coerce.number().finite().nonnegative()
const positiveIntSchema = z.coerce.number().int().positive()

const configSchema = z.object({
  delivery: z.object({
    baseFee: numberSchema,
    minVariableFee: numberSchema,
    percent: numberSchema,
  }),
  yalla: z.object({
    minShare: numberSchema,
  }),
  pricing: z.object({
    priceChangeApprovalThreshold: numberSchema,
  }),
  timeouts: z.object({
    alternativeResponseMinutes: positiveIntSchema,
    autoConfirmMinutes: positiveIntSchema,
    courierAssignmentAlertMinutes: positiveIntSchema,
    pollIntervalSeconds: positiveIntSchema,
  }),
})

const config = configSchema.parse({
  delivery: {
    baseFee: process.env.BASE_DELIVERY_FEE ?? 60,
    minVariableFee: process.env.MIN_VARIABLE_DELIVERY_FEE ?? 20,
    percent: process.env.DELIVERY_PERCENT ?? 0.02,
  },
  yalla: {
    minShare: process.env.YALLA_MIN_SHARE ?? 20,
  },
  pricing: {
    priceChangeApprovalThreshold:
      process.env.PRICE_CHANGE_APPROVAL_THRESHOLD ?? 0.05,
  },
  timeouts: {
    alternativeResponseMinutes:
      process.env.ALTERNATIVE_RESPONSE_TIMEOUT_MINUTES ?? 5,
    autoConfirmMinutes: process.env.AUTO_CONFIRM_TIMEOUT_MINUTES ?? 30,
    courierAssignmentAlertMinutes:
      process.env.COURIER_ASSIGNMENT_ALERT_MINUTES ?? 3,
    pollIntervalSeconds: process.env.POLL_INTERVAL_SECONDS ?? 10,
  },
})

export default config