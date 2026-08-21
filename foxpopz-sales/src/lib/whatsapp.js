import { businessConfig } from './businessConfig'
import { formatINR } from './format'

// Normalizes an Indian mobile number to the digits-only, country-code-prefixed
// format wa.me expects (e.g. 9876543210 -> 919876543210).
export function normalizeIndianPhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return digits.length >= 10 ? digits : null
}

export function buildInvoiceWhatsAppMessage({ shopName, invoiceNumber, total, paymentStatus, amountPaid }) {
  const lines = [
    `Hi ${shopName || ''},`.trim(),
    ``,
    `Your invoice ${invoiceNumber} from ${businessConfig.brandName} is ready.`,
    `Amount: ${formatINR(total)}`,
  ]
  if (paymentStatus === 'paid') {
    lines.push(`Status: Paid ✅`)
  } else {
    const due = Number(total) - Number(amountPaid || 0)
    lines.push(`Status: ${formatINR(due)} due`)
  }
  lines.push(``, `Invoice PDF is attached. Thank you for your business! 🙏`)
  return lines.join('\n')
}

export function buildOrderReceivedMessage({ shopName, total, itemCount }) {
  return [
    `Hi ${shopName || ''},`.trim(),
    ``,
    `We've received your order (${itemCount} item${itemCount === 1 ? '' : 's'}, ${formatINR(total)}).`,
    `We'll confirm once it's out for delivery. Thank you! 🙏`,
  ].join('\n')
}

// Opens WhatsApp (app on mobile, web on desktop) with the shopkeeper's number
// and a pre-filled message. The PDF is downloaded separately — WhatsApp's
// click-to-chat links can't auto-attach a file, so the rep taps the paperclip
// once and picks the just-downloaded invoice.
export function openWhatsAppChat({ phone, message }) {
  const normalized = normalizeIndianPhone(phone)
  const text = encodeURIComponent(message)
  const url = normalized
    ? `https://wa.me/${normalized}?text=${text}`
    : `https://wa.me/?text=${text}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
