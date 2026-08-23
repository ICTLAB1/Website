import { writeFileSync } from "node:fs";

import { renderQuotationPdf } from "@/lib/pdf/quotation";


/**
 * The sample's lines, repeated to whatever length is being tested.
 *
 * The layout suite renders this at 1, 5, 10, 20 and 50-odd items, because a
 * table that is right for six can be wrong for one and wrong for fifty — and
 * each of those failures is invisible until somebody quotes that many things.
 * The part numbers are made distinct so a page-break bug shows up as a missing
 * or repeated line rather than as an identical one nobody notices.
 */
function repeat<T extends { sku: string }>(source: T[], count = Number(process.argv[3] ?? source.length)): T[] {
  const out: T[] = [];
  for (let index = 0; index < count; index += 1) {
    const base = source[index % source.length]!;
    out.push({ ...base, sku: `${base.sku}-${String(index + 1).padStart(2, "0")}` });
  }
  return out;
}

const party = {
  name: "MIT ADT University",
  addressLines: ["Loni Kalbhor, Solapur Highway", "Pune, Maharashtra 412201", "India"],
  gstin: "27AAAJM2218H1ZD",
  pan: null,
  contactName: "Dr. Suresh Rao",
  phone: "+91 70888 28088",
  email: "itpurchase@example.edu.in",
  state: "Maharashtra",
};

const bytes = renderQuotationPdf({
  reference: "QTE-2026-4F7K2P",
  documentNo: "TZ/QT/2026-27/0042",
  referenceNo: "ENQ-2026-9XM4TQ",
  version: 2,
  currency: "INR",
  subtotalMinor: 112317100,
  discountMinor: 4064000,
  taxMinor: 20217078,
  totalMinor: 132534178,
  validUntil: new Date("2026-09-16"),
  issuedAt: new Date("2026-08-17"),
  notes:
    "Thank you for your enquiry. We are pleased to submit our best offer for the Microsoft licensing and endpoint security requirement discussed. All pricing below is inclusive of deployment support.",
  status: "SENT",
  paymentTerms: "50% advance, balance on delivery",
  customerReference: "PO/MITADT/2425/078",
  deliveryTerms: "4-6 weeks from confirmed order",
  salesExecutive: "Abhinav Jain",
  quotedTo: party,
  billing: party,
  shipping: {
    ...party,
    addressLines: ["Rajbaug Campus, Gate No. 2", "Loni Kalbhor, Maharashtra 412201", "India"],
  },
  lines: repeat([
    {
      productName: "Microsoft 365 Business Standard",
      description: "Annual subscription - includes Office apps, Exchange, Teams, SharePoint",
      brandName: "Microsoft",
      sku: "CFQ7TTC0LH18",
      hsnCode: "997331",
      quantity: 60,
      unitLabel: "Users",
      unitPriceMinor: 560000,
      discountMinor: 1680000,
      gstRatePercent: 18,
      lineTotalMinor: 31920000,
    },
    {
      productName: "Microsoft 365 Business Premium",
      description: "Annual subscription - advanced security, Intune device management",
      brandName: "Microsoft",
      sku: "CFQ7TTC0LCHC",
      hsnCode: "997331",
      quantity: 15,
      unitLabel: "Users",
      unitPriceMinor: 890000,
      discountMinor: 667500,
      gstRatePercent: 18,
      lineTotalMinor: 12682500,
    },
    {
      productName: "Windows 11 Pro",
      description: "OEM licence, per device",
      brandName: "Microsoft",
      sku: "FQC-10529",
      hsnCode: "997331",
      quantity: 25,
      unitLabel: "Nos",
      unitPriceMinor: 1150000,
      discountMinor: 0,
      gstRatePercent: 18,
      lineTotalMinor: 28750000,
    },
    {
      productName: "Kaspersky Endpoint Security for Business",
      description: "Advanced tier, 1-year licence",
      brandName: "Kaspersky",
      sku: "KL4867XAKFS",
      hsnCode: "997331",
      quantity: 100,
      unitLabel: "Nodes",
      unitPriceMinor: 145000,
      discountMinor: 1160000,
      gstRatePercent: 18,
      lineTotalMinor: 13340000,
    },
    {
      productName: "Implementation and Migration Support",
      description: "Tenant setup, mailbox migration, on-site handover and admin training",
      brandName: null,
      sku: "SVC-IMPL-01",
      hsnCode: "998313",
      quantity: 1,
      unitLabel: "Project",
      unitPriceMinor: 8500000,
      discountMinor: 0,
      gstRatePercent: 18,
      lineTotalMinor: 8500000,
    },
    {
      productName: "HP ProBook 450 G10 Notebook",
      description: "Core i5-1335U, 16 GB, 512 GB SSD, Windows 11 Pro",
      brandName: "HP",
      sku: "9X4M2PA",
      hsnCode: "847130",
      quantity: 12,
      unitLabel: "Nos",
      unitPriceMinor: 6800000,
      discountMinor: 556600,
      gstRatePercent: 18,
      lineTotalMinor: 17124600,
    },
  ]),
  config: {
    tradingName: "TechZoid",
    legalName: "TechZoid Technologies Private Limited",
    entityName: "TechZoid Technologies Private Limited",
    tagline: "One procurement partner. Multiple technology brands.",
    url: "https://www.techzoidtechnologies.com",
    email: { sales: "sales@techzoidtechnologies.com", support: null, enterprise: null },
    phone: { sales: "+91 98765 43210", support: null },
    grievance: { name: null, email: null, phone: null },
    address: {
      line1: "407, 4th Floor, Pearl Business Park",
      line2: "Netaji Subhash Place, Pitampura",
      city: "New Delhi",
      state: "Delhi",
      postcode: "110034",
      country: "India",
    },
    hasAddress: true,
    formattedAddress: null,
    gstin: "07AAICT5606J1Z4",
    cin: "U72900DL2021PTC380025",
    supportHours: null,
    quoteTerms:
      "Prices are exclusive of any charges not stated above.\nDelivery within 5 to 7 working days of a confirmed purchase order, subject to publisher availability.\nLicence keys are issued to the registered administrator email address on record.\nThis quotation is an offer to supply and does not reserve stock or pricing beyond the validity date.\nAny statutory levy introduced after the date of this quotation will apply at actuals.",
    rates: { USD: null, AED: null },
    secondaryEntity: {
      name: "TechZoid Technologies \u2014 UAE office",
      address: "Office C1-1F-SF2571, Ajman Free Zone C1 Building, Ajman Free Zone, Dubai",
      phone: "+971 58 939 7239",
      registrations: [
        { label: "Business License", value: "42287" },
        { label: "Tax Registration Number", value: "105122230300001" },
      ],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  certifications: [
    { standard: "ISO 9001:2015", title: "Quality Management System", reference: "QMS-0001" },
    { standard: "ISO 27001:2022", title: "Information Security Management System", reference: "ISMS-0001" },
    { standard: "ISO/IEC 20000-1:2018", title: "IT Service Management System", reference: "ITSM-0001" },
  ],
  accreditations: [],
  technologyPartners: [],
  logo: null,
  banking: {
    bankName: "Sample Bank",
    accountName: "TechZoid Technologies Private Limited",
    accountNumber: "000000000000",
    ifsc: "SMPL0000001",
    branch: "Pitampura",
  },
  terms: [
    "Quotation is valid for 30 days from the date of issue unless otherwise specified.",
    "Prices are exclusive of applicable GST, taxes, duties, freight and other charges unless specifically stated otherwise.",
    "Product, service and availability are subject to confirmation at the time of order.",
    "Order confirmation is subject to receipt and acceptance of a valid Purchase Order and/or payment, as applicable.",
    "Delivery timelines are indicative and may vary depending on product availability, manufacturer/distributor schedules and logistics.",
    "Product specifications, models and availability may be subject to change by the respective manufacturer without prior notice.",
    "Hardware products are subject to the applicable manufacturer's warranty and support terms.",
    "All disputes shall be subject to the jurisdiction of the courts at New Delhi, India.",
  ].join("\n"),
});

writeFileSync(process.argv[2] ?? "/tmp/quotation.pdf", bytes);
console.log(`${bytes.length} bytes`);
