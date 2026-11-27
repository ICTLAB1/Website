# SEO content, second pass (2026-11-24): claims to verify

Third-party product facts and TechZoid claims the writers were not certain of. Check each before relying on it; edit the matching `content/seo/*.json` file and run `node scripts/build-seo-content.mjs` to change copy.


## blog-best-cad-software-india.json
- Other CAM tools named without selling (Mastercam, SolidCAM working inside SolidWorks, Siemens NX CAM, hyperMILL): confirm existence and descriptions on publishers' pages
- Fusion is offered in separate design and manufacturing configurations (autodesk-fusion-for-design / autodesk-fusion-for-manufacturing catalogue slugs); confirm exact scope
- Fusion: integrated CAM, some advanced manufacturing/simulation/generative capabilities sold as extensions; Windows and macOS; minimum 8 GB RAM and internet connection (carried over from earlier version)
- General CAM statements: post-processor role, 2.5D vs multi-axis strategy, STEP/IGES/Parasolid neutral formats
- Inventor catalogue entry is one line only; assembly/machinery suitability is general
- Civil 3D and Revit hardware/OS statements carried over from earlier version
- Autodesk Flex described as prepaid tokens; priced on enquiry per catalogue
- Revit LT mentioned in earlier version removed; none now referenced

## blog-secure-business-email-providers-india.json
- Proton: end-to-end between Proton users, zero-access encryption of stored mail, password-protected messages to outsiders, Swiss headquarters and historical Swiss hosting, custom-domain SPF/DKIM/DMARC support, Proton for Business admin console, two-factor and hardware key support, search limitations. Verify on Proton's current pages.
- Google Workspace supports 2-Step Verification including security keys and passkeys, which admins can require; Vault on certain editions only
- Microsoft 365: basic MFA enforcement on Business plans; conditional access via Entra ID P1 in Business Premium; Defender for Office 365 included in Business Premium; Intune in Business Premium; sensitivity labels with encryption; customer-managed keys positioned for higher tiers; Business plans have limited retention/litigation hold vs E3
- Zoho Mail: two-factor and admin policy control, retention/eDiscovery on higher editions, encryption standard, mobile policies by edition; confirm per edition
- All of Microsoft 365, Google Workspace and Zoho encrypt in transit (TLS) and at rest as standard; provider-managed keys by default
- Large mailbox providers increasingly require SPF/DKIM/DMARC for bulk senders
- DPDP Act 2023 described only in general terms (reasonable security safeguards, breach handling); confirm wording with a legal adviser
- Several large providers operate data centres in India with varying residency commitments
- Price tokens for zoho-mail and zoho-workplace assumed to resolve to the entry-level variant; text says 'starts at'

## blog-top-10-cloud-computing-services-india.json
- Microsoft operates Azure regions in India (confirm current list of regions and which services each offers before publishing).
- Azure licence mobility / hybrid benefit for existing Windows Server and SQL Server licences: confirm current conditions with Microsoft.
- AWS, Google Cloud and Oracle Cloud Infrastructure have regions in India; confirm named regions and service availability if the owner wants them stated.
- Oracle licence-transfer ('bring your own licence') terms described only generally; confirm.
- Zoho described as Indian-headquartered with CRM, Books, Desk, Mail and Zoho One; confirm data-centre locations and GST features before promising anything.
- Google Workspace described as browser-first with friction for heavy Excel macros; opinion, confirm tone is acceptable.
- Salesforce described as customisable, partner-ecosystem heavy and suited to mid-size and larger firms; general characterisation.
- OneDrive for Business/SharePoint characterisation and that Veeam/Acronis can send backups to cloud storage: confirm.
- DPDP Act, 2023 described in general terms only; owner may wish legal review.
- TechZoid advising on AWS and Google Cloud (services pages exist): confirm the owner is comfortable with 'advisory' wording.

## blog-top-firewall-brands-india-fortinet-sophos-sonicwall-cisco.json
- Fortinet: FortiGate firewall family spanning small to large models; 'security fabric' wording; central management available; bundled subscription tiers (confirm current bundle names if added).
- Sophos: firewall positioned for SMEs with approachable management; central cloud console; endpoint and managed detection products; 'shares threat information' with endpoint (Synchronized Security): confirm wording is current.
- SonicWall: long history in SME/branch/retail; cloud and central management options; remote-access and wireless products; effect of lapsed subscriptions on firmware access: confirm.
- Cisco: firewall line reorganised over time, more than one management route; subscription licences typically 1 to 5 years: confirm current product lines and licensing.
- General statement that all four sell hardware plus term-based security subscriptions (commonly 1, 3 or 5 years).
- Statement that Cisco-estate sites find Cisco firewalls fit operations, and that many Indian IT teams already know SonicWall: general market impression, no data.
- Support in India (hardware replacement stock location, hours, response times) deliberately not asserted for any publisher: owner to add specifics if desired.
- Closing paragraph says firewalls can be quoted on one purchase order with licences (company practice, per site facts).

## brand-acer.json
- Confirm TechZoid quotes each listed product line
- Confirm Acer business monitors and the Aspire line are supplied and currently sold in India
- Confirm onsite warranty coverage and staged delivery are offered by TechZoid for Acer
- Confirm TravelMate and Veriton are the current commercial range names in India

## brand-acronis.json
- Confirm TechZoid quotes each listed product line
- Confirm current Acronis product names: Cyber Protect, Cyber Protect Cloud, Cyber Protect Home Office, Snap Deploy, Disk Director
- Confirm whether Cyber Protect Cloud is available to direct customers or only via managed providers
- Confirm which editions back up Microsoft 365 mailboxes and files
- Confirm available licence terms (subscription versus perpetual) for each product
- Confirm TechZoid can help with activation for Acronis licences

## brand-cisco.json
- Confirm TechZoid quotes each listed product line
- Confirm Meraki devices stop functioning when the licence expires and the current Cisco licensing model (smart licensing)
- Confirm current product names (Secure Firewall, Secure Endpoint, Umbrella) and that Cisco Umbrella is still sold under that name

## brand-fortinet.json
- Confirm TechZoid quotes each listed product line
- Confirm the FortiGuard (threat updates) and FortiCare (support) naming and the 1/3/5-year term options
- Confirm subscription bundles are offered alongside a-la-carte, and expiry behaviour of the device

## brand-hp.json
- Confirm TechZoid quotes each listed product line
- Confirm the Pro SFF 280 G9 slug and listing exist if it is linked later; only existing slugs are linked now
- Confirm onsite warranty coverage and staged delivery are offered by TechZoid for HP
- Confirm the Elite and ProDesk 2 positioning descriptions match the listings

## brand-kaspersky.json
- Confirm TechZoid quotes each listed product line
- Confirm Kaspersky Next naming and tiers, and current Endpoint Security for Business tier names
- Confirm licence banding and 1/2/3-year terms, and any sector or government restrictions on Kaspersky purchase in India that should be stated on the page

## brand-lenovo.json
- Confirm TechZoid quotes each listed product line
- ThinkBook, ThinkVision and ThinkStation naming and tiering are current
- Confirm onsite warranty coverage and staged invoicing are offered by TechZoid for Lenovo

## brand-sonicwall.json
- Confirm TechZoid quotes each listed product line
- Confirm current SonicWall series names (TZ, NSa) and SonicWave and SMA naming
- Confirm 1 or 3 year service terms and bundle options, and registration process

## brand-sophos.json
- Confirm TechZoid quotes each listed product line
- Confirm Sophos Central is the single console for firewall and endpoint, and MDR availability in India
- Confirm licence terms of 1 to 3 years and bundle availability for firewalls

## category-antivirus-endpoint-security.json
- Statement that Microsoft 365 Business Premium includes Microsoft Defender for Business is general Microsoft packaging knowledge; confirm current wording.
- Kaspersky and Sophos described only as established business security publishers; no product names, tiers or features are asserted.
- General licensing pattern (per device subscriptions, minimum quantities, servers priced differently) varies by publisher and is stated as something to ask.
- Remark that some government and regulated buyers have rules on particular security brands is general; owner to confirm it is appropriate to include.
- The fifty-device guidance is a rule of thumb, not a publisher figure.

## category-backup-software.json
- Description of Acronis as a backup and cyber protection publisher selling to businesses and service providers is general knowledge; confirm wording.
- Microsoft 365 shared-responsibility claim is general; owner may want to confirm against Microsoft's current wording.
- Generic licensing models (per device, per user, per capacity) are patterns across the market; Acronis's exact models and editions not stated.
- Statement that ransomware often reaches backup shares and that immutable copies are recommended is general guidance, not a product claim.
- Data-location advice is generic; TechZoid cannot confirm storage regions for any specific product.

## category-business-laptops.json
- Descriptions of the HP 250R/255 as 15-inch class and 240R/245 as 14-inch class, and the Intel versus AMD numbering pattern, are inferred from model naming; check each product page.
- General claim that business ranges offer warranty upgrades and onsite options varies by model; stated only as something to confirm.
- Claim that Home edition cannot be managed like Pro (domain join, group policy, BitLocker management) is general Windows knowledge; confirm wording.
- Whether TechZoid can supply machines with a customer OS image is not confirmed; copy says it will be stated on the quotation.
- Delivery arrangements are not stated beyond asking for them to be confirmed on the quotation.

## category-firewall-security.json
- Brand positioning sentences (Fortinet price-to-throughput and product range; Sophos simple console and endpoint link; SonicWall small-business/branch history; Cisco for Cisco shops) are general market impressions; owner to confirm tone.
- General claim that security subscriptions are sold per term and signatures stop updating when they lapse; exact behaviour and bundle contents differ by brand and model.
- Claim that remote-access VPN client may be licensed separately depends on brand; stated only as something to check.
- TechZoid installation and configuration availability for firewalls is not confirmed; FAQ only refers to managed IT/cybersecurity services existing on the site.

## product-adobe-acrobat-pro-teams.json
- Batch (Action Wizard) and sanitising of hidden data are described from general Acrobat Pro knowledge; confirm they are in the current Teams edition
- PDF/A, accessibility check and comparison are Pro-only per house notes
- Adobe Acrobat Sign as separate product for high-volume signing (house notes)
- Internet requirement for licence checks
- Acrobat Standard Windows-only per house notes

## product-adobe-creative-cloud-all-apps-teams.json
- Generative credit allowance for All Apps seats (changes over time)
- Adobe Stock being licensed separately
- Monthly billing under annual commitment is a catalogue variant; confirm availability
- Enterprise threshold of about fifty seats is from house guide
- 100 GB storage per user for both plans per house catalogue

## product-adobe-illustrator-teams.json
- Illustrator on iPad and Adobe Fonts inclusion are from the house catalogue
- The 'around four applications' All Apps break-even is from the house Creative Cloud notes
- Cloud storage amount for the single-app plan (catalogue single-app lists 100 GB; confirm for Illustrator specifically)
- Install and sign-in limits per named user (general Adobe terms)
- CorelDRAW is described as comparable; no performance claims made

## product-microsoft-365-family.json
- Maximum number of people on a Family plan (described by the brief as up to six); text avoids stating a number.
- Exact per-person storage allowance and app list; text kept generic.
- Whether members must live in the same household under current Microsoft terms.
- Whether the plan is purchasable through TechZoid with a GST invoice; site lists it as quote-only.
- Current system requirements (Windows/macOS versions).

## product-microsoft-365-personal.json
- Exact Office app list included in Personal and OneDrive storage allowance; text kept generic.
- Whether Microsoft's consumer terms allow any commercial/freelance use; text says not licensed for organisational use and defers on freelancers.
- Whether Teams is bundled with Personal; text avoids a firm claim.
- Whether Personal can be bought through TechZoid with a GST invoice in the form a buyer expects; site lists it as quote-only.
- Current system requirements (Windows/macOS versions).

## product-microsoft-office-home-2024.json
- Exact wording of the Home licence on non-commercial use (Office Home 2024 licence terms).
- Whether Office Home 2024 includes Outlook, OneNote or other apps; text names only Word, Excel, PowerPoint and says Outlook is a point to confirm.
- Whether the licence can be transferred to a new device under the 2024 terms.
- Supported Windows/macOS versions for the 2024 edition.
- Whether updates after purchase are limited to security and quality fixes under Microsoft's current policy.
- No support end date is stated; confirm against Microsoft's lifecycle page if wanted.

## product-microsoft-office-home-and-business-2024.json
- That Home & Business 2024 includes Word, Excel, PowerPoint and Outlook only; OneNote or other apps not confirmed so not listed.
- Commercial-use wording of the Home & Business licence.
- Whether the licence can be transferred to another device under the 2024 terms.
- Whether Mac and Windows editions differ in contents or are sold separately.
- Supported Windows/macOS versions for the 2024 edition.
- That updates after purchase are limited to security and quality fixes.
- No minimum purchase quantity or support end date is stated.

## product-microsoft-office-ltsc-professional-plus-2024.json
- Exact application list in Professional Plus 2024 versus Standard 2024; the text lists only Word, Excel, PowerPoint and Outlook as core and defers the rest to Microsoft.
- Whether a minimum purchase quantity applies; none is stated.
- How volume-licence activation works and whether licences can move between devices.
- Supported Windows versions and support for running alongside Microsoft 365 services.
- No support end date is stated; confirm against Microsoft's lifecycle page.
- That Business Premium includes hosted email, device management and security tooling (general knowledge, widely documented).

## product-microsoft-office-ltsc-standard-2024.json
- Exact application list in LTSC Standard 2024 versus Professional Plus 2024 (Standard stated as Word, Excel, PowerPoint, Outlook; Microsoft's edition list should be checked).
- Whether a minimum purchase quantity applies; text does not state one.
- How volume-licence activation works and whether licences can move between devices.
- Supported Windows versions and any restriction on running alongside Microsoft 365 apps.
- No support end date is stated; confirm against Microsoft's lifecycle page.
- Whether LTSC 2024 is available in a Mac edition.

## product-onedrive-for-business-plan-1.json
- OneDrive inclusion in Microsoft 365 Business Basic/Standard/Premium and enterprise plans (general knowledge)
- Plan 1 lacks DLP and eDiscovery (matches the site description of Plan 2 as the compliance plan)
- Storage allowance per plan intentionally not stated
- Retention period after licence removal and recycle-bin behaviour are described generally
- Whether Plan 1 is sold through CSP on annual terms in India

## product-power-bi-premium-per-user.json
- Exact feature list of PPU (paginated reports, deployment pipelines, AI features) and the rule that PPU workspace content needs PPU or capacity users
- Microsoft's capacity product changes (Premium per capacity vs Fabric capacity); text kept deliberately general
- Availability and length of PPU trials
- Paginated report authoring tool is Windows-only (Report Builder)
- Whether PPU is sold in India through CSP on annual or monthly terms

## product-power-bi-pro.json
- Whether Power BI Pro is bundled in Microsoft 365 E5 (believed true; confirm current bundle list)
- Whether viewers of content in dedicated capacity can use free licences depends on capacity size and Microsoft's Fabric/Premium changes
- Availability of monthly billing for Power BI Pro through Indian CSP
- Power BI Desktop is Windows-only (general knowledge)
- Gateway requirement for on-premises refresh
- Tally connectivity description is general; no connector is claimed

## product-windows-11-pro-upgrade.json
- Upgrade licence precondition: qualifying existing Windows licence; exact terms by channel (retail/OEM/volume) vary and should be checked against current Microsoft product terms
- Whether a Pro Upgrade licence can legally be applied to Windows 10 Home devices that meet requirements, and key behaviour at activation
- Retail licences being transferable and OEM tied to device (general; confirm current Microsoft terms)
- Windows 10 end of support date, October 2025
- Microsoft 365 Business Premium including Windows business rights (general knowledge; confirm eligibility conditions)
- Hardware requirements (4 GB RAM, 64 GB storage, TPM 2.0, Secure Boot, DirectX 12) as of the last confirmed Microsoft list
- The comparison alternative slug points at Microsoft 365 E3 (which carries Windows Enterprise rights) as there is no Windows 11 Enterprise product page; confirm alternative linking

## brand-dell.json
- Confirm TechZoid quotes each listed PowerEdge, PowerStore and Precision product
- Confirm the generation ordering of the PowerEdge model numbers (newer models listed as the better long-term buy) matches the current Dell range
- Confirm which ProSupport levels Dell currently offers in India and that TechZoid can quote them
- Confirm staged delivery and onsite coverage are offered by TechZoid for Dell
- Confirm the Windows Server Standard versus Datacenter positioning wording suits the owner

## service-managed-firewall-services.json
- Owner must confirm TechZoid can deliver each listed activity: policy review, rule management, firmware and signature updates, subscription and licence renewal tracking, configuration backups, log and alert review, change requests, periodic review, and help with VPN and remote access.
- Owner must confirm the support hours and any commitments before they are quoted to buyers; none are stated on the page.
- Owner must confirm which firewall brands and models TechZoid will actually manage (the page names Fortinet/FortiGate, Sophos Firewall, SonicWall and Cisco).
- Confirm how configuration backups and log access are obtained (remote access, on-site visits, or customer-provided exports) and whether any tooling is used.
- Confirm whether hardware replacement logistics and incident response are offered as quoted add-ons.

## cisco hardware series (2026-11-cisco-hardware migration)
- 99 quote-only Cisco hardware product pages, one per series on Cisco's A-Z index (https://www.cisco.com/c/en/us/products/a-to-z-series-index.html, saved in scripts/data/cisco-a-to-z-series.json). Series names are Cisco's; the descriptions are generic by product type (switch, router, firewall, access point, phone, UCS server, SAN) and state no specifications. Confirm TechZoid quotes these, and delete any it does not from the admin panel.
- Left out as not hardware or not for this catalogue: Integrated Management Controller, Expressway Series, Prime Network Control System Series Appliances, ASR 5000 Series, and the six optical-transport series (NCS 1000/2000/4000/4200, ONS 15454, ONS 15200).
- Statements that Cisco hardware is bought with a software licence and support contract are general; confirm against Cisco's current licensing.

## fortinet hardware (2026-11-fortinet-hardware migration)
- 59 quote-only Fortinet hardware product pages: 33 FortiGate models (entry, mid-range and high-end tiers as on Fortinet's firewall page), 5 FortiGate Rugged, 4 FortiSwitch Rugged, 5 FortiExtender, and 12 families (FortiSwitch, FortiAP, FortiAnalyzer, FortiManager, FortiMail, FortiWeb, FortiADC, FortiSandbox, FortiDDoS, FortiAuthenticator, FortiVoice, FortiCam/FortiRecorder). Source pages and model lists are in scripts/data/fortinet-hardware-sources.json. Descriptions are generic by product type; no throughput figures or specifications are stated. Confirm TechZoid quotes these and delete any it does not from the admin panel.
- Left out as not hardware: FortiOS, SASE/SSE, CNAPP, SIEM, SOAR, endpoint, AI and cloud services, FortiFlex and other subscriptions.
- Statements that Fortinet hardware is bought with security subscriptions and a support contract, and that management and security families are sold as appliances and virtual machines, are general; confirm against Fortinet's current offering.

## sophos and sonicwall hardware (2026-11-sophos-sonicwall-hardware migration)
- Ten quote-only family pages written from general knowledge, NOT from the manufacturers' sites (sophos.com and sonicwall.com refuse automated access): Sophos XGS Series Firewalls, APX Series Access Points, Switch Series, SD-RED Remote Ethernet Devices; SonicWall TZ, NSa and NSsp Series Firewalls, SonicWave Access Points, Switch Series, SMA Series Secure Mobile Access. No model numbers, throughput figures or specifications. Confirm TechZoid quotes each family, that the names are current, and delete any it does not from the admin panel.
- Left out: endpoint, email, cloud and subscription products.

## more microsoft products (2026-11-microsoft-products migration)
- 52 quote-only Microsoft product pages written from general knowledge (Microsoft's own pages could not be read from the build environment): Microsoft 365 Apps for business and enterprise, Microsoft 365 and Office 365 F3, Microsoft 365 Copilot, Exchange Online Plans 1-2, SharePoint Online Plans 1-2, Teams Essentials, Phone Standard, Premium, Rooms Pro and Audio Conferencing, Project Plans 1/3/5 and Project 2024, Visio 2024, Windows 11 Enterprise E3/E5, Windows 365 Business and Enterprise, Windows Server 2025 Essentials and CALs (device, RDS), SQL Server 2022 CALs, Visual Studio Professional, Power Apps Premium, Power Automate Premium, Copilot Studio, nine Dynamics 365 products, and the Defender for Business, Endpoint, Office 365, Entra ID and Intune products. No prices, no part numbers.
- Product names change often at Microsoft (Entra ID, Copilot Studio, Teams plans); confirm each name is current and that TechZoid sells it, and delete the rest from the admin panel. Not added: education (A1/A3/A5) and non-profit plans, consumer Windows, Surface hardware, and anything Microsoft retired or renamed after my knowledge.

## plans-and-pricing pages
- Four pages in the format of Microsoft's own "plans and pricing" pages: /microsoft-365-business-plans-and-pricing, /microsoft-365-enterprise-plans-and-pricing, /adobe-plans-and-pricing, /autodesk-plans-and-pricing. Prices and "what it includes" come from the catalogue at render time; the grouping, short guidance and FAQs are in src/lib/content/plans.ts. Microsoft's own pages could not be read from the build environment, so the layout follows their known format, not their copy.
- The statement that Microsoft 365 plans add the Windows and security components that Office 365 plans lack is general knowledge; confirm it.


## Round 4: data-centre and security solution pages (27 Nov 2026)

New pages: /data-centre-solutions, /web-application-firewall, /email-security, /zero-trust-network-access, /data-loss-prevention. Built only from catalogue products; no prices typed (the product cards read them from the catalogue). Please confirm the following before relying on them:

**/data-centre-solutions**
- Whether TechZoid supplies and supports each listed HPE, Dell and Cisco model, and the warranty and onsite service available in each city.
- General statements about drive types, port speeds and Fibre Channel versus Ethernet storage are general market descriptions; the owner should confirm the tone and any specific recommendation.
- The description of Cisco UCS, Nexus and MDS roles is general and should be checked against what TechZoid actually quotes.
- Delivery times are stated as dependent on stock and configuration, with no figure given.

**/web-application-firewall**
- Descriptions of FortiADC as an application delivery controller and FortiDDoS as DDoS protection are general product descriptions; the owner should confirm the exact models TechZoid quotes.
- The PCI DSS statement is worded generally and deliberately points the reader to the current text of the standard.
- Licensing models (per throughput, appliance or application) vary by product and are stated as things to ask about, not as Fortinet's terms.
- Whether TechZoid offers installation and tuning of web application firewalls.

**/email-security**
- Statement that Defender for Office 365 Plan 1 is included in Microsoft 365 Business Premium and Plan 2 in Microsoft 365 E5: confirm against Microsoft's current plan comparison before publishing.
- Description of what Plan 1 and Plan 2 each add is a summary and should be checked against Microsoft's current documentation.
- FortiMail positioning as a secure email gateway is a general product description; confirm the models TechZoid quotes.
- Whether TechZoid configures SPF, DKIM and DMARC or implements these products for customers.

**/zero-trust-network-access**
- Statement that Microsoft 365 Business Premium includes Entra ID P1 and Intune: confirm against Microsoft's current plan comparison.
- Descriptions of what Entra ID P1 and P2 each add are summaries; check against Microsoft's current documentation.
- SonicWall Secure Mobile Access is described as a remote-access appliance range; confirm which SMA models and any ZTNA features TechZoid quotes.
- The offer to quote a dedicated ZTNA subscription from a firewall brand on request: confirm which brands TechZoid can actually supply this for.
- Whether TechZoid configures conditional access, device management or remote access for customers.

**/data-loss-prevention**
- Which DLP capabilities each Microsoft 365 plan includes (Business Premium, E3, E5, and endpoint DLP in E5): confirm against Microsoft's current plan comparison before publishing.
- Statement that Business Premium covers users up to 300 and E3 has no user limit is consistent with the plans pages; confirm it is still current.
- The description of content inspection on firewalls and secure email gateways is general; confirm which products TechZoid quotes with this feature.
- Mention of India's data protection law is deliberately general and points the reader to their adviser.
- Whether TechZoid configures DLP policies or delivers labelling projects for customers.
