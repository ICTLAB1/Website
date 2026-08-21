// Payment status is derived, never stored directly — it's always
// SUM(payments where order_id = this order) compared to the order total.
// This keeps it impossible for the status to drift out of sync with the
// actual money received.
export function paymentInfoForOrder(order, allPayments) {
  const paid = allPayments
    .filter((p) => p.order_id === order.id)
    .reduce((s, p) => s + Number(p.amount), 0)
  const total = Number(order.total_amount)
  let status = 'pending'
  if (paid >= total && total > 0) status = 'paid'
  else if (paid > 0) status = 'partial'
  return { amountPaid: paid, balance: Math.max(total - paid, 0), status }
}

export const DELIVERY_LABELS = {
  order_received: 'Order Received',
  delivered: 'Delivered',
}

export const PAYMENT_LABELS = {
  paid: 'Payment Received',
  partial: 'Partially Paid',
  pending: 'Payment Pending',
}
