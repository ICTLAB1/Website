import QRCode from 'qrcode'
import { businessConfig } from './businessConfig'

// Builds a standard UPI deep link. Any UPI app (GPay, PhonePe, Paytm, BHIM…)
// can scan/open this to pay the exact amount straight to your UPI ID.
export function buildUpiLink({ amount, note }) {
  const params = new URLSearchParams({
    pa: businessConfig.upiId,
    pn: businessConfig.upiPayeeName,
    am: Number(amount).toFixed(2),
    cu: 'INR',
    tn: note || `Payment to ${businessConfig.brandName}`,
  })
  return `upi://pay?${params.toString()}`
}

// Returns a PNG data URL suitable for <img src> or embedding in a PDF.
export async function buildUpiQrDataUrl({ amount, note }) {
  const link = buildUpiLink({ amount, note })
  return QRCode.toDataURL(link, {
    width: 400,
    margin: 1,
    color: { dark: '#1F4B3F', light: '#FFFFFF' },
  })
}
