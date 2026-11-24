# Buying guides, category pages and articles, 24 November 2026

The long-form copy lives in `content/seo/*.json`; `node scripts/build-seo-content.mjs` turns it into the generated modules the site imports. Prices are never typed into the copy: it carries `{{price:<slug>}}` and `{{gst:<slug>}}` tokens, resolved from the catalogue when a page renders (`src/lib/price-tokens.ts`).

## Claims to verify before relying on them

Every statement a writer made that is not in the catalogue or on the site already, as flagged by the writer. A person who knows the product should read these.

### blog-autocad-vs-autocad-lt.json

- General fact (not in catalogue): AutoCAD LT is a 2D-only edition without 3D modelling, the industry toolsets, or full customisation/automation (LISP, APIs). Human to confirm current LT feature boundaries.
- General fact: DWG files open in both AutoCAD and AutoCAD LT. Confirm.
- General fact: whether AutoCAD LT includes web/mobile apps, DWG comparison, sheet sets and Autodesk Docs integration is not in the catalogue for LT (LT catalogue entry has only a one-line description); article tells the reader to check Autodesk's pages.
- General fact: examples of LT buyer types (interior designers, contractors, shop-drawing offices) are illustrative, not from site facts.
- Conflict handled: page-autocad.md and blog-autocad-subscription-versus-the-alternatives.md say LT was consolidated; per instruction the article states LT is sold as its own annual product (catalogue slug autocad-lt).
- AutoCAD LT hardware requirements are not in the catalogue; article gives full AutoCAD requirements from the catalogue and says to confirm LT's on Autodesk's pages.
- AutoCAD macOS feature set differs from Windows is from the catalogue; no LT Mac claim made.

### blog-best-cad-software-india.json

- General fact: Inventor catalogue entry is a one-liner only (product design and engineering tools for 3D mechanical design, simulation, visualisation and documentation); article describes it as suiting engineering firms designing assemblies, machinery and components (general).
- General fact: Civil 3D 'often paired with AutoCAD' by civil consultancies is general knowledge, not from site facts.
- General fact: existence of free/open-source and other vendors' CAD products is mentioned only generally; no vendor named or ranked.
- Autodesk Flex described as prepaid tokens drawn down as used (from catalogue/blog-autodesk-flex...); priced on enquiry per catalogue.
- Revit LT referenced only via catalogue one-liner and 'priced on enquiry'.

### blog-microsoft-365-business-basic-vs-standard-vs-premium.json

- All plan facts taken from our existing site posts and catalogue; Plan-change mechanics left generic. Worked-example headcounts are illustrative, not customer data.

### blog-revit-vs-autocad.json

- General fact: AutoCAD wall 'two lines' analogy and BIM definition are general explanatory statements, not from site facts.
- General fact: AutoCAD has a Mac release with a different feature set (catalogue says 'macOS - feature set differs from the Windows release').
- General fact: DWG is the universal drawing exchange format used by contractors and consultants in India (illustrative, not from site facts).
- Revit LT: only the catalogue one-liner (simplified 3D BIM tool for 3D architectural designs and documentation) is used; priced on enquiry, so no placeholder. Human to confirm LT's feature limits if elaborated.
- AutoCAD Revit LT Suite described as Revit LT plus AutoCAD LT per catalogue description; its price placeholder exists (priced in catalogue).
- Revit 'works with Navisworks for clash coordination' is from catalogue features; 'Revit does not scale well across many cores' is from page-revit.md.

### blog-secure-business-email-providers-india.json

- Google Workspace supports 2-Step Verification, including security keys, and administrators can require it
- Google Workspace retention and search tooling (Vault) exists on certain editions only
- Google Workspace and Zoho both support publishing SPF, DKIM and DMARC records on custom domains
- Microsoft 365, Google Workspace and Zoho all encrypt mail in transit (TLS) and at rest as standard
- Microsoft 365 basic MFA enforcement available on every Business plan (security defaults) and Exchange Online supports SPF/DKIM/DMARC
- Microsoft 365 Business plans have limited retention/litigation hold compared with Enterprise (E3); confirm what each Business plan covers
- Large mailbox providers increasingly require SPF, DKIM and DMARC for bulk senders
- Several large providers operate data centres in India with varying residency commitments
- Zoho Mail encryption at rest and in transit stated as standard; Zoho mobile policy by edition unverified
- Placeholders {{price:zoho-mail}} and {{price:zoho-workplace}} assumed to resolve to the entry-level (lowest) variant; text says 'starts at'
- Table cell 'Desktop Office compatibility: Approximate' for Google and Zoho follows our existing Microsoft 365 vs Google Workspace post

### blog-what-is-microsoft-365-plans-apps-price-india.json

- Seat cap wording: catalogue and page-microsoft-365.md say 300 seats per tenant across Basic/Standard/Premium combined; blog-microsoft-365-business-standard-vs-business-premium.md says 'per plan'. I followed the catalogue (combined per tenant). Human to confirm.
- General fact: Enterprise plans have no seat cap and 'E3' is the upgrade path (from site facts/catalogue), fine; statement that 'Project, Visio, Power BI Pro, Dynamics 365, Azure, extra storage and calling plans are licensed separately' comes from blog-microsoft-365-licensing-guide-for-indian-businesses.md.
- General fact (not in catalogue): Exchange Online provides the business mailbox; Basic/Standard/Premium share the same 1 TB OneDrive and 50 GB mailbox (taken from Standard/Basic catalogue text; Premium inferred from 'Everything in Business Standard').
- Statement that licences can be reassigned when someone leaves and that reductions apply at annual renewal is from catalogue licensingNotes; 'planning the move at around 250 users' is from page-microsoft-365.md.
- Claim that Copilot answers using content the signed-in user can already reach is from blog-microsoft-365-copilot-licensing-in-india.md.

### category-bim-software.json

- Revit LT described as a simplified 3D BIM tool for architecture (catalogue) and the suggestion that full Revit has features LT lacks (general knowledge; reader told to check Autodesk's comparison).
- Navisworks Simulate described as covering coordination, 5D analysis and simulation (catalogue); Manage inclusion in AEC Collection per site pages.
- ReCap Pro use for surveying existing buildings (general knowledge, consistent with catalogue 'reality capture').
- Forma for Buildings / Site Design described as cloud tools for early design and analysis (catalogue descriptions).
- Infraworks Windows/platform not stated; none claimed.
- Flex product eligibility: reader told to check Autodesk's current list.

### category-cad-software.json

- Revit, Civil 3D and Inventor described as Windows-only (Revit and Civil 3D are in catalogue; Inventor Windows-only is general knowledge).
- Alias Concept described as industrial/automotive style concept and surfacing tool (from catalogue description plus general knowledge of automotive use).
- Statement that AutoCAD DWG is the common exchange format in Indian practice (general knowledge).
- Heavier requirements for Revit/Civil 3D than AutoCAD (from catalogue: 32 GB recommended).
- Fusion extension detail for Fusion for Design / Manufacturing edition descriptions taken from catalogue short descriptions only.
- Whether Flex eligibility covers each listed product; text tells reader to check Autodesk's current eligible list.

### category-pdf-software.json

- General claim: a plain black box drawn over text is not true redaction and the underlying text can often be copied out.
- General claim: Acrobat Reader is a free viewer and AI Assistant works with Reader (catalogue says Pro, Standard and Reader).
- Acrobat Studio described only from catalogue (Acrobat Pro plus AI creative tools); 'AI-assisted document tools' wording should be checked against current Adobe packaging.
- Claim that seats are registered to emails supplied by customer and TechZoid helps with activation/seat assignment is from RULES allowed trust facts; confirm exact process.
- Input-credit statement is general GST guidance; accountant to confirm eligibility (Section 16 conditions).

### category-video-editing-software.json

- Frame.io described from catalogue only (share, review, organise; unlimited projects; sharing and access controls); I mention 'collecting comments and tracking sign-off' as general purpose of review tools, check wording.
- After Effects 'removing or extracting objects with AI-assisted tools' taken from catalogue feature list; 'compositing' and 'visual effects' are general knowledge.
- Audition 'restoration' and 'recording' from catalogue; 'noisy location sound' example is general.
- Premiere Pro platform line (Windows 10/11 and macOS) is from catalogue compatibility; the sentence on Dynamic Link updating graphics without a rendered export is from site page-adobe-premiere-pro.md.
- Claim that opening a project in a newer version can stop it going back is from site blog-adobe-creative-cloud-for-enterprise.md (applied here to video projects); confirm for Premiere Pro specifically.
- Enterprise 'about fifty seats' threshold is from site facts; Enterprise has no placeholder price because the catalogue note says pricing is quoted individually.
- Individual-plan statement comes from site blog-adobe-creative-cloud-price-in-india.md.
- Input-credit statement is general GST guidance; accountant to confirm eligibility.

### product-3ds-max.json

- Application areas (architectural visualisation, games, product design, motion graphics) come from the catalogue; 'Indian buyer types' are general market characterisation.
- Statement that import from Revit needs some clean-up of materials/geometry (general knowledge).
- Existence and contents of the Media & Entertainment Collection beyond its catalogue slug; page only says to ask for a quotation.
- Maya leaning toward characters/VFX and 3ds Max toward visualisation (general positioning plus site facts).

### product-aec-collection.json

- Revit 'needs a separate Navisworks purchase' and 'not part of Revit' for civil tools (general knowledge; consistent with catalogue)
- Statement that Autodesk changes collection contents between releases (from blog-autodesk-aec-collection-explained.md; general)
- Blog lists additional products (Advance Steel, Forma, ReCap Pro) not in the catalogue; deliberately omitted, flag for human reconciliation
- Roughly-break-even-at-two-products rule from page-aec-collection.md

### product-autocad-lt.json

- Characterisation of LT as 2D-only with no 3D modelling/toolsets/automation (given by task brief as well-established); confirm no wording overstates it.
- macOS availability of AutoCAD LT is not in site facts; page tells reader to confirm.
- Whether AutoCAD LT is eligible for Autodesk Flex is not in site facts; text says it is checked case by case.
- Statement that LT reads and writes DWG files (general knowledge).

### product-autocad-revit-lt-suite.json

- Suite contents are only as described in the catalogue (Revit LT and AutoCAD LT together); no further feature claims.
- Statement that suite excludes full AutoCAD, toolsets and full Revit (follows from the product name/description).
- OS support for Revit LT and AutoCAD LT not stated; text asks reader to confirm.
- DWG object-compatibility caution between LT and full AutoCAD (general knowledge).
- Flex eligibility not verified.

### product-autodesk-civil-3d.json

- Statement that corridors/surfaces are not AutoCAD's main purpose and quantities are 'manual or add-on workflows' in plain AutoCAD (general knowledge)
- Statement that AutoCAD has a Mac release with a different feature set (from catalogue AutoCAD compatibility, so low risk)
- Claim that Civil 3D is used by Indian highway/irrigation/township/survey firms (general market description)
- Claim that file formats supported for survey and point clouds vary by release (general)

### product-autodesk-inventor.json

- Inventor feature list is generic: catalogue entry lists no features, so only the one-line catalogue description (design, simulation, visualisation, documentation) is used
- Statement that Inventor is a Windows desktop application and file-based data (general knowledge)
- Statement that Inventor works alongside AutoCAD/DWG (general knowledge)
- Claim that Indian machine builders commonly use Inventor with a separate CAM route (general market description)
- Sign-in/device rules for Inventor are inferred from the general Autodesk named-user statement; the Inventor catalogue licensingNotes is null

### product-autodesk-product-design-manufacturing-collection.json

- Narrative example of design flow (Inventor to Nastran to Vault to Factory Design Utilities) is general product knowledge
- Statement that Autodesk changes collection contents between releases (from the AEC blog; assumed applicable)
- Typical buyers (machine builders, auto-component suppliers) are general market description
- Vault Basic per-user seat requirement for team use is inferred from named-user licensing; verify actual Vault Basic client rules

### product-autodesk-revit-lt.json

- Revit LT platform support (Windows/macOS) is not in site facts; text tells reader to confirm.
- Statement that Revit LT is 'architecture-focused' and lighter than full Revit (consistent with catalogue wording 'simplified 3D BIM ... architectural design').
- Whether Revit LT is eligible for Autodesk Flex.
- Claim that contracts needing BIM deliverables/worksharing require full Revit; kept as 'check against LT'.
- IFC usable between different BIM tools (general knowledge).

### product-fusion-360.json

- Statement that Fusion 360 was renamed Autodesk Fusion (general knowledge; also consistent with catalogue name)
- Statement that Inventor is a Windows desktop application (general knowledge)
- Claim about Indian user types (design studios, tool rooms, colleges) is a general market description
- Claim that cloud data layer requires persistent connection and that offline use is limited comes from catalogue 'persistent internet connection required'; offline-mode details not stated

### product-maya.json

- Maya's position as film/TV/games standard is from the site page; Indian buyer types are general market characterisation.
- Statement that macOS/Linux support depends on the current release and distributions (catalogue says 'supported Linux distributions').
- Maya's focus on character work vs 3ds Max focus on visualisation (general positioning).
- Render-node licensing being a separate purchase comes from the site's Maya page.
- Media & Entertainment Collection mentioned only as an option to quote.

### product-revit.json

- Revit LT described as 'simplified 3D BIM tool' (catalogue); no specific LT-vs-Revit feature differences claimed beyond that.
- Claim that round-tripping via IFC loses information (general knowledge).
- Whether Revit is eligible for Autodesk Flex is not in site facts; text says to confirm.
- Mac users running Windows on a partition or separate machine (general practice).

### refresh-autodesk-aec-collection-explained.json

- Collection contents referenced only as in catalogue/existing article; example practices are illustrative; Autodesk usage reporting mentioned as in existing article; Flex for occasional users as in existing site posts.

### refresh-microsoft-office-ltsc-2024-vs-microsoft-365.json

- Home & Business 2024 'one PC or Mac' and 'no volume activation' from catalogue; Publisher/Access in LTSC from catalogue. Nothing else beyond site facts. Hardware refresh cycle of four to five years is a general assumption.

## Decisions worth knowing

- Autodesk is described as a "reseller", not "authorised": the site shows a designation only through the gated badge system, and the Autodesk record carries none. Confirm it in the admin brand settings and the wording follows.
- The catalogue sells AutoCAD LT as its own annual subscription, so the earlier site copy calling it "consolidated" was corrected (migration `2026-11-seo-posts-and-links`).
- The catalogue holds annual prices only. Monthly and 3-year rows show "Get today's price".
- Products with no price in the catalogue: Advance Steel, Construction Cloud, Flex, Flow Studio, Forma Building Design, Fusion Manage, Platform Services, Revit LT.
