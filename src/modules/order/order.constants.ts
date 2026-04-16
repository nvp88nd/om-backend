export enum OrderStatus {
  PENDING = 0, // Order is created, waiting for payment
  PROCESSING = 1, // Order is paid or being processed by shop
  SHIPPING = 2, // Order is with courier
  COMPLETED = 3, // Order is received by customer
  CANCELLED = 4, // Order is cancelled by user or shop
  REFUNDED = 5, // Order is returned/refunded
}

export enum PaymentStatus {
  PENDING = 0,
  PAID = 1,
  FAILED = 2,
  REFUNDED = 3,
}

export enum ReturnRequestStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  REFUNDED = 3,
}
