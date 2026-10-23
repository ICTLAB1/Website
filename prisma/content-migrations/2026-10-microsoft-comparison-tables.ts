import type { ContentMigration } from "./types";

/**
 * What actually differs between the Microsoft plans.
 *
 * The business asked for a comparison table against the charts Microsoft
 * publishes, and supplied both: the Modern Work plan comparison for small and
 * medium business, and the one for enterprise. They are feature matrices with
 * no prices in them — the prices came from the screenshots and are already on
 * the catalogue rows — so this is the other half of the quote page: the figure
 * says what a plan costs, the table says what it is.
 *
 * ## Only the rows that differentiate
 *
 * Microsoft's charts run to roughly ninety rows each, and most of them are the
 * same mark in every column. A row that is identical across three plans helps
 * nobody choose between them, and eighty of those is how a comparison table
 * stops being read. Each table carries the rows where the plans actually
 * differ, in the charts' own order so related capabilities stay together.
 *
 * ## The add-on state is not an absence
 *
 * The charts use a filled circle for included and a plus for "can be added".
 * Reading only the circles — which the first extraction did — turned all 617
 * plus-marks in the enterprise chart into absences, and would have published
 * that Microsoft 365 E3 and E5 cannot have Copilot at all when the truth is
 * that they can buy it. Understating a plan is as wrong as overstating one and
 * is the easier mistake to ship, because it reads as conservative.
 *
 * ## Nothing here is written by hand
 *
 * Every cell is read out of the supplied chart by coordinate — each mark
 * matched to the column it sits under — rather than transcribed. A feature
 * matrix is a page of capability claims, and a hand-copied one is a page of
 * claims nobody can check against a source.
 */

const SOURCE =
  "From Microsoft's published Modern Work plan comparison, September 2026. Capabilities and their packaging are Microsoft's to change.";

const SMB_ROWS = [
      { label: "Audit logs and eDiscovery for agent activity", cells: ["no", "no", "yes"] },
      { label: "Desktop client apps", cells: ["no", "yes", "yes"] },
      { label: "Create and share Loop workspaces", cells: ["no", "yes", "yes"] },
      { label: "Microsoft Editor premium features", cells: ["no", "yes", "yes"] },
      { label: "Multilingual user interface for Microsoft 365 apps", cells: ["no", "yes", "yes"] },
      { label: "Microsoft Defender Antimalware", cells: ["no", "no", "yes"] },
      { label: "Microsoft Defender Firewall", cells: ["no", "no", "yes"] },
      { label: "Microsoft Defender for Business", cells: ["no", "no", "yes"] },
      { label: "BitLocker and BitLocker To Go", cells: ["no", "no", "yes"] },
      { label: "Windows Information Protection", cells: ["no", "no", "yes"] },
      { label: "Microsoft Defender for Office 365 Plan", cells: ["no", "no", "yes"] },
      { label: "Microsoft Defender XDR", cells: ["no", "no", "yes"] },
      { label: "Microsoft Security Exposure Management", cells: ["no", "no", "yes"] },
      { label: "Microsoft Intune Plan", cells: ["no", "no", "yes"] },
      { label: "Mobile application management", cells: ["no", "no", "yes"] },
      { label: "Windows Autopilot", cells: ["no", "no", "yes"] },
      { label: "Group Policy support for Windows", cells: ["no", "yes", "yes"] },
      { label: "Group Policy support for Microsoft 365 apps", cells: ["no", "yes", "yes"] },
      { label: "Office cloud policy support", cells: ["no", "yes", "yes"] },
      { label: "Shared computer activation for Microsoft 365 Apps", cells: ["no", "no", "yes"] },
      { label: "Endpoint Analytics", cells: ["no", "no", "yes"] },
      { label: "Microsoft Defender for Cloud Apps Discovery", cells: ["no", "no", "yes"] },
      { label: "Microsoft Entra ID 1 Free", cells: ["yes", "yes", "no"] },
      { label: "Microsoft Entra ID Plan", cells: ["no", "no", "yes"] },
      { label: "Microsoft Entra Internet Access for Microsoft Services", cells: ["no", "no", "yes"] },
      { label: "Cloud user self-service password reset", cells: ["no", "yes", "yes"] },
      { label: "Hybrid user self-service password change/reset with on-premises write-back", cells: ["no", "no", "yes"] },
      { label: "Multi Factor Authentication", cells: ["yes", "yes", "no"] },
      { label: "Conditional Access", cells: ["no", "no", "yes"] },
      { label: "Single sign-on (SSO)", cells: ["yes", "yes", "no"] },
      { label: "Windows Hello for Business", cells: ["no", "no", "yes"] },
      { label: "Azure Information Protection Plan 1", cells: ["no", "no", "yes"] },
];

const ENTERPRISE_ROWS = [
      { label: "Microsoft Copilot", cells: ["addon", "addon", "yes"] },
      { label: "Advanced agent usage insights", cells: ["no", "no", "yes"] },
      { label: "Agent map", cells: ["no", "no", "yes"] },
      { label: "Registry sync", cells: ["no", "no", "yes"] },
      { label: "Graph API", cells: ["no", "no", "yes"] },
      { label: "Agent Identity Governance", cells: ["no", "no", "yes"] },
      { label: "Lifecycle management for agents", cells: ["no", "no", "yes"] },
      { label: "Automate agent lifecycle actions", cells: ["no", "no", "yes"] },
      { label: "Tool controls for agents", cells: ["no", "no", "yes"] },
      { label: "Policy templates for agents", cells: ["no", "no", "yes"] },
      { label: "Communication compliance for agents", cells: ["no", "no", "yes"] },
      { label: "Data Security Posture Management for agents", cells: ["no", "no", "yes"] },
      { label: "Insider Risk Management for agents", cells: ["no", "no", "yes"] },
      { label: "Agents inherit and honor data sensitivity labels", cells: ["no", "no", "yes"] },
      { label: "Data loss prevention for agents", cells: ["no", "no", "yes"] },
      { label: "Secure Access Service Edge (SASE) for agents", cells: ["no", "no", "yes"] },
      { label: "Device compliance for agent conditional access", cells: ["no", "no", "yes"] },
      { label: "Policy controlled environment for agents runtime", cells: ["no", "no", "yes"] },
      { label: "Block unsanctioned local endpoint agents", cells: ["no", "yes", "yes"] },
      { label: "Discovery of AI on endpoints", cells: ["no", "yes", "yes"] },
      { label: "Threat Detection and Blocking for agents", cells: ["no", "no", "yes"] },
      { label: "Threat Hunting and Investigation for agents", cells: ["no", "no", "yes"] },
      { label: "Microsoft 365 for mobile", cells: ["no", "yes", "yes"] },
      { label: "Visio for the web", cells: ["no", "yes", "yes"] },
      { label: "Create and share Loop workspaces", cells: ["no", "yes", "yes"] },
      { label: "Microsoft Editor premium features", cells: ["no", "yes", "yes"] },
      { label: "Multilingual user interface for Microsoft 365 apps", cells: ["no", "yes", "yes"] },
      { label: "Secure Score", cells: ["no", "yes", "yes"] },
      { label: "Advanced Security", cells: ["no", "yes", "yes"] },
      { label: "Microsoft Defender for Identity", cells: ["no", "yes", "yes"] },
      { label: "Microsoft Security Exposure Management", cells: ["no", "yes", "yes"] },
      { label: "Microsoft Defender for Cloud Apps", cells: ["no", "yes", "yes"] },
];

export const microsoftComparisonTables: ContentMigration = {
  id: "2026-10-microsoft-comparison-tables",
  describe: "add the Microsoft plan comparison tables to the quote page",

  async apply(prisma) {
    const page = await prisma.page.findUnique({
      where: { slug: "get-a-quote/microsoft" },
      select: { id: true },
    });
    if (!page) return "no Microsoft quote page to add a comparison to; nothing changed";

    const existing = await prisma.pageSection.findFirst({
      where: { pageId: page.id, type: "COMPARISON_TABLE" },
      select: { id: true },
    });
    if (existing) return "the Microsoft quote page already has a comparison table; nothing changed";

    /*
     * Between the plan grid and the reasons to buy here. Somebody who has just
     * read the prices asks what the difference is before they ask who to buy
     * from, and the order of the page should follow the order of the question.
     */
    await prisma.pageSection.create({
      data: {
        pageId: page.id,
        type: "COMPARISON_TABLE",
        displayOrder: 22,
        visible: true,
        data: {
          heading: "What differs between the Business plans",
          description:
            "Up to 300 users. Rows where all three plans are the same are left out — this is what actually separates them.",
          columns: ["Business Basic", "Business Standard", "Business Premium"],
          groups: [{ heading: "Where the plans differ", rows: SMB_ROWS }],
          source: SOURCE,
        },
      },
    });

    await prisma.pageSection.create({
      data: {
        pageId: page.id,
        type: "COMPARISON_TABLE",
        displayOrder: 24,
        visible: true,
        data: {
          heading: "What differs between the Enterprise plans",
          description:
            "No seat ceiling. A plus means the capability can be added to that plan rather than being absent from it.",
          columns: ["Microsoft 365 E3", "Microsoft 365 E5", "Microsoft 365 E7"],
          groups: [{ heading: "Where the plans differ", rows: ENTERPRISE_ROWS }],
          source: SOURCE,
        },
      },
    });

    return `added 2 comparison tables (${SMB_ROWS.length} and ${ENTERPRISE_ROWS.length} rows) to /get-a-quote/microsoft`;
  },
};
