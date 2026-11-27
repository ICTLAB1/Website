/**
 * Hand-written copy for product pages that were too thin to index.
 *
 * Each entry adds only what the catalogue record itself supports, or what is
 * true of the product category in general. No entry states a price, a core
 * count, a credit allowance or a ranking: prices are shown by the page from the
 * catalogue, and technical figures are shown where the record carries them.
 * Where a fact would need the publisher's current documentation, the entry
 * says what to ask instead of asserting it, and the owner's checklist is in
 * `docs/seo-todo-2026-11.md`.
 */

export type Enrichment = {
  /** A paragraph placed first, for records whose description is a single line. */
  lead?: string;
  /** "Who it is for and common uses in India". */
  who: string;
  /** How it differs from its sibling products. */
  diff?: string;
  /** Bullets added to the features list when not already there. */
  features?: string[];
  /** Three or four questions, each answered from the above and the record. */
  faqs: Array<[question: string, answer: string]>;
};

const sub = (what: string) =>
  `It is a named-user annual subscription: each seat is assigned to one person and renews every year, so the number to quote is people, not machines. ${what}`;

export const ENRICHMENTS: Record<string, Enrichment> = {
  /* ───────────────────────── Autodesk ───────────────────────── */
  "autodesk-arnold": {
    lead: "Arnold is a renderer: it turns a 3D scene into a finished image or frame by calculating how light moves through it, including bounced light, which is what global illumination means. It is bought by people who produce rendered images and animation, and it is a separate subscription from the modelling application the scene is built in.",
    who: "It is for 3D artists and studios in animation, visual effects, games and design visualisation who render scenes as final frames. Before buying, ask whether the modelling application you already license includes the renderer you need, so the same capability is not paid for twice. For a studio with several artists, quote the seats for the people who will actually render.",
    diff: "Arnold is the rendering product. The [Media and Entertainment Collection](/products/autodesk-media-entertainment-collection) is the broader bundle of modelling, animation and simulation tools for the same industries; if your team needs a full toolset rather than a renderer alone, compare the two on one quotation.",
    faqs: [
      ["What is Autodesk Arnold used for?", "Arnold renders 3D scenes into final images and frames using global illumination, which calculates how light bounces around a scene. It is used where realistic lighting matters, such as animation, visual effects and design visualisation."],
      ["How is Arnold licensed?", "As an annual subscription for a named user. Each seat is assigned to one person, and it renews every year. Quote the number of people who render, not the number of machines."],
      ["Do I need Arnold if I already have a modelling application?", "It depends on what your current subscription includes. Check what rendering your existing licence provides before buying, then tell us your requirement and we will quote only what you need."],
    ],
  },
  "autodesk-recap-pro": {
    lead: "ReCap Pro is for reality capture: it turns scans and photographs of a real place, such as a building, a site or a plant, into a 3D point cloud and a model that design and engineering software can use. Teams use it at the start of a renovation or infrastructure project, to design against what is actually there instead of against old drawings.",
    who: "It suits surveyors, architects, engineers and contractors who capture existing conditions, for example before refurbishing a building, planning work on a plant, or checking progress against a design. It is typically bought alongside design software, so ask which of your existing subscriptions already read point-cloud data.",
    diff: "ReCap Pro prepares the captured data. The design and coordination happens in other products, such as [Navisworks Simulate](/products/autodesk-navisworks-simulate) for coordination and the [AEC Collection](/products/aec-collection) for the wider design toolset.",
    faqs: [
      ["What does Autodesk ReCap Pro do?", "It processes laser scans and photographs of real places into 3D point clouds and models, so design and engineering software can work from the existing conditions of a building or site."],
      ["Who should buy ReCap Pro?", "Surveyors, architects, engineers and contractors who capture existing conditions before design or construction. It is usually bought alongside the design software that uses the captured data."],
      ["Is ReCap Pro included in a collection?", "It can be part of bundled offerings. Check what your current subscription already includes before buying it separately, and we will quote the cheaper route for your requirement."],
    ],
  },
  "autodesk-fusion-manage": {
    lead: "Fusion Manage is a cloud-based product lifecycle management (PLM) system. It is where a manufacturer keeps product data and the workflows around it: change requests, approvals, bills of materials and the people who need to sign them off, in one place instead of scattered across email and spreadsheets.",
    who: "It is for manufacturers and product teams in India whose engineering changes are managed by email and shared folders, and who want a record of who approved what. Fusion Manage is priced on enquiry because the configuration depends on the workflows and the number of people involved, so tell us how many people take part and which processes you want to manage.",
    diff: "Fusion Manage is the management system. [Fusion Contributor](/products/autodesk-fusion-contributor) gives people who only take part in those workflows access without a full seat, and the design work itself happens in [Fusion](/products/fusion-360). Quote them together so the seat types match the roles.",
    faqs: [
      ["What is Autodesk Fusion Manage?", "A cloud-based product lifecycle management system for keeping product data and managing the workflows around it, such as engineering changes, approvals and bills of materials."],
      ["Why is Fusion Manage priced on enquiry?", "Its configuration depends on the workflows you want to manage and how many people take part, so we quote to your requirement on a written quotation rather than listing one figure."],
      ["Who needs a full seat and who can use a contributor seat?", "People who manage and configure workflows need a full seat. People who only take part, for example by reviewing or approving, may be covered by the contributor option. Tell us the roles and we will quote the right mix."],
      ["Is Fusion Manage the same as Fusion?", "No. Fusion is the design and engineering product; Fusion Manage is the lifecycle management system. They are separate products and are quoted separately."],
    ],
  },
  "autodesk-infraworks": {
    lead: "InfraWorks is for planning infrastructure in context. It brings together geographic data, such as terrain and existing roads, with engineering models so that a road, bridge, drainage or utility concept can be tested against the real landscape before detailed design starts.",
    who: "It is for civil and infrastructure teams, consultants and agencies who need to compare options at the concept stage and show them to clients or approving bodies. Most buyers already use design software for the detailed work, so ask how InfraWorks fits with the subscriptions you hold.",
    diff: "InfraWorks is the conceptual and geospatial layer. For detailed design see the [AEC Collection](/products/aec-collection) and for site capture see [ReCap Pro](/products/autodesk-recap-pro). Several of these are available together under one collection, so check whether a bundle suits you better than separate subscriptions.",
    faqs: [
      ["What is Autodesk InfraWorks used for?", "Planning, design and analysis of infrastructure in its geographic context: combining terrain and existing-condition data with engineering models to compare options early."],
      ["Is InfraWorks only for roads?", "No. It is used for infrastructure projects generally, including roads, bridges, drainage and utilities, where the surrounding landscape matters to the design."],
      ["Is InfraWorks part of the AEC Collection?", "Autodesk bundles several products in its collections. Check what your current subscription includes, then ask us to quote the route that costs less for your team."],
    ],
  },
  "autodesk-flow-production-tracking": {
    lead: "Flow Production Tracking is a review and production-management tool for studios. It is where a project's tasks, versions and feedback live: an artist uploads a version of a shot or asset, a supervisor reviews it and leaves notes, and a producer can see the status across the whole schedule.",
    who: "It is for animation, visual-effects and games studios, and for in-house teams making video or 3D content, who coordinate many people and many versions. If your team tracks shots and approvals in spreadsheets, this is the product that replaces them.",
    diff: "Production tracking is distinct from the creative tools. It sits beside software such as Maya and the [Media and Entertainment Collection](/products/autodesk-media-entertainment-collection), and the people who only review work may not need the same seat as the people who manage the schedule; tell us the roles.",
    faqs: [
      ["What is Autodesk Flow Production Tracking?", "A review and production-management tool for studios, where tasks, versions and feedback on shots and assets are tracked from one place."],
      ["Who uses it?", "Animation, visual-effects and games studios, and teams producing video or 3D content, where many people and versions need to be coordinated and approved."],
      ["Is it a creative tool like Maya?", "No. It tracks and reviews work made in other applications. It does not model or animate."],
    ],
  },
  "autodesk-media-entertainment-collection": {
    lead: "The Media and Entertainment Collection bundles Autodesk's 3D animation, modelling, simulation and rendering software for film, games and television into one subscription, so a studio does not license each application separately.",
    who: "It is for studios, freelancers and in-house teams producing animation, visual effects, games or broadcast graphics, where one artist may move between modelling, animation and rendering in the same week. A collection costs more than a single application and is usually cheaper than buying the applications one by one, so it pays when a person uses several of them.",
    diff: "Compare it with buying one application, such as [Arnold](/products/autodesk-arnold) for rendering, when a person only needs that tool. For the architecture and engineering equivalent, see the [AEC Collection](/products/aec-collection).",
    faqs: [
      ["What is in the Media and Entertainment Collection?", "Autodesk's 3D animation, modelling, simulation and rendering software for film, games and television, bundled in one subscription. Confirm the current list of included applications on the quotation."],
      ["Is the collection cheaper than buying applications one by one?", "When a person uses several of the applications, usually yes. When they use only one, a single-application subscription is cheaper. Tell us who uses what and we will quote both."],
      ["How is the collection licensed?", "As a named-user annual subscription: each seat is assigned to one person and renews every year."],
    ],
  },
  "autodesk-navisworks-simulate": {
    lead: "Navisworks Simulate is for reviewing and coordinating building and infrastructure models. It combines models from different disciplines into one, lets a team walk through the result, and links the model to a construction schedule so the sequence of work can be seen over time.",
    who: "It is for contractors, project managers and BIM coordinators who need to review and plan from models other people have made, rather than create the models themselves. In India it is typically used on larger building and infrastructure projects, where several consultants deliver models that have to be brought together before construction.",
    diff: "Simulate is the review and simulation product. The product record lists clash detection among its tools; confirm on the quotation exactly which Navisworks edition carries the capabilities you need, because the editions differ. For modelling see [Revit](/revit) and the [AEC Collection](/products/aec-collection).",
    faqs: [
      ["What does Navisworks Simulate do?", "It combines models from different disciplines for review, supports walk-throughs, and links models to a construction schedule so the sequence of work can be simulated over time."],
      ["Does Navisworks Simulate do clash detection?", "The product record lists clash detection, advanced coordination, 5D analysis and simulation tools. Navisworks is sold in more than one edition, so confirm on the quotation which edition carries the capability you need."],
      ["Do I need Revit to use it?", "No. Navisworks reviews models from many sources. Revit is one of the common ways those models are produced."],
    ],
  },
  "autodesk-platform-services": {
    lead: "Autodesk Platform Services is for developers. It provides programming interfaces and cloud services for working with design and engineering data, so a company can build its own application or automate a process around the files and models its teams already produce.",
    who: "It is for software teams inside engineering, construction and manufacturing companies, and for software partners, who want to automate or integrate design data. It is priced on enquiry because the quotation depends on what you intend to build and how you will use the services, so describe the use case when you ask.",
    diff: "It is a developer platform rather than a design application, and it is not a substitute for a seat of any design product. People who simply draw or model need the [AutoCAD](/autocad) or [Revit](/revit) style products instead.",
    faqs: [
      ["What is Autodesk Platform Services?", "A set of programming interfaces and cloud services for working with design and engineering data, used by developers to build or automate applications around Autodesk files and models."],
      ["Why is the price on request?", "The quotation depends on what you plan to build and how the services will be used, so we ask for the use case and quote on a written quotation."],
      ["Does it replace a design application?", "No. It is for developers integrating or automating design data. Designers and engineers still need the design products they work in."],
    ],
  },
  "autocad-revit-lt-suite": {
    lead: "The AutoCAD and Revit LT Suite puts Revit LT and AutoCAD LT together in one subscription, for small practices that draw in 2D and also want a 3D model-based tool for architectural design and documentation.",
    who: "It suits small architecture and design offices, and independent consultants, who keep their drawings in 2D but want to produce building models and the documents that come from them. It costs more than either product alone and less than buying both, so it pays when the same person uses both.",
    diff: "Compare it with [AutoCAD LT](/products/autocad-lt) alone, if you only draw in 2D, and with [Revit](/products/revit), if you need the full model-based product rather than the LT edition. The [difference between AutoCAD and AutoCAD LT](/blog/autocad-vs-autocad-lt) is worth reading first.",
    faqs: [
      ["What is in the AutoCAD and Revit LT Suite?", "Revit LT and AutoCAD LT in a single subscription, for 2D drafting and for architectural design and documentation in 3D."],
      ["Is it cheaper than buying the two separately?", "Usually, when one person uses both. Tell us who uses what and we will quote the suite against the two separate subscriptions."],
      ["What is the difference between the LT editions and the full products?", "The LT editions are limited versions at a lower price. Our article on AutoCAD versus AutoCAD LT sets out what the LT edition leaves out."],
    ],
  },
  "autodesk-fusion-contributor": {
    lead: "Fusion Contributor is the lighter way into Fusion and Fusion Manage workflows. It is for people who take part in product work, by reviewing, commenting or approving, without needing the design tools of a full seat.",
    who: "It is for managers, reviewers, purchasing and quality staff, and external collaborators who need to see and respond to engineering work. Giving everyone a full seat is the common way to overspend, so match the seat to the role: designers and engineers on full seats and the people who only take part as contributors.",
    diff: "Contributor access sits alongside [Fusion](/products/fusion-360) for design and [Fusion Manage](/products/autodesk-fusion-manage) for lifecycle workflows. If a person edits designs, they need a full seat, not this one.",
    faqs: [
      ["Who is Fusion Contributor for?", "People who take part in Fusion and Fusion Manage workflows by reviewing, commenting or approving, without designing or engineering."],
      ["Can a contributor edit a design?", "No. Contributor access is for taking part in the workflow. People who edit designs need a full seat."],
      ["How is it licensed?", "As an annual subscription for a named user. Each seat is assigned to one person and renews every year."],
    ],
  },
  "autodesk-flow-studio": {
    lead: "Flow Studio is a tool for putting computer-generated characters into live-action footage. You film a scene, the software tracks the camera and an actor's movement with AI-assisted motion capture, and the result can be exported to be edited, animated and composited further.",
    who: "It is for production houses, advertising teams and independent filmmakers who want CG characters in video without a full motion-capture studio. It is priced on enquiry, because the quotation depends on the number of seats and how they will be used, so tell us who will use it and for what kind of production.",
    diff: "Flow Studio starts from footage you have shot. The heavier modelling and animation tools sit in the [Media and Entertainment Collection](/products/autodesk-media-entertainment-collection), and review of the finished work in [Flow Production Tracking](/products/autodesk-flow-production-tracking).",
    faqs: [
      ["What is Autodesk Flow Studio?", "A tool that turns footage into CG scenes, with AI-powered motion capture, camera tracking, animation and compositing tools, whose output can be directed, edited and exported."],
      ["Do I need a motion-capture suit?", "The product is described as using AI-powered motion capture from footage. Confirm the capture requirements for your production on the quotation."],
      ["Why is the price on request?", "The quotation depends on the number of seats and how they are used, so we ask for the use case and quote on a written quotation."],
    ],
  },

  /* ───────────────────────── Adobe ───────────────────────── */
  "adobe-incopy-teams": {
    lead: "InCopy is for writers and editors who work on text that sits inside an InDesign layout. A designer builds the page in InDesign and the copywriter edits the text, with tracked changes, without opening or changing the design file.",
    who: "It is for magazines, publishers, marketing departments and anyone producing brochures and reports where text and design are done by different people. If a designer is retyping edits that arrive by email, InCopy removes that step. A buyer needs one InCopy seat per editor, and the designer's InDesign licence is separate.",
    diff: "InCopy edits the text; [InDesign](/adobe-indesign) builds the layout. It is a small, low-cost seat and is often added to an InDesign purchase rather than bought alone.",
    faqs: [
      ["What is Adobe InCopy?", "A writing and editing application that works on the text inside InDesign layouts, so copywriters and editors can edit and track changes without touching the design file."],
      ["Do I need InDesign to use InCopy?", "InCopy works on documents made in InDesign, so a designer using InDesign is part of the workflow. The designer's licence is separate."],
      ["How is it licensed?", sub("The seat is per editor.")],
    ],
  },
  "adobe-express-teams": {
    lead: "Adobe Express is for making social posts, short videos, flyers and documents quickly, from templates, with a company's brand assets kept in one place so the people making them stay on brand.",
    who: "It is for marketing, sales, HR and communications teams who produce a steady flow of simple material and do not have a designer free for each one. It lets non-designers produce acceptable work within brand rules and leaves the professional design tools to the designers.",
    diff: "Express is the quick, template-led tool. For professional image work see [Photoshop](/adobe-photoshop) and for layout [InDesign](/adobe-indesign); the full set is in [Creative Cloud](/adobe-creative-cloud). There is also an Express page at [Adobe Express](/adobe-express).",
    faqs: [
      ["What is Adobe Express used for?", "Making social posts, videos, flyers and documents quickly from templates, with shared brand assets so the work stays consistent."],
      ["Is Express a replacement for Photoshop?", "No. It is a quick, template-led tool for simpler material. Professional image editing still needs Photoshop."],
      ["How is it licensed?", sub("The seat is per person who creates.")],
    ],
  },
  "adobe-animate-teams": {
    lead: "Adobe Animate is for creating 2D animation and interactive content, such as explainer videos, tutorials, banner advertisements and interactive web graphics, which can be published to many platforms.",
    who: "It is for training teams, marketing departments, agencies and educators who produce animated explainers and learning material in-house. A buyer should check what output formats they need, because the web has moved on from some of the formats animation tools were built for, and ask us to confirm the publishing options for your use.",
    diff: "Animate makes 2D animation. For video editing see [Premiere Pro](/adobe-premiere-pro) and for motion graphics [After Effects](/adobe-after-effects). The whole group is available together in [Creative Cloud](/adobe-creative-cloud).",
    faqs: [
      ["What is Adobe Animate used for?", "Creating 2D animation and interactive content for company videos, tutorials, banner advertisements and websites, published to different platforms."],
      ["Is Animate the same as After Effects?", "No. Animate draws and animates 2D content. After Effects is used for motion graphics and effects on video."],
      ["How is it licensed?", sub("The seat is per animator.")],
    ],
  },
  "adobe-ai-assistant-for-acrobat": {
    lead: "The AI Assistant for Acrobat is an add-on that lets you ask questions of a PDF and receive a summary, instead of reading the whole document. It works inside Acrobat and Reader.",
    who: "It is for legal, finance, procurement and operations staff who read long contracts, reports and tender documents and need the key points fast. Confidentiality matters here: before turning on any assistant that reads documents, ask what is sent, where it is processed and what your organisation's policy allows.",
    diff: "It is an add-on, not a PDF editor. You still need a PDF application: see [Acrobat Pro](/adobe-acrobat-pro) for editing and creating, or [Acrobat Studio](/products/adobe-acrobat-studio) for Acrobat Pro bundled with creative tools.",
    faqs: [
      ["What does the AI Assistant for Acrobat do?", "It answers questions about a document and summarises it, including contracts, working inside Acrobat Pro, Standard and Reader."],
      ["Does it replace Acrobat?", "No. It is an add-on to Acrobat, not a replacement for it."],
      ["Is it safe to use on confidential documents?", "That depends on your organisation's policy and on how the service handles documents. Ask what is sent and where it is processed, and check it against your policy before use."],
    ],
  },
  "adobe-dreamweaver-teams": {
    lead: "Dreamweaver is a tool for building and editing websites by writing code with help from the editor, while seeing the result. It connects to Creative Cloud Libraries and Adobe Stock so design assets can be reused.",
    who: "It is for web teams and designers who hand-code or customise sites rather than use a hosted site builder, and for teams that want Creative Cloud assets in the same place. If your site runs on a content management system and nobody hand-codes pages, you may not need it, so check who will use it before buying.",
    diff: "Dreamweaver is the web-building tool in Adobe's range. For graphics see [Photoshop](/adobe-photoshop) and [Illustrator](/adobe-illustrator), all of which come together in [Creative Cloud](/adobe-creative-cloud).",
    faqs: [
      ["What is Adobe Dreamweaver used for?", "Building and editing responsive websites, with coding assistance, and linking to Creative Cloud Libraries and Adobe Stock assets."],
      ["Do I need Dreamweaver for a WordPress site?", "Not necessarily. It is aimed at people who build and edit pages in code. If you manage a site through a content management system, check who would actually use it."],
      ["How is it licensed?", sub("The seat is per web developer or designer.")],
    ],
  },
  "adobe-acrobat-studio": {
    lead: "Acrobat Studio brings Acrobat Pro and Creative Cloud tools together with AI-assisted document features, for teams that handle documents and creative work in the same workflow.",
    who: "It is for marketing, communications and operations teams that edit and sign PDFs but also make presentations, graphics and short pieces of content, and want one subscription for both. If someone only edits PDFs, Acrobat Pro alone costs less; if they also use the creative tools, Studio is the one to compare.",
    diff: "Compare it with [Acrobat Pro](/adobe-acrobat-pro) for PDF work alone, with the [AI Assistant add-on](/products/adobe-ai-assistant-for-acrobat) if you only want document questions answered, and with the full [Creative Cloud](/adobe-creative-cloud) set if designers need the professional applications.",
    faqs: [
      ["What is Adobe Acrobat Studio?", "Acrobat Pro together with creative tools and AI-assisted features for summarising documents, surfacing insights and answering questions about them."],
      ["Is it cheaper than Acrobat Pro?", "No. It includes more than Acrobat Pro does. If you only edit and sign PDFs, Acrobat Pro costs less."],
      ["How is it licensed?", sub("The seat is per person.")],
    ],
  },
  "adobe-frame-io-for-teams": {
    lead: "Frame.io is where creative work is reviewed and approved. A team uploads video, images or documents, reviewers comment directly on the frame or the page, and the creator sees every note against the exact moment it refers to, instead of reading a long email thread.",
    who: "It is for agencies, in-house video teams, production houses and marketing departments that need approvals from clients or managers who are not in the editing room. It is also useful where several revisions of the same piece go back and forth. The record lists three terabytes of storage with the first licence and more for each additional one, plus unlimited projects and sharing controls.",
    diff: "Frame.io handles review and approval, not creation. The editing happens in [Premiere Pro](/adobe-premiere-pro) and [After Effects](/adobe-after-effects), which connect to it. For a production-tracking tool aimed at animation and effects studios, compare [Autodesk Flow Production Tracking](/products/autodesk-flow-production-tracking).",
    faqs: [
      ["What is Frame.io used for?", "Sharing, reviewing and organising creative work in one place, with comments placed directly on the frame or page being discussed."],
      ["How much storage is included?", "The product record lists 3 TB of cloud storage with the first licence and 2 TB for each additional licence, with unlimited projects. Confirm current allowances on the quotation."],
      ["Do my clients need a licence to review?", "Reviewers generally do not need to be licensed to comment on shared work. Confirm the sharing and access options for your use on the quotation."],
      ["How is it licensed?", sub("The seat is per creator or manager.")],
    ],
  },
  "adobe-firefly-pro-plus": {
    lead: "Firefly Pro Plus is the larger of the Firefly subscriptions for generating images, video and audio with AI. The product record lists unlimited use of standard features and 10,000 monthly generative credits, plus Photoshop on web and mobile and Adobe Express Premium.",
    who: "It is for marketing and creative teams that generate a lot of material, especially video, where credits run out quickly. If a team makes only occasional images, the smaller plan is enough; ask who will use it and how often before choosing.",
    diff: "Firefly Pro is the smaller plan, listed at 4,000 monthly credits; Pro Plus is the 10,000-credit one. See [Adobe Firefly Pro](/products/adobe-firefly-pro) and the [Firefly page](/adobe-firefly). Both are separate from the full [Creative Cloud](/adobe-creative-cloud) set.",
    faqs: [
      ["What is the difference between Firefly Pro and Pro Plus?", "The product records list 4,000 monthly generative credits for Pro and 10,000 for Pro Plus. Pro Plus is the plan for heavier use, especially video."],
      ["What is a generative credit?", "A unit used up when you generate content with premium features such as video. Confirm what each action costs against your allowance on the quotation."],
      ["How is it licensed?", sub("The seat is per person.")],
    ],
  },
  "adobe-substance-3d-collection": {
    lead: "The Substance 3D Collection is Adobe's set of applications for creating 3D content: modelling, texturing and staging. It is aimed at product design, marketing and branding, and the record lists 100 monthly generative credits for premium video and audio features.",
    who: "It is for product designers, packaging and brand teams, and studios that need realistic 3D images of products before or without a photo shoot. It is a specialist purchase, so check that someone on the team has the skills before buying.",
    diff: "It is the 3D set within Adobe's range. For 2D image work see [Photoshop](/adobe-photoshop), and for the full range see [Creative Cloud](/adobe-creative-cloud). Autodesk's 3D animation tools are in the [Media and Entertainment Collection](/products/autodesk-media-entertainment-collection).",
    faqs: [
      ["What is in the Substance 3D Collection?", "Adobe's Substance 3D applications for creating realistic 3D content for product design, marketing and branding. Confirm the list of applications on the quotation."],
      ["Do I need a VR headset?", "No. The record notes that Substance 3D Modeler can be used on certain VR headsets, which is an option and not a requirement."],
      ["How is it licensed?", sub("The seat is per person.")],
    ],
  },
  "adobe-firefly-pro": {
    lead: "Firefly Pro is Adobe's subscription for generating images, video and audio with AI. The product record lists 4,000 monthly generative credits, unlimited generations on standard features, access to premium features such as video generation, and Photoshop on web and mobile with Adobe Express Premium.",
    who: "It is for marketing and creative teams that want to generate and edit visual content, with commercial-use questions settled in a business plan rather than a personal one. Ask who will use it, and for how much video, because video uses credits much faster than images.",
    diff: "Firefly Pro Plus is the larger plan, with 10,000 credits: see [Firefly Pro Plus](/products/adobe-firefly-pro-plus). Firefly is separate from [Creative Cloud](/adobe-creative-cloud), which carries the professional applications.",
    faqs: [
      ["What does Firefly Pro include?", "The product record lists 4,000 monthly generative credits, unlimited generations on standard features, premium features such as video generation, and Photoshop on web and mobile with Adobe Express Premium."],
      ["How do I know which Firefly plan I need?", "By how much you generate, particularly video. Pro suits regular use and Pro Plus suits heavier use. Tell us the number of people and the kind of work."],
      ["How is it licensed?", sub("The seat is per person.")],
    ],
  },

  /* ───────────────────────── Microsoft ───────────────────────── */
  "microsoft-365-business-standard-with-copilot": {
    lead: "This is Microsoft 365 Business Standard bundled with Microsoft 365 Copilot: the desktop and web Office applications, business email, Teams and storage, with Microsoft's AI assistant working across them.",
    who: "It is for organisations of up to 300 users that already run on Business Standard and want AI assistance for the people who write, summarise and analyse all day. Buy it for the staff who will use it. A mixed estate, with some people on the plain plan and some with Copilot, is usually cheaper than putting everyone on the bundle.",
    diff: "Compare it with [Business Standard](/products/microsoft-365-business-standard) without Copilot, and with [Business Premium with Copilot](/products/microsoft-365-business-premium-with-copilot), which adds device management and security. Our guide on [Copilot licensing in India](/blog/microsoft-365-copilot-licensing-in-india) explains the options.",
    faqs: [
      ["What is Microsoft 365 Business Standard with Copilot?", "Business Standard, with desktop and web Office apps, email, Teams and storage, together with Microsoft 365 Copilot, Microsoft's AI assistant across those applications."],
      ["Is there a seat limit?", "Microsoft 365 Business plans are for organisations of up to 300 users. Larger organisations use the enterprise plans."],
      ["Should everyone have Copilot?", "Not necessarily. Buy it for the people who will use it daily and keep the plain plan for the others. Tell us the numbers and we will price the mix."],
    ],
  },
  "microsoft-365-business-premium-with-copilot": {
    lead: "This is Microsoft 365 Business Premium bundled with Microsoft 365 Copilot: everything in Business Standard, plus device management and security tooling, with Microsoft's AI assistant across the Office applications.",
    who: "It is for organisations of up to 300 users that handle sensitive data or let staff use their own phones for work, and also want AI assistance for the people who benefit most. Premium's security layer is the reason to choose it over Standard, and Copilot is the reason to choose this bundle over plain Premium.",
    diff: "Compare it with [Business Premium](/products/microsoft-365-business-premium) alone, and with [Business Standard with Copilot](/products/microsoft-365-business-standard-with-copilot) if you do not need the security layer. See [Standard versus Premium](/blog/microsoft-365-business-standard-vs-business-premium) for what the extra buys.",
    faqs: [
      ["What does Business Premium with Copilot add to Business Standard with Copilot?", "Device management and security tooling for people who handle sensitive data or use personal phones for work."],
      ["Is Copilot included for everyone in the tenant?", "Copilot is licensed per user. Only the people with a Copilot-inclusive licence can use it."],
      ["Is there a seat limit?", "Business plans are for up to 300 users. Larger organisations use the enterprise plans."],
    ],
  },
  "microsoft-365-e7": {
    lead: "Microsoft 365 E7 is a top-tier enterprise plan. The product record describes it as the plan that brings Microsoft 365's productivity, security and compliance capabilities together with Microsoft's AI offering; confirm the exact contents on the quotation, because enterprise plans change.",
    who: "It is for large organisations that have outgrown the Business plans' 300-user limit and want one top-tier licence instead of assembling add-ons. It is quoted rather than bought online, because the price depends on the number of users, the term and what you already hold.",
    diff: "Compare it with [Microsoft 365 E5](/products/microsoft-365-e5) and [E3](/products/microsoft-365-e3) on the same quotation. The [enterprise plans page](/microsoft-365-enterprise-plans-and-pricing) sets out the range, and [E3 versus E5](/blog/microsoft-365-e3-vs-e5-for-indian-businesses) explains the main step.",
    faqs: [
      ["What is Microsoft 365 E7?", "A top-tier Microsoft 365 enterprise plan bringing productivity, security and compliance capabilities together with Microsoft's AI offering. Confirm the contents on the quotation."],
      ["How is E7 different from E5?", "E7 sits above E5 in Microsoft's range. Ask us to quote both on one document so the extra can be weighed against the cost."],
      ["Who should consider it?", "Large organisations that have outgrown the Business plans and want one top-tier licence instead of separate add-ons."],
    ],
  },
  "office-365-e1": {
    lead: "Office 365 E1 is an entry enterprise plan with the web and mobile Office applications, business email, Teams and storage, but without the installed desktop applications.",
    who: "It is for organisations over the Business plans' 300-user limit whose staff work mainly on the web and phone, such as frontline, retail and shift workers. It is the cheapest way to give those people business email and Teams, while desk staff who need the installed applications take a higher plan.",
    diff: "Compare it with [Office 365 E3](/products/office-365-e3) and [E5](/products/office-365-e5), which add the installed applications and, on E5, advanced security and analytics. The [enterprise plans page](/microsoft-365-enterprise-plans-and-pricing) lays out the range.",
    faqs: [
      ["Does Office 365 E1 include desktop Office?", "No. E1 includes the web and mobile applications. The installed desktop applications are in the higher plans."],
      ["Who is E1 suited to?", "Staff who work mainly on the web or phone, such as frontline and shift workers, in organisations that need an enterprise plan."],
      ["What is the difference between Office 365 and Microsoft 365?", "Microsoft 365 plans add Windows and device and security management to the Office 365 services. Office 365 plans cover the Office applications and services."],
    ],
  },
  "office-365-e3": {
    lead: "Office 365 E3 is a mainstream enterprise plan with the installed Office applications, business email, Teams, storage and the compliance tools larger organisations need.",
    who: "It is for organisations over the Business plans' 300-user limit whose staff work in the Office applications every day. It is the usual starting point for an enterprise rollout of Office without the Windows and device-management services of Microsoft 365 E3.",
    diff: "Compare it with [Office 365 E1](/products/office-365-e1), which has no installed applications, with [Office 365 E5](/products/office-365-e5), which adds advanced security and analytics, and with [Microsoft 365 E3](/products/microsoft-365-e3), which adds Windows and device management.",
    faqs: [
      ["What is included in Office 365 E3?", "Installed Office applications, business email, Teams, storage and compliance tools. Confirm the full list on the quotation."],
      ["How is Office 365 E3 different from Microsoft 365 E3?", "Microsoft 365 E3 adds Windows and device and security management to the Office 365 E3 services."],
      ["Is there a user limit?", "No. The Business plans are limited to 300 users; enterprise plans are not."],
    ],
  },
  "office-365-e5": {
    lead: "Office 365 E5 adds advanced security, analytics and voice capabilities to the services in E3. The catalogue lists it without audio conferencing; confirm the contents of the edition you are buying on the quotation.",
    who: "It is for larger organisations with a security or compliance team that will use the additional tools, and for those that want advanced analytics. If nobody will use the extra capabilities, E3 costs less and is the better choice.",
    diff: "Compare it with [Office 365 E3](/products/office-365-e3) and with [Microsoft 365 E5](/products/microsoft-365-e5), which adds Windows and device management. Our guide on [E3 versus E5](/blog/microsoft-365-e3-vs-e5-for-indian-businesses) explains the main step.",
    faqs: [
      ["What does Office 365 E5 add to E3?", "Advanced security, analytics and voice capabilities. Confirm the exact list for the edition on the quotation."],
      ["Does this edition include audio conferencing?", "The catalogue lists this product without audio conferencing. Confirm the edition on the quotation."],
      ["When is E3 enough?", "When nobody on the team will use the additional security and analytics tools. E3 costs less."],
    ],
  },
  "onedrive-for-business-plan-2": {
    who: "Plan 2 is for organisations that want OneDrive for Business as a standalone service, with the larger storage and the added retention and compliance controls that Plan 1 does not carry. Most organisations that already hold a Microsoft 365 plan have OneDrive included and do not need to buy it separately.",
    diff: "Compare it with [OneDrive for Business Plan 1](/products/onedrive-for-business-plan-1), and check whether the Microsoft 365 plan you already hold includes OneDrive before buying, which it often does. See [Microsoft 365](/microsoft-365).",
    faqs: [
      ["What is OneDrive for Business Plan 2?", "Microsoft's cloud storage and file sharing for business as a standalone service, with larger storage and added retention and compliance controls."],
      ["Do I need it if I have Microsoft 365?", "Usually not. Most Microsoft 365 plans include OneDrive. Check your plan before buying separately."],
      ["How is it licensed?", "As a per-user subscription. Each person who uses it needs a licence."],
    ],
  },

  /* ───────────────────────── Other software ───────────────────────── */
  "sketchup-studio": {
    who: "SketchUp Studio is for architects, interior designers and builders who model buildings and spaces in 3D and want rendering and analysis tools alongside the modelling. It suits small and mid-sized practices that want a quick way to turn an idea into a model a client can understand.",
    diff: "Compare it with [Revit](/revit), which is a full building information modelling product with documentation built into the model, and with [AutoCAD](/autocad) for 2D drafting. SketchUp is usually chosen for speed and ease at the design stage.",
    faqs: [
      ["What is SketchUp Studio used for?", "Modelling buildings and spaces in 3D, with the rendering and analysis tools that go with it, mostly at the design stage."],
      ["Is SketchUp a replacement for Revit?", "Not for building information modelling. SketchUp is quick and easy for design. Revit builds documentation and data into the model."],
      ["How is it licensed?", "As a subscription for a named user. Confirm the term and seat count on the quotation."],
    ],
  },

  /* ───────────────────────── Hardware ───────────────────────── */
  "hp-pro-400-g7-small-form-factor": {
    who: "A small-form-factor desktop is for offices where desk space is tight: reception, accounts, call-centre and back-office seats, and classrooms, where a compact box sits behind a monitor or under a desk. Because every build here is a business model, it can be ordered as a standard build for a fleet and re-ordered later, which is what makes spares and support simpler for a department or a company with many offices.",
    diff: "Within HP's Pro 400 desktops, the G7 Small Form Factor is the compact chassis on the older G7 generation. The [HP Pro 400 G7 Microtower](/products/hp-pro-400-g7-microtower) is the taller case on the same generation, with more room inside, and the [HP Pro 400 G9 Microtower](/products/hp-pro-400-g9-microtower) is the newer G9 generation. The builds listed above show exactly which processors, memory and storage are offered on this one.",
    faqs: [
      ["Who is the HP Pro 400 G7 Small Form Factor for?", "Offices that want a compact business desktop for everyday work: reception, accounts, back office and classrooms, in standard builds that can be re-ordered for a fleet."],
      ["How does it differ from the HP Pro 400 G7 Microtower?", "They are the same G7 generation in different chassis: this is the small form factor and the microtower is the taller case with more internal space. The builds listed on each page show what is offered."],
      ["Does it come with Windows?", "The builds listed show the operating system for each, which may be Windows 10 Pro, Windows 11 Pro or FreeDOS for organisations that image their own machines."],
      ["Do you list a price?", "No. Hardware is quoted to your configuration and quantity on a written quotation with a GST invoice."],
    ],
  },
  "hp-pro-400-g7-microtower": {
    who: "A microtower is for offices that want a conventional desktop case with room for later upgrades, such as additional storage or cards, and for places where the box sits on or beside the desk rather than being hidden behind a monitor. It suits schools, administrative offices and branch offices that keep machines for several years.",
    diff: "Within HP's Pro 400 desktops, this is the G7-generation microtower. The [HP Pro 400 G7 Small Form Factor](/products/hp-pro-400-g7-small-form-factor) is the compact chassis on the same generation, and the [HP Pro 400 G9 Microtower](/products/hp-pro-400-g9-microtower) is the newer generation in this case. The listed build shows exactly what is offered here.",
    faqs: [
      ["Who is the HP Pro 400 G7 Microtower for?", "Offices, schools and branch offices that want a conventional desktop case with room for upgrades and that keep machines for several years."],
      ["How is it different from the G9 Microtower?", "It is the older G7 generation in the same style of case. The G9 Microtower is the newer generation, with a wider choice of builds listed."],
      ["Do you list a price?", "No. Hardware is quoted to your configuration and quantity on a written quotation with a GST invoice."],
    ],
  },
  "hp-pro-400-g9-microtower": {
    who: "This is the newer-generation Pro 400 microtower, with the widest choice of builds among the Pro 400 desktops listed here: a range of processors and storage, Windows 11 Pro or FreeDOS, and warranties of three or five years. It suits organisations standardising a fleet that want a business desktop with room to upgrade, and public bodies that want to specify a warranty length in the order.",
    diff: "Within HP's Pro 400 desktops, the G9 Microtower is the current generation in the tower case. The [HP Pro 400 G7 Microtower](/products/hp-pro-400-g7-microtower) and the [G7 Small Form Factor](/products/hp-pro-400-g7-small-form-factor) are the earlier G7 generation. The [HP Pro Tower 280 G9](/products/hp-pro-tower-280-g9) is the lower-priced tower in HP's Pro 280 line.",
    faqs: [
      ["Who is the HP Pro 400 G9 Microtower for?", "Organisations standardising a fleet of business desktops that want room to upgrade, a choice of builds and a warranty of three or five years."],
      ["What warranty options are listed?", "The builds listed show three-year and five-year warranty options. Check the warranty against each build before ordering."],
      ["How is it different from the Pro Tower 280 G9?", "The Pro 400 is HP's mainstream business line. The Pro Tower 280 is an entry-level tower in the Pro 280 line, with builds listed from one to three years of warranty."],
      ["Do you list a price?", "No. Hardware is quoted to your configuration and quantity on a written quotation with a GST invoice."],
    ],
  },
  "hp-pro-tower-280-g9": {
    who: "The Pro Tower 280 is the entry-level business tower: for offices, schools and branches that need a dependable desktop for everyday work at the lowest sensible cost, and that image their own machines, since many builds are supplied with FreeDOS. It is a sensible choice for large, simple seat counts such as computer labs.",
    diff: "Within HP's range, the Pro Tower 280 G9 sits below the Pro 400 line. The [HP Pro 400 G9 Microtower](/products/hp-pro-400-g9-microtower) is the step up, with longer warranties and a wider choice of builds. Many Pro Tower 280 builds listed here carry shorter warranty terms, so compare the warranty as well as the processor.",
    faqs: [
      ["Who is the HP Pro Tower 280 G9 for?", "Offices, schools and branch offices that need an entry-level business tower for everyday work, often imaging their own machines, such as in computer labs."],
      ["Does it come with Windows?", "Many builds listed are supplied with FreeDOS so an organisation can install its own image. The builds listed show the operating system for each."],
      ["What is the difference between the Pro 280 and Pro 400?", "The Pro 400 is HP's mainstream business line and the Pro 280 is the entry-level tower below it. Compare the builds listed for warranty and specification."],
      ["Do you list a price?", "No. Hardware is quoted to your configuration and quantity on a written quotation with a GST invoice."],
    ],
  },
  "hp-z2-g9-tower-workstation": {
    who: "The Z2 G9 is for people whose work outgrows an ordinary desktop: engineers and architects running design software, media teams editing video, and analysts running simulation. It is specified when a discrete professional graphics card, or room to add one later, matters. For CAD and BIM users it is the sensible entry point to a certified workstation, and an Autodesk or Adobe subscription is quoted on the same order.",
    diff: "The Z2 G9 sits between HP's Pro desktops and the top of the Z range. The [HP Z8 Fury G5](/products/hp-z8-fury-g5-tower-workstation) is the high-end tower, with Xeon processors and much more memory and graphics, and the Pro desktops such as the [HP Pro 400 G9 Microtower](/products/hp-pro-400-g9-microtower) are for office work.",
    faqs: [
      ["Who is the HP Z2 G9 for?", "Engineers, architects, media teams and analysts whose work needs a professional graphics card or the room to add one: CAD, BIM, video editing and simulation."],
      ["What graphics are offered?", "The builds listed are offered with integrated graphics or an NVIDIA T1000, and power supplies from 350 W to 700 W."],
      ["Can you quote the software with it?", "Yes. We can quote Autodesk, Adobe and Microsoft licences on the same quotation as the workstation, with a GST invoice."],
    ],
  },
  "hp-z8-fury-g5-tower-workstation": {
    who: "The Z8 Fury G5 is for the heaviest workstation work: large simulations, medical and volumetric imaging, and training models on a single machine instead of a cluster. It is not a general purchase. Specify it when the workload would otherwise need a rack of servers, and bring the software requirement to the same conversation, because licences and memory often decide the build.",
    diff: "It is the top of HP's Z range. The [HP Z2 G9](/products/hp-z2-g9-tower-workstation) is the mid-range tower workstation for design and media work, and the Pro desktops are for office use.",
    faqs: [
      ["Who is the HP Z8 Fury G5 for?", "Teams running very large simulations, imaging or model-training workloads on a single workstation, where a mid-range workstation is not enough."],
      ["What warranty is listed?", "The product record lists five years of onsite warranty on every build listed."],
      ["Do you list a price?", "No. Hardware is quoted to your configuration and quantity on a written quotation with a GST invoice."],
    ],
  },
  "dell-poweredge-r570": {
    who: "The R570 is for storage-led and single-application workloads where the capacity of a 2U chassis matters more than the cores of a second processor: file services, backup targets, databases that fit in one socket. Public bodies and enterprises choose it for the iDRAC10 remote management and the ProSupport onsite response listed on the builds.",
    diff: "Within Dell's rack servers, the R570 is the single-socket 2U of the current generation. The [R760xs](/products/dell-poweredge-r760xs) is a capacity-oriented 2U with a different processor family, and the [R660xs](/products/dell-poweredge-r660xs) is a 1U for compute where rack space is scarce.",
    faqs: [
      ["What is the Dell PowerEdge R570 for?", "Storage-led and single-application workloads in a 2U chassis, such as file services and backup targets, where a single processor is enough."],
      ["How does it differ from the R760xs?", "Both are 2U. The R570 is a single-socket server of Dell's 17G generation with Xeon 6 processors; the R760xs is the capacity-oriented 2U with Xeon Silver or Gold processors."],
      ["Do you list a price?", "No. Servers are quoted to your configuration, drives and support term on a written quotation with a GST invoice."],
    ],
  },
  "dell-poweredge-r660xs": {
    who: "The R660xs is for organisations short of rack space whose workload is compute rather than storage: virtualisation hosts, application servers and branch data rooms. It puts dual-socket-capable compute into a single rack unit with eight 2.5-inch bays.",
    diff: "Within Dell's rack servers, the R660xs is the 1U. The [R570](/products/dell-poweredge-r570) and [R760xs](/products/dell-poweredge-r760xs) are 2U servers with room for more drives. Choose the 1U when rack units are scarce and the 2U when capacity matters.",
    faqs: [
      ["What is the Dell PowerEdge R660xs for?", "Compute-led workloads in a single rack unit, such as virtualisation hosts and application servers, where rack space is scarce."],
      ["How many drives does it take?", "The builds listed have eight 2.5-inch SAS or SATA bays. Drives are quoted to your requirement."],
      ["Do you list a price?", "No. Servers are quoted to your configuration, drives and support term on a written quotation with a GST invoice."],
    ],
  },
  "dell-poweredge-r760xs": {
    who: "The R760xs is for organisations buying terabytes rather than cores: file services, backup targets, and virtualisation with large local storage. Up to twelve 3.5-inch drives sit in a 2U chassis.",
    diff: "Within Dell's rack servers, the R760xs is the capacity-oriented 2U. The [R570](/products/dell-poweredge-r570) is the single-socket 2U of the current generation, and the [R660xs](/products/dell-poweredge-r660xs) is a 1U for compute. For shared storage across several servers, see [Dell PowerStore](/products/dell-powerstore-storage).",
    faqs: [
      ["What is the Dell PowerEdge R760xs for?", "Capacity-led workloads in a 2U chassis, such as file services, backup targets and virtualisation with large local storage."],
      ["How many drives does it take?", "Up to twelve 3.5-inch SAS or SATA drives. Drives are quoted to your requirement."],
      ["Do you list a price?", "No. Servers are quoted to your configuration, drives and support term on a written quotation with a GST invoice."],
    ],
  },
  "dell-poweredge-t160": {
    who: "The T160 is for the first server in a small office: a file, print or line-of-business server where there is no rack and no one to manage it full time. iDRAC remote management on every build means it can be looked after from elsewhere.",
    diff: "Within Dell's range, the T160 is the entry tower server. For a server in a rack see the [R660xs](/products/dell-poweredge-r660xs) or [R760xs](/products/dell-poweredge-r760xs), and for shared storage see [Dell PowerStore](/products/dell-powerstore-storage).",
    faqs: [
      ["Who is the Dell PowerEdge T160 for?", "Small offices buying a first server for file, print or line-of-business use, without a rack or a full-time administrator."],
      ["Does it include remote management?", "Yes. Every build listed includes iDRAC9 Enterprise, which provides remote console and power control."],
      ["Do you list a price?", "No. Servers are quoted to your configuration, drives and support term on a written quotation with a GST invoice."],
    ],
  },
  "dell-powerstore-storage": {
    who: "PowerStore is for organisations consolidating storage from many servers into one shared platform, where block and file data both need to be served and the platform has to grow without downtime. It is a considered purchase, sized on the data and the workloads, and we quote it with the servers and backup that connect to it.",
    diff: "Within the data centre, PowerStore is shared storage. Servers such as the [Dell PowerEdge R760xs](/products/dell-poweredge-r760xs) have drives of their own, and the [HPE MSA](/products/hpe-msa-storage-array) is HPE's entry-level shared array. See [data centre solutions](/data-centre-solutions) for how the layers fit together.",
    faqs: [
      ["What is Dell PowerStore?", "Dell's all-flash storage platform for consolidating block and file workloads, with inline deduplication and compression and non-disruptive scaling."],
      ["How do you size it?", "From a realistic data-reduction assumption for your own data, not a best-case figure, because effective capacity depends on the workload."],
      ["Do you list a price?", "No. Storage is quoted to your configuration on a written quotation with a GST invoice."],
    ],
  },
  "hpe-msa-storage-array": {
    who: "The MSA is for small and mid-sized virtualisation clusters that need shared block storage with redundant controllers, without the size of a larger platform. It suits organisations moving from server-local drives to a shared array so that virtual machines can move between hosts.",
    diff: "Within the data centre, the MSA is entry-level shared storage. [Dell PowerStore](/products/dell-powerstore-storage) is a larger all-flash platform. The [HPE ProLiant DL380 Gen11](/products/hpe-proliant-dl380-gen11) is a common server to connect to it.",
    faqs: [
      ["What is the HPE MSA?", "HPE's family of shared block storage arrays for small and mid-sized virtualisation clusters, with dual controllers and Fibre Channel, iSCSI or SAS connectivity."],
      ["How should it be sized?", "By the IOPS the workload needs and the recovery objectives you set, not by raw capacity alone."],
      ["Do you list a price?", "No. Storage is quoted to your configuration on a written quotation with a GST invoice."],
    ],
  },
  "hpe-proliant-dl360-gen11": {
    who: "The DL360 Gen11 is for virtualisation hosts and dense compute where rack space is scarce: it is the most compute HPE fits in a single rack unit. Government departments, banks and enterprises with full racks choose it to add capacity without a new cabinet.",
    diff: "Within HPE's range, the DL360 is the 1U. The [DL380 Gen11](/products/hpe-proliant-dl380-gen11) is the 2U, with more drive bays and expansion. Choose the DL360 for density and the DL380 for capacity.",
    faqs: [
      ["What is the HPE ProLiant DL360 Gen11 for?", "Dense compute and virtualisation hosts in a single rack unit, where rack space is scarce."],
      ["How does it differ from the DL380 Gen11?", "The DL360 is a 1U server and the DL380 is a 2U server with more drive bays and expansion room."],
      ["Do you list a price?", "No. Servers are quoted to your configuration, drives and support term on a written quotation with a GST invoice."],
    ],
  },
  "hpe-proliant-dl380-gen11": {
    who: "The DL380 Gen11 is the general-purpose HPE rack server: virtualisation with solid-state drives, or a storage-led build with a twelve-bay large-form-factor chassis. Estates that already run ProLiant standardise on it to keep spares and skills common.",
    diff: "Within HPE's range, the DL380 is the 2U. The [DL360 Gen11](/products/hpe-proliant-dl360-gen11) is the 1U for density. For shared storage see the [HPE MSA](/products/hpe-msa-storage-array), and see [data centre solutions](/data-centre-solutions) for the wider picture.",
    faqs: [
      ["What is the HPE ProLiant DL380 Gen11 for?", "General-purpose rack workloads: virtualisation with solid-state storage, or storage-led work with the twelve-bay large-form-factor chassis."],
      ["What warranty does it carry?", "The builds listed carry HPE's 3/3/3 warranty. Confirm the support term on the quotation."],
      ["Do you list a price?", "No. Servers are quoted to your configuration, drives and support term on a written quotation with a GST invoice."],
    ],
  },
  "hpe-aruba-networking-switch": {
    who: "Aruba switching is for the access and aggregation layers of offices, campuses and branches: connecting desktops, phones, access points and cameras, with Power over Ethernet to power the last three. It suits organisations that want one management view across many sites and role-based access control on the wired network.",
    diff: "Within networking, Aruba is HPE's switch line. Cisco's [Catalyst 9300 switches](/products/cisco-catalyst-9300-series-switches) and Fortinet's [FortiSwitch](/products/fortinet-fortiswitch) are alternatives, and your firewall is chosen separately: see [firewall security](/firewall-security).",
    faqs: [
      ["What is an Aruba switch used for?", "Connecting devices at the access and aggregation layers of office, campus and branch networks, with Power over Ethernet and centralised management."],
      ["How do I choose the port count?", "From the number of devices today and the growth you expect over the switch's service life, with a PoE budget sized for the phones, access points and cameras it will power."],
      ["Do you list a price?", "No. Switches are quoted to your configuration on a written quotation with a GST invoice."],
    ],
  },
};
