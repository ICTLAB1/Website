/**
 * The certifications this company actually holds.
 *
 * Every value here was transcribed from the certificate PDF itself — the
 * standard, the certificate number, the issuing body, the scope, and both
 * dates. None of it is inferred, rounded or tidied up, because the whole point
 * of publishing a certificate number is that a customer can check it, and a
 * number that does not match the certificate is worse than no number at all.
 *
 * When one is renewed, the certificate changes and so must this — or, more
 * usually, the row is edited at /admin/certifications and this file is refreshed
 * by `npm run content:export`.
 */

export type CertificationSeed = {
  standard: string;
  title: string;
  reference: string;
  issuer: string;
  verifyUrl: string | null;
  scope: string;
  /** ISO date, as printed on the certificate. */
  issuedAt: string;
  expiresAt: string | null;
  displayOrder: number;
};

/**
 * All three certificates state the same scope, word for word. It is repeated
 * rather than shared, so that renewing one and re-transcribing its scope cannot
 * silently rewrite the other two.
 */
export const certifications: CertificationSeed[] = [
  {
    standard: "ISO 9001:2015",
    title: "Quality Management System",
    reference: "734BAC3A",
    issuer: "Ranalysis Certification Pvt. Ltd.",
    verifyUrl: "https://www.ranalysiscert.com",
    scope:
      "Providing software licensing services, cloud and productivity solutions, business email and collaboration tools, IT hardware and accessories supply, and data security and protection solutions.",
    issuedAt: "2026-07-25",
    expiresAt: "2029-07-24",
    displayOrder: 10,
  },
  {
    standard: "ISO 27001:2022",
    title: "Information Security Management System",
    reference: "D677CBA3",
    issuer: "Ranalysis Certification Pvt. Ltd.",
    verifyUrl: "https://www.ranalysiscert.com",
    scope:
      "Providing software licensing services, cloud and productivity solutions, business email and collaboration tools, IT hardware and accessories supply, and data security and protection solutions.",
    issuedAt: "2026-07-18",
    expiresAt: "2029-07-17",
    displayOrder: 20,
  },
  {
    standard: "ISO/IEC 20000-1:2018",
    title: "IT Service Management System",
    reference: "26MEITWH81",
    issuer: "Magnitude Management Services Pvt. Ltd.",
    verifyUrl: "https://www.mmscertification.com/activeclients.aspx",
    scope:
      "Providing software licensing services, cloud and productivity solutions, business email and collaboration tools, IT hardware and accessories supply, and data security and protection solutions.",
    issuedAt: "2026-07-20",
    expiresAt: "2029-07-19",
    displayOrder: 30,
  },
  /*
   * Government recognitions, not third-party audited standards — no periodic
   * surveillance, no accreditation body of the ISO kind. Held to the same
   * transcription rule anyway: every value below is copied from the
   * certificate PDF, nothing rounded or inferred.
   */
  {
    standard: "Udyam Registration",
    title: "Micro Enterprise (MSME)",
    reference: "UDYAM-DL-06-0022244",
    issuer: "Ministry of Micro, Small and Medium Enterprises, Government of India",
    // The certificate's own footer names this domain as where a registration
    // is looked up; no deep link to this specific record is printed on it.
    verifyUrl: "https://udyamregistration.gov.in",
    scope:
      "Computer consultancy and computer facilities management, software installation, and other information technology and computer service activities; wholesale of software.",
    issuedAt: "2021-07-22",
    // No expiry is printed on a Udyam certificate — see the note on
    // `expiresAt` in schema.prisma before assuming this is an oversight.
    expiresAt: null,
    displayOrder: 40,
  },
  {
    standard: "Startup India",
    title: "DPIIT-Recognized Startup",
    reference: "DIPP208811",
    issuer:
      "Department for Promotion of Industry and Internal Trade, Ministry of Commerce & Industry, Government of India",
    // A QR code is printed for verification; no URL is printed as text, and
    // none is invented here.
    verifyUrl: null,
    scope: "IT Services industry, IT Consulting sector, as self-certified by the company.",
    issuedAt: "2025-06-20",
    // Ten years from incorporation (14-04-2021), and only while turnover
    // stays under ₹100 crore in every financial year — a condition this
    // column cannot express, so it is left out of `scope` rather than
    // half-stated.
    expiresAt: "2031-04-13",
    displayOrder: 50,
  },
];
