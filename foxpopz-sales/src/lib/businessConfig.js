export const businessConfig = {
  legalName: 'Linav Superfoods Private Limited',
  brandName: 'FoxPopz',
  tagline: 'Nourishing A Better You',
  address: '110, Top Floor, Sainik Vihar, Pitampura, North West Delhi, Delhi 110034, India',
  gstin: '07AAGCL4933J1ZA',
  pan: 'AAGCL4933J',
  cin: 'U46309DL2025PTC455477',
  fssaiLicense: '13325998000675',
  udyam: 'UDYAM-DL-06-0176936',
  startupIndiaCert: 'DIPP225414',
  phone: '+91-9711492098',
  email: 'info@linavsuperfoods.com',

  // Payee for the UPI QR code. Format: yourname@bankhandle (e.g. foxpopz@okhdfcbank)
  // NOTE: your letterhead shows "linavsuperfoods@idfcfirst" — you had separately
  // typed "linavsuperfoods@idfcbank" earlier. These don't match; please confirm
  // the correct one before going live, since this is where payments land.
  upiId: 'linavsuperfoods@idfcfirst',
  upiPayeeName: 'Linav Superfoods Pvt Ltd',

  // Printed in the invoice's bank details box, for NEFT/RTGS/cheque payers.
  bank: {
    name: 'IDFC FIRST Bank',
    branch: 'JNW (PVRI) Branch, Ground Floor, B-1/515, West Delhi - 110058',
    accountNo: '10247927687',
    ifsc: 'IDFB0020121',
    accountType: 'Current Account',
  },

  // Invoice numbering, e.g. FP-2026-0001
  invoicePrefix: 'FP',
  invoiceYear: new Date().getFullYear(),

  // Set to a logo image URL (or a base64 data URI) to print on the invoice.
  // Leave null to use a typeset wordmark instead.
  logoUrl: null,

  // Printed at the bottom of every invoice.
  footerNote: 'Thank you for your business! For queries, contact us at the number above.',
  terms: [
    'Goods once sold will not be taken back or exchanged.',
    'Interest @ 24% p.a. will be charged on overdue payments.',
    'Subject to Delhi Jurisdiction only.',
  ],

  // GST rate applied if gstin is set and a product doesn't specify its own rate.
  // Split evenly into CGST + SGST on the invoice (intra-state sale).
  defaultGstRate: 5,
}
