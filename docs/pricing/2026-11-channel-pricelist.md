# Microsoft prices: November 2026 channel price list

Source: `CHANNEL_PRICELIST_NOV_2026.xlsx` (sheets NCE, PERPETUAL, SUBSCRIPTIONS, EST), supplied by the business.
Applied by the content migration `prisma/content-migrations/2026-11-microsoft-channel-pricelist.ts`.

## Rules used

- **Price shown:** the list's **ERP** column, exactly as listed, with **no margin added**.
  The earlier Microsoft 365 migration published ERP plus 25% (`MARGIN_PERCENT`), so the 365 and Office 365
  plans are now 20% lower than they were. To add a margin back, change the table in the migration.
- **Segment:** Commercial only. Education and Charity rows are not used.
- **Exact matches only:** a variant changes only where one list row matches its product title, term and billing plan.
- **A price that was edited by hand is left alone:** the migration moves a price only if it is still the value in the "Was" column.

## Prices changed

| SKU | List row | Was (₹) | Now (₹) | Change |
|---|---|---:|---:|---:|
| MS-M365-BB-A1 | Microsoft 365 Business Basic | 2,550 | 2,040 | -20% |
| MS-M365-BS-A1 | Microsoft 365 Business Standard | 12,900 | 10,320 | -20% |
| MS-M365-BP-A1 | Microsoft 365 Business Premium | 27,450 | 21,960 | -20% |
| MS-M365-BS-COPILOT-A1 | Microsoft 365 Business Standard with Copilot | 29,325 | 23,460 | -20% |
| MS-M365-BP-COPILOT-A1 | Microsoft 365 Business Premium with Copilot | 39,900 | 31,920 | -20% |
| MS-M365-E3-A1 | Microsoft 365 E3 | 48,675 | 38,940 | -20% |
| MS-M365-E5-A1 | Microsoft 365 E5 without Audio Conferencing | 74,850 | 59,880 | -20% |
| MS-M365-E7-A1 | Microsoft 365 E7 without Audio Conferencing | 123,525 | 98,820 | -20% |
| MS-O365-E1-A1 | Office 365 E1 | 12,450 | 9,960 | -20% |
| MS-O365-E3-A1 | Office 365 E3 | 32,475 | 25,980 | -20% |
| MS-O365-E5-A1 | Office 365 E5 without Audio Conferencing | 51,150 | 40,920 | -20% |
| MS-D365-SALESPRO-A1 | Dynamics 365 Sales Professional | 55,800 | 64,920 | +16% |
| MS-VISIO-P1-A1 | Visio Plan 1 | 6,000 | 4,980 | -17% |
| MS-VISIO-P2-A1 | Visio Plan 2 | 15,625 | 15,000 | -4% |
| MS-OFF-LTSC-PP24 | Office LTSC Professional Plus 2024 | 62,000 | 57,349 | -8% |
| MS-WIN11-PRO-UPG | Windows 11 Pro Upgrade | 15,600 | 15,887 | +2% |
| MS-WS2025-STD-2C | Windows Server 2025 Standard - 2 Core | 42,500 | 12,523 | -71% |
| MS-WS2025-STD-16C | Windows Server 2025 Standard - 16 Core License Pack | 340,000 | 99,915 | -71% |
| MS-WS2025-DC-2C | Windows Server 2025 Datacenter - 2 Core | 247,000 | 71,898 | -71% |
| MS-WS2025-UCAL | Windows Server 2025 - 1 User CAL | 3,200 | 4,299 | +34% |

Five articles that quote these prices were updated to match (Microsoft 365 Business Basic, Standard and Premium; Windows Server 2025 core licences; Windows 11 Pro upgrade), including their GST-inclusive figures at 18%.

## Not changed: needs a decision

| SKU | Product | Website (₹) | Why it was not matched |
|---|---|---:|---|
| MS-OFF-HB24-1PC | Microsoft Office Home & Business 2024 | 22,999 (sale 21,499) | Not in the list. |
| MS-ONEDRIVE-P2-A1 | Microsoft OneDrive for Business (Plan 2) | 11,063 | The list has only OneDrive Extra Storage add-ons. |
| MS-VS-ENT-A1 | Visual Studio Enterprise (annual) | 4,73,153 | The list has Visual Studio Professional 2026 only. |
| MS-SQL22-ENT-2C | SQL Server 2022 Enterprise, 2-core | 12,56,000 | The list has SQL Server 2025 (2-core ERP 12,84,859), not 2022. |
| MS-SQL22-STD-2C | SQL Server 2022 Standard, 2-core | 3,28,000 | List has SQL Server 2025 Standard 2-core at 3,35,140. |
| MS-SQL22-STD-SVR | SQL Server 2022 Standard, server licence | 78,000 | List has SQL Server 2025 Standard server licence at 83,925. |
| MS-SQL22-STD-CAL | SQL Server 2022 Standard, user CAL | 17,500 | List has SQL Server 2025 user CAL at 19,532. |
| MS-AZ-CSP-CONSUMP | Azure consumption | 3,500 | Consumption billing has no list price. |

If the SQL Server products are to move to SQL Server 2025, that is a product change, not only a price change.

## Other brands

The list covers Microsoft only. Adobe, Autodesk, Zoho, Corel and all hardware prices are unchanged.

## New in the list, not in the catalogue

The list's 28 "Add" rows (Microsoft 365 A2 for faculty and students, Microsoft Entra Global Secure Access, and others) are new products, and none was added.
