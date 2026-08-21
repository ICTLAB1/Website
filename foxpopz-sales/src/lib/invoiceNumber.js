import { supabase } from './supabaseClient'
import { businessConfig } from './businessConfig'

// Gets the next sequential number from Postgres (race-condition safe via
// the next_invoice_number() function) and formats it as e.g. FP-2026-0001.
export async function getNextInvoiceNumber() {
  const { data, error } = await supabase.rpc('next_invoice_number')
  if (error) throw error
  const padded = String(data).padStart(4, '0')
  return `${businessConfig.invoicePrefix}-${businessConfig.invoiceYear}-${padded}`
}
