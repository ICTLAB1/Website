import { supabase } from './supabaseClient'

// Uploads the PDF blob to the public "invoices" storage bucket and inserts
// the tracking row. Returns { publicUrl, invoiceRow }.
export async function saveInvoice({
  invoiceNumber,
  orderId,
  shopkeeperId,
  repId,
  amount,
  paymentMode,
  paymentStatus,
  pdfBlob,
}) {
  const path = `${shopkeeperId}/${invoiceNumber}.pdf`

  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true })

  let publicUrl = null
  if (!uploadError) {
    const { data } = supabase.storage.from('invoices').getPublicUrl(path)
    publicUrl = data.publicUrl
  }

  const { data: row, error: insertError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      order_id: orderId,
      shopkeeper_id: shopkeeperId,
      rep_id: repId,
      amount,
      payment_mode: paymentMode,
      payment_status: paymentStatus,
      pdf_url: publicUrl,
    })
    .select()
    .single()

  if (insertError) throw insertError
  return { publicUrl, invoiceRow: row }
}
