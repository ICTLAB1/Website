import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { businessConfig } from './businessConfig'
import { formatDate } from './format'
import { numberToIndianWords } from './numberToWords'

// Brand palette matching the official Linav Superfoods letterhead
// (dark chocolate-brown + gold on cream), distinct from the app's own
// green/gold UI theme — this is a formal legal document, not app chrome.
const BROWN = [61, 40, 23]
const BROWN_DARK = [38, 24, 13]
const GOLD = [196, 149, 60]
const CREAM = [253, 250, 244]
const INK = [30, 26, 22]
const INK_SOFT = [110, 98, 88]
const LINE = [227, 214, 194]
const PAID_GREEN = [44, 110, 73]
const OWE_RED = [179, 67, 43]

/**
 * Builds a one-page A4 tax invoice styled after the official letterhead.
 */
export function buildInvoicePDF({
  invoiceNumber,
  date,
  shop,
  rep,
  items,
  discount = 0,
  total,
  paymentMode,
  paymentStatus,
  amountPaid,
  upiQrDataUrl,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 34
  let y = 0

  // Full-page cream background
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1.5)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)

  // ---------- Header: logo monogram + name + contact ----------
  y = 34
  const logoCx = margin + 30
  const logoCy = y + 22
  doc.setDrawColor(...BROWN)
  doc.setLineWidth(1.2)
  doc.circle(logoCx, logoCy, 28, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...BROWN)
  doc.text('L', logoCx, logoCy + 7, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...BROWN)
  doc.text('LINAV', margin + 66, y + 14)
  doc.setTextColor(...GOLD)
  doc.text('SUPERFOODS', margin + 66, y + 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...INK_SOFT)
  doc.text(`— ${businessConfig.tagline.toUpperCase()} —`, margin + 66, y + 46)

  // right side: legal name + CIN + address + contact
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...BROWN)
  doc.text(businessConfig.legalName.toUpperCase(), pageWidth - margin, y + 8, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...INK_SOFT)
  doc.text(`CIN: ${businessConfig.cin}`, pageWidth - margin, y + 20, { align: 'right' })
  doc.text(businessConfig.address, pageWidth - margin, y + 32, { align: 'right', maxWidth: 260 })
  doc.text(`${businessConfig.phone}  |  ${businessConfig.email}`, pageWidth - margin, y + 56, { align: 'right' })

  y += 74
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  // ---------- Badge row: FSSAI / GSTIN / UDYAM / TAX INVOICE box ----------
  const badgeW = (pageWidth - margin * 2 - 150 - 16) / 3
  const badges = [
    ['FSSAI LIC. NO.', businessConfig.fssaiLicense],
    ['GSTIN', businessConfig.gstin],
    ['UDYAM', businessConfig.udyam],
  ]
  badges.forEach(([label, value], i) => {
    const bx = margin + i * (badgeW + 8)
    doc.setDrawColor(...LINE)
    doc.roundedRect(bx, y, badgeW, 40, 4, 4, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...INK_SOFT)
    doc.text(label, bx + badgeW / 2, y + 15, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    doc.text(value || '-', bx + badgeW / 2, y + 29, { align: 'center', maxWidth: badgeW - 6 })
  })

  const invBoxX = pageWidth - margin - 150
  doc.setFillColor(...BROWN_DARK)
  doc.rect(invBoxX, y, 150, 16, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text('TAX INVOICE', invBoxX + 75, y + 11, { align: 'center' })
  doc.setDrawColor(...LINE)
  doc.rect(invBoxX, y + 16, 150, 24, 'S')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  doc.text(`No: ${invoiceNumber}`, invBoxX + 8, y + 27)
  doc.text(`Date: ${formatDate(date)}`, invBoxX + 8, y + 38)

  y += 54

  // ---------- Bill To / Bank details ----------
  const colW = (pageWidth - margin * 2 - 12) / 2
  const boxTop = y
  const boxH = 88

  doc.setDrawColor(...LINE)
  doc.roundedRect(margin, boxTop, colW, boxH, 5, 5, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...BROWN)
  doc.text('BILL TO', margin + 10, boxTop + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...INK)
  let by = boxTop + 32
  doc.setFont('helvetica', 'bold')
  doc.text(shop.shop_name || '-', margin + 10, by)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  if (shop.owner_name) { by += 13; doc.text(shop.owner_name, margin + 10, by) }
  if (shop.phone) { by += 13; doc.text(shop.phone, margin + 10, by) }
  if (shop.address || shop.area) { by += 13; doc.text([shop.address, shop.area].filter(Boolean).join(', '), margin + 10, by, { maxWidth: colW - 20 }) }

  const bankX = margin + colW + 12
  doc.roundedRect(bankX, boxTop, colW, boxH, 5, 5, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...BROWN)
  doc.text('BANK DETAILS', bankX + 10, boxTop + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK)
  let bky = boxTop + 32
  doc.setFont('helvetica', 'bold')
  doc.text(businessConfig.bank.name, bankX + 10, bky)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  bky += 13; doc.text(businessConfig.bank.branch, bankX + 10, bky, { maxWidth: colW - 20 })
  bky += 22; doc.text(`A/c No: ${businessConfig.bank.accountNo}`, bankX + 10, bky)
  bky += 12; doc.text(`IFSC: ${businessConfig.bank.ifsc}  ·  ${businessConfig.bank.accountType}`, bankX + 10, bky)

  y = boxTop + boxH + 18

  // ---------- Line items table ----------
  const hasGst = Boolean(businessConfig.gstin)
  const gstRate = businessConfig.defaultGstRate || 0
  const halfGst = gstRate / 2
  const hasMrp = items.some((it) => it.mrp)

  const head = [[
    '#', 'Description of Goods', 'HSN/SAC', ...(hasMrp ? ['MRP'] : []), 'Qty', 'Rate (Rs.)', 'Amount (Rs.)',
  ]]
  const body = items.map((it, i) => {
    const row = [String(i + 1), it.product_name, it.hsn_sac || '-']
    if (hasMrp) row.push(it.mrp ? Number(it.mrp).toFixed(2) : '-')
    row.push(String(it.qty), Number(it.unit_price).toFixed(2), Number(it.subtotal).toFixed(2))
    return row
  })

  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: margin, right: margin },
    styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, cellPadding: 6, lineColor: LINE, lineWidth: 0.5 },
    headStyles: { fillColor: BROWN, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 244, 235] },
  })

  y = doc.lastAutoTable.finalY + 16

  // ---------- Amount in words ----------
  const subtotal = items.reduce((s, it) => s + Number(it.subtotal), 0)
  const taxable = subtotal - Number(discount || 0)
  const cgst = hasGst ? (taxable * halfGst) / 100 : 0
  const sgst = hasGst ? (taxable * halfGst) / 100 : 0
  const grandTotal = taxable + cgst + sgst
  const mrpTotal = items.reduce((s, it) => s + (Number(it.mrp || it.unit_price) * Number(it.qty)), 0)
  const savings = mrpTotal - subtotal

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BROWN)
  doc.text('Amount in Words:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text(numberToIndianWords(grandTotal), margin, y + 12, { maxWidth: pageWidth - margin * 2 - 190 })

  // ---------- Totals box ----------
  const totalsW = 170
  const totalsX = pageWidth - margin - totalsW
  let ty = y - 4
  const totalsRows = [
    ['Sub Total', subtotal],
    ...(discount > 0 ? [['Discount', -discount]] : []),
    ['Taxable Value', taxable],
    ...(hasGst ? [[`CGST @ ${halfGst}%`, cgst], [`SGST @ ${halfGst}%`, sgst]] : []),
  ]
  doc.setFontSize(8.5)
  totalsRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK_SOFT)
    doc.text(label, totalsX, ty)
    doc.text(Number(val).toFixed(2), pageWidth - margin, ty, { align: 'right' })
    ty += 14
  })
  doc.setDrawColor(...GOLD)
  doc.line(totalsX, ty, pageWidth - margin, ty)
  ty += 16
  doc.setFillColor(...BROWN)
  doc.rect(totalsX - 8, ty - 12, totalsW + 8, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('GRAND TOTAL', totalsX, ty + 2)
  doc.text(`Rs. ${grandTotal.toFixed(2)}`, pageWidth - margin, ty + 2, { align: 'right' })

  y = Math.max(y + 60, ty + 30)

  // ---------- Payment status ----------
  const isPaid = paymentStatus === 'paid'
  doc.setFillColor(...(isPaid ? [229, 240, 232] : [247, 230, 224]))
  doc.roundedRect(margin, y, pageWidth - margin * 2, 40, 6, 6, 'F')
  doc.setTextColor(...(isPaid ? PAID_GREEN : OWE_RED))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  const modeLabel = { cash: 'Cash', upi: 'UPI', credit: 'Credit' }[paymentMode] || paymentMode
  doc.text(isPaid ? `PAID via ${modeLabel}` : `PAYMENT DUE — Rs. ${(grandTotal - Number(amountPaid || 0)).toFixed(2)}`, margin + 12, y + 17)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (isPaid) {
    doc.text(`Amount received: Rs. ${Number(amountPaid).toFixed(2)}`, margin + 12, y + 30)
  } else if (Number(amountPaid) > 0) {
    doc.text(`Rs. ${Number(amountPaid).toFixed(2)} received so far · scan QR below for the balance`, margin + 12, y + 30)
  } else {
    doc.text('Scan the QR code below to pay via UPI', margin + 12, y + 30)
  }
  y += 54

  // ---------- Terms & Conditions ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BROWN)
  doc.text('Terms & Conditions', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...INK_SOFT)
  businessConfig.terms.forEach((term, i) => {
    doc.text(`${i + 1}. ${term}`, margin, y + 12 + i * 11)
  })

  // ---------- Scan & Pay QR (bottom-left) ----------
  const qrY = y + 12 + businessConfig.terms.length * 11 + 14
  if (upiQrDataUrl) {
    const qrSize = 72
    doc.setDrawColor(...LINE)
    doc.roundedRect(margin, qrY, qrSize + 130, qrSize + 16, 6, 6, 'S')
    doc.addImage(upiQrDataUrl, 'PNG', margin + 8, qrY + 8, qrSize, qrSize)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BROWN)
    doc.text('SCAN & PAY', margin + qrSize + 18, qrY + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...INK_SOFT)
    doc.text(businessConfig.upiPayeeName, margin + qrSize + 18, qrY + 34)
    doc.text('UPI ID:', margin + qrSize + 18, qrY + 47)
    doc.setTextColor(...OWE_RED)
    doc.text(businessConfig.upiId, margin + qrSize + 18, qrY + 58)
  }

  // ---------- Footer bar ----------
  doc.setFillColor(...BROWN_DARK)
  doc.rect(10, pageHeight - 44, pageWidth - 20, 34, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GOLD)
  doc.text(
    `GSTIN: ${businessConfig.gstin}   |   UDYAM: ${businessConfig.udyam}   |   Startup India Recognized · Certificate No: ${businessConfig.startupIndiaCert}`,
    pageWidth / 2, pageHeight - 30, { align: 'center' }
  )
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('Quality You Can Trust', pageWidth / 2, pageHeight - 16, { align: 'center' })

  return doc
}

export function downloadInvoice(doc, invoiceNumber) {
  doc.save(`${invoiceNumber}.pdf`)
}

export function getInvoiceBlob(doc) {
  return doc.output('blob')
}
