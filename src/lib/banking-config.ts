import "server-only";
import { optionalEnv } from "@/lib/env";

/**
 * Bank transfer details for invoicing.
 *
 * Deliberately kept out of `site-config.ts`: that module's values are read by
 * page components across the site, including ones that pass config into
 * Client Components as props. Bank account and UPI details must never travel
 * that path. Import this only from server-only code that sends email
 * directly (currently `order-service.ts`) - never from a page or a component
 * that could pass it down as a prop.
 *
 * Returns null unless every field is configured: partial payment instructions
 * (an account number with no IFSC, say) are worse than none.
 */
export type BankingDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  accountType: string;
  branch: string;
  upiId: string | null;
};

export function getBankingDetails(): BankingDetails | null {
  const bankName = optionalEnv("COMPANY_BANK_NAME");
  const accountName = optionalEnv("COMPANY_BANK_ACCOUNT_NAME");
  const accountNumber = optionalEnv("COMPANY_BANK_ACCOUNT_NUMBER");
  const ifsc = optionalEnv("COMPANY_BANK_IFSC");
  const accountType = optionalEnv("COMPANY_BANK_ACCOUNT_TYPE");
  const branch = optionalEnv("COMPANY_BANK_BRANCH");

  if (!bankName || !accountName || !accountNumber || !ifsc || !accountType || !branch) {
    return null;
  }

  return {
    bankName,
    accountName,
    accountNumber,
    ifsc,
    accountType,
    branch,
    upiId: optionalEnv("COMPANY_UPI_ID") ?? null,
  };
}
