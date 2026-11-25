#!/usr/bin/env python3
"""Builds prisma/content-migrations/microsoft-products.generated.ts: established Microsoft commercial products
the catalogue lacked, as quote-only products. Written from general knowledge (Microsoft's own pages could not be
read from the build environment); names and descriptions are for the owner to confirm. No prices, no part numbers."""
import json,re
# slug, name, category, licence('S' annual subscription, 'P' perpetual, 'V' volume/CAL), what it is
P=[
("microsoft-365-apps-for-business","Microsoft 365 Apps for business","microsoft-365-plans","S","The Office desktop applications on a subscription for organisations, with OneDrive cloud storage but without hosted email."),
("microsoft-365-apps-for-enterprise","Microsoft 365 Apps for enterprise","microsoft-365-plans","S","The Office desktop applications on a subscription for larger organisations, with enterprise deployment and management options, without hosted email."),
("microsoft-365-f3","Microsoft 365 F3","microsoft-365-plans","S","Microsoft 365 for frontline workers: web and mobile apps, email and Teams at a lighter level than the standard business plans."),
("office-365-f3","Office 365 F3","microsoft-365-plans","S","The Office 365 plan for frontline workers: web and mobile Office apps, email and Teams."),
("microsoft-365-copilot","Microsoft 365 Copilot","microsoft-365-plans","S","Microsoft's AI assistant add-on for Microsoft 365, working across Word, Excel, PowerPoint, Outlook and Teams, for users who already hold an eligible Microsoft 365 plan."),
("exchange-online-plan-1","Exchange Online (Plan 1)","email-collaboration","S","Hosted business email, calendar and contacts on Microsoft's cloud."),
("exchange-online-plan-2","Exchange Online (Plan 2)","email-collaboration","S","Hosted business email with a larger mailbox and more archiving and compliance capability than Plan 1."),
("sharepoint-online-plan-1","SharePoint Online (Plan 1)","productivity-collaboration","S","SharePoint sites and document libraries for team sites and company intranets."),
("sharepoint-online-plan-2","SharePoint Online (Plan 2)","productivity-collaboration","S","SharePoint Online with additional content and compliance capabilities beyond Plan 1."),
("microsoft-teams-essentials","Microsoft Teams Essentials","productivity-collaboration","S","Microsoft Teams meetings, chat and file sharing as a standalone plan for small businesses."),
("microsoft-teams-phone-standard","Microsoft Teams Phone Standard","productivity-collaboration","S","A cloud phone system inside Teams, with calling, voicemail and call routing, as an add-on licence; calling plans or carrier connection are arranged separately."),
("microsoft-teams-premium","Microsoft Teams Premium","productivity-collaboration","S","An add-on licence that adds advanced meeting protection and productivity features to Microsoft Teams."),
("microsoft-teams-rooms-pro","Microsoft Teams Rooms Pro","productivity-collaboration","S","The licence for a Microsoft Teams meeting-room device, bought per room."),
("microsoft-teams-audio-conferencing","Microsoft Teams Audio Conferencing","productivity-collaboration","S","Dial-in access to Teams meetings by phone, as an add-on licence."),
("microsoft-project-plan-1","Microsoft Project Plan 1","business-applications","S","Web-based project planning and tracking."),
("microsoft-project-plan-3","Microsoft Project Plan 3","business-applications","S","Project management with the desktop client and cloud services."),
("microsoft-project-plan-5","Microsoft Project Plan 5","business-applications","S","Project Plan 3 with added portfolio and resource management capabilities."),
("microsoft-project-professional-2024","Microsoft Project Professional 2024","business-applications","P","Desktop project management software sold as a one-time purchase."),
("microsoft-project-standard-2024","Microsoft Project Standard 2024","business-applications","P","Desktop project management software sold as a one-time purchase, at the standard level."),
("microsoft-visio-professional-2024","Microsoft Visio Professional 2024","business-applications","P","Desktop diagramming software sold as a one-time purchase, with more templates and data-linking features than Standard."),
("microsoft-visio-standard-2024","Microsoft Visio Standard 2024","business-applications","P","Desktop diagramming software sold as a one-time purchase, at the standard level."),
("windows-11-enterprise-e3","Windows 11 Enterprise E3","desktop-os","S","Windows 11 Enterprise on a per-user subscription, with enterprise security and management features."),
("windows-11-enterprise-e5","Windows 11 Enterprise E5","desktop-os","S","Windows 11 Enterprise E3 with advanced security capabilities added."),
("windows-365-business","Windows 365 Business","desktop-os","S","A Cloud PC: a Windows desktop streamed from Microsoft's cloud to the user's own device, for small and mid-sized businesses."),
("windows-365-enterprise","Windows 365 Enterprise","desktop-os","S","A Cloud PC for larger organisations, managed alongside the company's other Windows devices."),
("windows-server-2025-essentials","Windows Server 2025 Essentials","server-os","V","The Windows Server edition for small businesses with a limited number of users."),
("windows-server-cal-device","Windows Server 2025 Device CAL","server-os","V","A client access licence for Windows Server, bought per device."),
("windows-server-rds-cal-user","Windows Server 2025 Remote Desktop Services User CAL","server-os","V","A client access licence for Remote Desktop Services, bought per user."),
("windows-server-rds-cal-device","Windows Server 2025 Remote Desktop Services Device CAL","server-os","V","A client access licence for Remote Desktop Services, bought per device."),
("sql-server-2022-user-cal","SQL Server 2022 User CAL","database-servers","V","A client access licence for SQL Server Standard, bought per user."),
("sql-server-2022-device-cal","SQL Server 2022 Device CAL","database-servers","V","A client access licence for SQL Server Standard, bought per device."),
("visual-studio-professional","Visual Studio Professional","business-applications","S","The Visual Studio developer tools and services subscription at the professional level."),
("power-apps-premium","Microsoft Power Apps Premium","business-applications","S","A per-user licence to build and run business apps on the Power Platform, including premium connectors."),
("power-automate-premium","Microsoft Power Automate Premium","business-applications","S","A per-user licence for workflow automation, including premium connectors and desktop automation."),
("microsoft-copilot-studio","Microsoft Copilot Studio","business-applications","S","A platform for building custom copilots and agents, licensed by subscription."),
("dynamics-365-sales-enterprise","Dynamics 365 Sales Enterprise","crm-sales","S","Microsoft's CRM for sales teams, at the enterprise level."),
("dynamics-365-customer-service-professional","Dynamics 365 Customer Service Professional","crm-sales","S","Case management and customer service for smaller service teams."),
("dynamics-365-customer-service-enterprise","Dynamics 365 Customer Service Enterprise","crm-sales","S","Customer service for larger teams, with omnichannel and knowledge management capabilities."),
("dynamics-365-field-service","Dynamics 365 Field Service","crm-sales","S","Work-order scheduling and dispatch for field technicians."),
("dynamics-365-business-central-essentials","Dynamics 365 Business Central Essentials","finance-accounting","S","Cloud business-management and ERP software for small and mid-sized businesses, at the Essentials level."),
("dynamics-365-business-central-premium","Dynamics 365 Business Central Premium","finance-accounting","S","Business Central with added service-order and manufacturing capabilities."),
("dynamics-365-finance","Dynamics 365 Finance","finance-accounting","S","Cloud financial management for larger organisations."),
("dynamics-365-supply-chain-management","Dynamics 365 Supply Chain Management","business-suites","S","Cloud supply chain, inventory and manufacturing management for larger organisations."),
("dynamics-365-project-operations","Dynamics 365 Project Operations","business-suites","S","Project-based business management covering quoting, delivery and billing."),
("microsoft-defender-for-business","Microsoft Defender for Business","endpoint-protection","S","Endpoint protection for small and mid-sized businesses."),
("microsoft-defender-for-endpoint-plan-1","Microsoft Defender for Endpoint Plan 1","endpoint-protection","S","Endpoint protection with the core prevention capabilities."),
("microsoft-defender-for-endpoint-plan-2","Microsoft Defender for Endpoint Plan 2","endpoint-protection","S","Defender for Endpoint Plan 1 with endpoint detection and response added."),
("microsoft-defender-for-office-365-plan-1","Microsoft Defender for Office 365 Plan 1","security-endpoint","S","Protection for email and collaboration against phishing and malicious attachments and links."),
("microsoft-defender-for-office-365-plan-2","Microsoft Defender for Office 365 Plan 2","security-endpoint","S","Defender for Office 365 Plan 1 with investigation, hunting and response capabilities added."),
("microsoft-entra-id-p1","Microsoft Entra ID P1","identity-access","S","Cloud identity and access management with conditional access and self-service features."),
("microsoft-entra-id-p2","Microsoft Entra ID P2","identity-access","S","Entra ID P1 with identity protection and identity governance added."),
("microsoft-intune-plan-1","Microsoft Intune Plan 1","identity-access","S","Cloud management of devices and apps."),
]
LIC={"S":("SUBSCRIPTION_ANNUAL",12),"P":("PERPETUAL",None),"V":("VOLUME",None)}
out=[]
for slug,name,cat,lic,what in P:
    full=name if name.startswith(("Microsoft","Windows","Office","Exchange","SharePoint","OneDrive","Dynamics","SQL","Visual","Power")) else "Microsoft "+name
    out.append({"slug":slug,"name":name,"category":cat,"licenceType":LIC[lic][0],"termMonths":LIC[lic][1],
      "shortDescription":what,
      "description":f"{what}\n\nMicrosoft pricing depends on the licensing programme, the term and the quantity, and some products need an eligible base plan or edition. We confirm the right edition, programme and quantity with you and quote it on a written quotation with a GST invoice. Prices are confirmed on the quotation.",
      "features":[what.rstrip("."),"Edition, programme and quantity confirmed with you","Quoted on a written quotation with a GST invoice"],
      "compatibility":["Microsoft 365 and Windows environments"],
      "keywords":[name,f"{name} price India","Microsoft licensing India"]})
assert len({p["slug"] for p in out})==len(out)
hdr="// Generated by scripts/build-microsoft-products.py. Do not edit by hand.\n"
open("prisma/content-migrations/microsoft-products.generated.ts","w").write(hdr+"export type MicrosoftProduct = { slug: string; name: string; category: string; licenceType: \"SUBSCRIPTION_ANNUAL\" | \"PERPETUAL\" | \"VOLUME\"; termMonths: number | null; shortDescription: string; description: string; features: string[]; compatibility: string[]; keywords: string[] };\n\nexport const MICROSOFT_PRODUCTS: MicrosoftProduct[] = "+json.dumps(out,indent=1,ensure_ascii=False)+";\n")
print(len(out))
