const config = {
  delivery: {
    baseFee: Number(process.env.BASE_DELIVERY_FEE ?? 60),
    minVariableFee: Number(process.env.MIN_VARIABLE_DELIVERY_FEE ?? 20),
    percent: Number(process.env.DELIVERY_PERCENT ?? 0.02),
  },
  yalla: {
    minShare: Number(process.env.YALLA_MIN_SHARE ?? 20),
  },
  pricing: {
    priceChangeApprovalThreshold: Number(
      process.env.PRICE_CHANGE_APPROVAL_THRESHOLD ?? 0.05
    ),
  },
  timeouts: {
    alternativeResponseMinutes: Number(
      process.env.ALTERNATIVE_RESPONSE_TIMEOUT_MINUTES ?? 5
    ),
    autoConfirmMinutes: Number(
      process.env.AUTO_CONFIRM_TIMEOUT_MINUTES ?? 30
    ),
    courierAssignmentAlertMinutes: Number(
      process.env.COURIER_ASSIGNMENT_ALERT_MINUTES ?? 3
    ),
    pollIntervalSeconds: Number(process.env.POLL_INTERVAL_SECONDS ?? 10),
  },
}

export default config