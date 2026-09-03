import { OrderStatus } from "@prisma/client"

export class OrderStateError extends Error {
  constructor(public from: OrderStatus, public to: OrderStatus) {
    super(
      `Transition invalide: ${from} → ${to}. Server is the source of truth for order state; this transition is not allowed by the state machine.`
    )
    this.name = "OrderStateError"
  }
}

// Allowed Order status transitions per MVP Technical Specification V1.1 (Chapter 16).
// Every state change MUST go through this machine. Everything else is forbidden.
const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PENDING]: [OrderStatus.SEARCHING_COURIER, OrderStatus.CANCELLED],
  [OrderStatus.SEARCHING_COURIER]: [
    OrderStatus.COURIER_ASSIGNED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.COURIER_ASSIGNED]: [
    OrderStatus.COURIER_ACCEPTED,
    OrderStatus.SEARCHING_COURIER,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.COURIER_ACCEPTED]: [
    OrderStatus.GOING_TO_STORE,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.GOING_TO_STORE]: [OrderStatus.SHOPPING, OrderStatus.CANCELLED],
  [OrderStatus.SHOPPING]: [
    OrderStatus.PURCHASED,
    OrderStatus.WAITING_CUSTOMER_APPROVAL,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.WAITING_CUSTOMER_APPROVAL]: [
    OrderStatus.PURCHASED,
    OrderStatus.SHOPPING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PURCHASED]: [OrderStatus.DELIVERING, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [
    OrderStatus.CONFIRMED,
    OrderStatus.SETTLEMENT_PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [OrderStatus.SETTLEMENT_PENDING, OrderStatus.CANCELLED],
  [OrderStatus.SETTLEMENT_PENDING]: [
    OrderStatus.SETTLED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SETTLED]: [],
  [OrderStatus.CANCELLED]: [],
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return allowedTransitions[from]?.includes(to) ?? false
}

// SETTLED/CANCELLED are terminal — never cancellable.
export function isCancellable(from: OrderStatus): boolean {
  if (from === OrderStatus.SETTLED || from === OrderStatus.CANCELLED) {
    return false
  }
  return canTransition(from, OrderStatus.CANCELLED)
}

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus
): void {
  if (!canTransition(from, to)) {
    throw new OrderStateError(from, to)
  }
}

export { allowedTransitions as ALLOWED_TRANSITIONS }
