export type ServiceSeed = {
  slug: string;
  name: string;
  category: string;
  summary: string;
  heroHeadline: string;
  problem: string;
  solution: string;
  benefits: string[];
  process: Array<{ step: number; title: string; description: string }>;
  technologies: string[];
  displayOrder: number;
  featured?: boolean;
  faqs: Array<{ question: string; answer: string }>;
};

export const services: ServiceSeed[] = [
  {
    slug: "microsoft-365",
    name: "Microsoft 365 Deployment",
    category: "Modern workplace",
    summary:
      "Tenant design, mailbox migration, policy configuration and user onboarding for Microsoft 365.",
    heroHeadline: "Microsoft 365, deployed properly the first time",
    problem:
      "Most Microsoft 365 problems are not licensing problems. They are configuration problems that surfaced months after go-live: a tenant set up with default settings, sharing policies nobody chose, a migration that left mail in two places, and users who were given a licence and a login but no explanation of what changed. The result is an organisation paying for capability it does not use and carrying risk it did not intend to accept.",
    solution:
      "We treat the deployment as a design exercise rather than a switch-on. That means deciding the identity model before anything else, agreeing the sharing and retention posture explicitly, migrating mail and files in a sequence that keeps a working fallback at every point, and running the user transition as a communication exercise rather than an email on the morning of the cutover.\n\nThe deliverable is a documented tenant your IT team can operate without us, not a dependency on our helpdesk.",
    benefits: [
      "Identity and access model agreed before any migration begins",
      "Mail and file migration with a working fallback at every stage",
      "Sharing, retention and conditional access configured deliberately",
      "Documented configuration handed to your team",
      "User onboarding that reduces the post-migration support spike",
      "Licence assignment matched to actual role requirements",
    ],
    process: [
      { step: 1, title: "Discovery", description: "We audit the current mail platform, file storage, identity sources, device estate and the compliance obligations that constrain the design." },
      { step: 2, title: "Design", description: "Tenant configuration, identity model, licence mapping and migration sequence are documented and agreed before any change is made." },
      { step: 3, title: "Pilot", description: "A representative group migrates first. Problems found here are configuration issues; found later, they are incidents." },
      { step: 4, title: "Migration", description: "Mail, files and groups move in agreed waves, each with a rollback position and a confirmed completion check." },
      { step: 5, title: "Enablement", description: "Users are onboarded with role-relevant guidance. Your IT team receives the documented configuration and an operational handover." },
      { step: 6, title: "Post-migration review", description: "Thirty days after cutover we review licence assignment, support tickets and adoption, and correct what the live environment revealed." },
    ],
    technologies: ["Microsoft 365", "Exchange Online", "SharePoint Online", "Microsoft Teams", "Entra ID", "Microsoft Intune"],
    displayOrder: 10,
    featured: true,
    faqs: [
      { question: "How long does a migration take?", answer: "For a straightforward organisation under 100 users, typically three to five weeks from discovery to completion. Complexity comes from the number of source systems, mailbox sizes and how much of the file estate needs restructuring rather than from headcount alone." },
      { question: "Will there be downtime?", answer: "Mail migration is designed so users keep working throughout - mail flows to the old system until their cutover, then to the new one. The visible change is a mail client reconfiguration, usually a few minutes per user." },
      { question: "Can you migrate from Google Workspace?", answer: "Yes. Mail, calendar, contacts and Drive content migrate to Exchange Online and SharePoint. The part that needs planning is Drive sharing structure, which does not map one-to-one to SharePoint permissions." },
    ],
  },
  {
    slug: "cloud",
    name: "Cloud Advisory & Migration",
    category: "Cloud",
    summary:
      "Workload assessment, platform selection, migration planning and execution across the major public clouds.",
    heroHeadline: "Cloud decisions that hold up three years later",
    problem:
      "Cloud migrations fail commercially far more often than technically. Workloads get lifted into a public cloud at the specification they had on-premises, run continuously at a size chosen for a peak that happens twice a year, and cost more than the hardware they replaced. The technology works; the business case does not.",
    solution:
      "We start with the workload economics rather than the migration mechanics. Each application is assessed for what it actually consumes, what its availability requirement genuinely is, and whether re-hosting, re-platforming or leaving it where it is produces the better outcome.\n\nWhat follows is a migration plan with a cost model attached, and a governance model that keeps the cost where the model said it would be after the project team leaves.",
    benefits: [
      "Workload-level assessment rather than a blanket migration",
      "Cost model built before commitment, not discovered afterwards",
      "Right-sizing based on measured consumption",
      "Reserved capacity and savings plan analysis where the baseline is genuinely stable",
      "Governance and tagging so cost stays attributable",
      "Migration sequenced to keep a rollback position",
    ],
    process: [
      { step: 1, title: "Assessment", description: "We measure current consumption, dependencies and availability requirements per workload rather than per server." },
      { step: 2, title: "Business case", description: "A cost model comparing stay, re-host and re-platform for each workload, with the assumptions stated so you can challenge them." },
      { step: 3, title: "Landing zone", description: "Network, identity, governance and tagging are built before workloads move, so cost attribution works from day one." },
      { step: 4, title: "Migration", description: "Workloads move in dependency order with a tested rollback at each wave." },
      { step: 5, title: "Optimisation", description: "Post-migration right-sizing against observed rather than projected load, and commitment purchasing once the baseline is real." },
      { step: 6, title: "Operate", description: "Ongoing cost review and governance, either by your team with our support or as a managed service." },
    ],
    technologies: ["Microsoft Azure", "Amazon Web Services", "Google Cloud", "Terraform", "Azure Migrate", "VMware"],
    displayOrder: 20,
    featured: true,
    faqs: [
      { question: "Should everything move to the cloud?", answer: "No, and we will tell you which workloads should not. Steady-state, high-throughput systems with predictable load and no elasticity requirement frequently cost more in a public cloud than on owned hardware. The assessment identifies those explicitly." },
      { question: "How accurate is the cost model?", answer: "It is built from your measured consumption, so it is considerably more reliable than a sizing estimate. We state the assumptions, including the ones we are least confident about, so the model can be challenged before money is committed." },
    ],
  },
  {
    slug: "azure",
    name: "Microsoft Azure Services",
    category: "Cloud",
    summary:
      "Azure landing zones, migration, cost governance and managed operations under CSP billing.",
    heroHeadline: "Azure that is governed, not just provisioned",
    problem:
      "Azure subscriptions grow by accretion. A project creates a resource group, another team creates a subscription, and eighteen months later nobody can explain a third of the bill or say with confidence which resources could be switched off tonight without consequence.",
    solution:
      "We build the governance layer that should have existed at the start: a landing zone with a subscription and management group structure that matches how your organisation is actually accountable for cost, a tagging policy that is enforced rather than requested, and budget alerts that fire before the invoice rather than with it.\n\nWhere there is an existing estate, we start by making the current spend explicable, which usually recovers a meaningful amount before any migration work begins.",
    benefits: [
      "Subscription and management group structure aligned to cost accountability",
      "Enforced tagging so spend is attributable by default",
      "Azure Hybrid Benefit applied where existing licences allow it",
      "Reserved instance and savings plan analysis against measured baseline",
      "Budget alerts and anomaly detection",
      "Consolidated INR invoicing with GST through CSP",
    ],
    process: [
      { step: 1, title: "Estate review", description: "Current subscriptions, resources and spend are mapped against owners and workloads." },
      { step: 2, title: "Quick wins", description: "Orphaned resources, over-provisioned compute and unattached storage are identified and addressed first." },
      { step: 3, title: "Landing zone", description: "Management groups, policy, network topology and identity are established as a governed foundation." },
      { step: 4, title: "Commitment planning", description: "Once the baseline is measured rather than assumed, reserved capacity is purchased against the steady portion." },
      { step: 5, title: "Ongoing governance", description: "Monthly cost review, anomaly investigation and right-sizing recommendations." },
    ],
    technologies: ["Microsoft Azure", "Azure Policy", "Azure Monitor", "Microsoft Entra ID", "Terraform", "Bicep"],
    displayOrder: 21,
    featured: true,
    faqs: [
      { question: "Can you take over billing for an existing Azure tenant?", answer: "Yes. Moving to CSP billing is an administrative change with no effect on running resources - no downtime, no reconfiguration, no migration of workloads." },
      { question: "What is Azure Hybrid Benefit worth?", answer: "It applies existing Windows Server and SQL Server licences with Software Assurance to Azure compute, and for Windows-heavy estates it commonly reduces virtual machine cost substantially. Whether you qualify depends on your licence entitlements, which we check rather than assume." },
    ],
  },
  {
    slug: "aws",
    name: "Amazon Web Services",
    category: "Cloud",
    summary: "AWS account structure, migration, cost optimisation and operational support.",
    heroHeadline: "AWS with the guardrails built in",
    problem:
      "AWS gives teams enormous latitude, which is its strength and, without structure, its cost problem. Accounts proliferate, instances are launched at defaults nobody revisits, and there is no organisational view of what is running or who authorised it.",
    solution:
      "We establish a multi-account structure with organisational policies, centralised logging and cost allocation from the outset, then migrate or optimise workloads within it.\n\nFor existing estates the sequence is reversed: make the spend visible and attributable first, eliminate the obvious waste, then restructure.",
    benefits: [
      "Multi-account organisation with service control policies",
      "Cost allocation tags enforced at the organisation level",
      "Savings Plans and Reserved Instance analysis",
      "Centralised logging and security baseline",
      "Right-sizing from measured CloudWatch data",
      "Migration planning with dependency mapping",
    ],
    process: [
      { step: 1, title: "Account and spend review", description: "Existing accounts, workloads and cost drivers are mapped." },
      { step: 2, title: "Landing zone", description: "Organisation structure, guardrails, logging and network baseline." },
      { step: 3, title: "Waste removal", description: "Idle instances, unattached volumes and orphaned snapshots are identified and removed." },
      { step: 4, title: "Migration or modernisation", description: "Workloads move or are re-platformed in dependency order." },
      { step: 5, title: "Commitment and review", description: "Savings Plans purchased against the measured baseline, with ongoing monthly review." },
    ],
    technologies: ["Amazon Web Services", "AWS Organizations", "AWS Control Tower", "Terraform", "Amazon CloudWatch"],
    displayOrder: 22,
    faqs: [
      { question: "Do you support multi-cloud?", answer: "Yes, and we will also tell you when multi-cloud is adding operational cost without a corresponding benefit. Running the same workload across two providers for its own sake is expensive; using each for what it does best is not." },
    ],
  },
  {
    slug: "google-cloud",
    name: "Google Cloud",
    category: "Cloud",
    summary: "Google Cloud project structure, migration, data platform and cost management.",
    heroHeadline: "Google Cloud for data-led workloads",
    problem:
      "Google Cloud is frequently chosen for a specific capability — usually data analytics or Kubernetes — and then run without the project structure, IAM design or billing controls that keep it manageable as usage grows beyond the initial team.",
    solution:
      "We build the organisation, folder and project hierarchy to match your accountability model, establish IAM at the right granularity, and put billing export and budget controls in place before consumption scales.\n\nFor analytics workloads specifically, we focus on the query and storage patterns that drive cost, because BigQuery bills behave very differently from virtual machine bills and the intuitions do not transfer.",
    benefits: [
      "Organisation, folder and project hierarchy matched to your structure",
      "IAM designed at appropriate granularity rather than broad roles",
      "Billing export and budget alerting",
      "BigQuery cost patterns reviewed against actual query behaviour",
      "Committed use discount analysis",
      "Kubernetes platform design where containers are in scope",
    ],
    process: [
      { step: 1, title: "Workload review", description: "Current or intended workloads, data volumes and access patterns." },
      { step: 2, title: "Foundation", description: "Organisation hierarchy, IAM, networking and billing controls." },
      { step: 3, title: "Migration or build", description: "Workloads deployed or migrated with infrastructure as code." },
      { step: 4, title: "Cost tuning", description: "Query patterns, storage classes and commitment purchasing reviewed against measured usage." },
    ],
    technologies: ["Google Cloud", "BigQuery", "Google Kubernetes Engine", "Cloud IAM", "Terraform"],
    displayOrder: 23,
    faqs: [
      { question: "Is Google Cloud cheaper than the alternatives?", answer: "For some workloads, particularly large-scale analytics, it can be. For general-purpose compute the difference is usually smaller than the difference made by right-sizing. We compare against your specific workload rather than a generic benchmark." },
    ],
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity Services",
    category: "Security",
    summary:
      "Security posture assessment, identity hardening, endpoint protection and incident readiness.",
    heroHeadline: "Security work that closes the gaps that actually get exploited",
    problem:
      "Most organisations that suffer a breach were not defeated by a sophisticated adversary. They were compromised through a credential without multi-factor authentication, an unpatched internet-facing service, or an account belonging to someone who left eight months ago. The controls that would have prevented it were available and unconfigured.",
    solution:
      "We work through the controls in order of what actually gets exploited rather than what scores well on a framework. Identity first — multi-factor authentication, conditional access, privileged account review, and joiner-mover-leaver process that is enforced rather than documented. Then endpoint posture, email security, patch discipline and backup recoverability.\n\nWe report what we find plainly, including where the effort should not go. A finding that costs a month to close and reduces real risk marginally is worth saying so about.",
    benefits: [
      "Assessment against exploited attack paths, not just a framework checklist",
      "Multi-factor authentication and conditional access implemented, not just recommended",
      "Privileged account review and standing access reduction",
      "Endpoint protection and patch compliance visibility",
      "Backup recoverability tested rather than assumed",
      "Prioritised remediation plan with effort and risk stated for each item",
    ],
    process: [
      { step: 1, title: "Posture assessment", description: "Identity, endpoint, email, network and backup controls are reviewed against how compromises actually occur." },
      { step: 2, title: "Prioritised findings", description: "Each finding is reported with its real risk, the effort to close it and our recommendation on whether it is worth closing now." },
      { step: 3, title: "Identity hardening", description: "Multi-factor authentication, conditional access and privileged access are addressed first, because they close the most common path." },
      { step: 4, title: "Endpoint and email", description: "Endpoint protection policy, patch compliance and email filtering are brought to a known state." },
      { step: 5, title: "Recovery testing", description: "Backups are restored in a test, because an untested backup is a plan rather than a capability." },
      { step: 6, title: "Review cycle", description: "Periodic reassessment, since posture degrades as the estate changes." },
    ],
    technologies: ["Microsoft Defender", "Microsoft Entra ID", "Microsoft Intune", "Microsoft Purview", "Microsoft Sentinel"],
    displayOrder: 30,
    featured: true,
    faqs: [
      { question: "Do we need a separate security product if we have Microsoft 365 Business Premium?", answer: "Often not. Business Premium includes Defender for Endpoint, Intune and conditional access, which covers a great deal - if it is configured. Most organisations holding these licences are using a fraction of what they already pay for, and that is the cheapest security improvement available to them." },
      { question: "Is this a penetration test?", answer: "No. This is a configuration and posture assessment, which finds a different and generally more actionable class of problem. Penetration testing is valuable once the basics are in place; before that it usually confirms what an assessment would have told you faster and for less." },
    ],
  },
  {
    slug: "email-migration",
    name: "Email Migration",
    category: "Modern workplace",
    summary:
      "Mailbox, calendar and archive migration between platforms with minimal user disruption.",
    heroHeadline: "Mail migration without the week of chaos afterwards",
    problem:
      "Email migration goes wrong in predictable ways: shared mailboxes and delegate permissions that do not survive the move, calendar meetings that lose their organiser, archives that were never in scope but turn out to be business-critical, and a support queue that spikes for a fortnight because nobody told users what would change.",
    solution:
      "We inventory everything that touches mail before moving any of it — shared mailboxes, delegates, distribution lists, forwarding rules, connected applications and archives — because those are what break, not the mailboxes themselves.\n\nMigration runs in waves with mail flowing correctly throughout, and users get specific instructions for their situation rather than a generic notice.",
    benefits: [
      "Full inventory of mailboxes, delegates, shared mailboxes and connected systems",
      "Wave-based migration with mail flowing throughout",
      "Calendar and delegate permissions preserved",
      "Archive and retention requirements addressed explicitly",
      "User communication targeted to what each group needs to do",
      "Post-migration support during the period problems actually appear",
    ],
    process: [
      { step: 1, title: "Inventory", description: "Every mailbox, shared mailbox, delegate relationship, distribution list, rule and connected application is catalogued." },
      { step: 2, title: "Domain and routing plan", description: "DNS, mail routing and coexistence are designed so mail flows correctly at every point of the migration." },
      { step: 3, title: "Pilot wave", description: "A small representative group migrates first, including at least one complex delegate arrangement." },
      { step: 4, title: "Production waves", description: "Users migrate in agreed groups with confirmation checks after each." },
      { step: 5, title: "Cutover and cleanup", description: "Mail routing switches fully, the source platform is decommissioned on an agreed date, and archives are verified." },
    ],
    technologies: ["Exchange Online", "Google Workspace", "Zoho Mail", "IMAP migration tooling", "DNS management"],
    displayOrder: 31,
    faqs: [
      { question: "Will users lose email during the migration?", answer: "No. Mail is copied rather than moved, and the source remains intact until the agreed decommission date. If something is wrong after cutover, the original mailbox is still there." },
      { question: "What about mailboxes larger than the destination limit?", answer: "Oversized mailboxes are identified in the inventory stage. They are usually handled by migrating recent mail to the mailbox and older mail to an online archive, which is what the archive is for." },
    ],
  },
  {
    slug: "endpoint-management",
    name: "Endpoint Management",
    category: "Modern workplace",
    summary:
      "Device enrolment, configuration policy, application deployment and compliance reporting.",
    heroHeadline: "Devices you can account for and recover",
    problem:
      "An unmanaged device estate produces a specific set of failures: laptops that cannot be wiped when they are lost, software installed by whoever had local admin, patch levels nobody can report on, and a new starter who waits three days for a working machine.",
    solution:
      "We enrol devices into a management platform, build configuration and compliance policy that reflects how your organisation actually works, and package the applications people need so a new machine is productive on the first day rather than the third.\n\nThe measure of success is that you can answer, at any moment, how many devices are compliant, which are not, and what happens when one is lost.",
    benefits: [
      "Automated enrolment for new devices",
      "Configuration and compliance policy applied consistently",
      "Application packaging and deployment without manual installation",
      "Patch compliance visible and reportable",
      "Remote wipe and recovery for lost devices",
      "Conditional access tied to device compliance",
    ],
    process: [
      { step: 1, title: "Estate audit", description: "Current devices, operating system versions, ownership model and existing management tooling." },
      { step: 2, title: "Policy design", description: "Configuration, compliance and security baselines agreed against how staff actually work." },
      { step: 3, title: "Application packaging", description: "Required applications packaged for automated deployment." },
      { step: 4, title: "Pilot enrolment", description: "A representative device group is enrolled and policy behaviour verified." },
      { step: 5, title: "Estate rollout", description: "Remaining devices enrolled in waves, with new devices using automated provisioning." },
      { step: 6, title: "Operational handover", description: "Reporting, exception handling and ongoing policy management handed to your team." },
    ],
    technologies: ["Microsoft Intune", "Windows Autopilot", "Microsoft Entra ID", "Apple Business Manager", "Android Enterprise"],
    displayOrder: 32,
    faqs: [
      { question: "Can personal devices be managed without controlling the whole device?", answer: "Yes. Application-level protection policies secure company data on a personal device without giving the organisation control of the device itself. It is the right model for bring-your-own scenarios and avoids a difficult conversation about employer reach." },
    ],
  },
  {
    slug: "backup-disaster-recovery",
    name: "Backup & Disaster Recovery",
    category: "Resilience",
    summary:
      "Backup design, offsite replication, recovery testing and documented recovery procedures.",
    heroHeadline: "Backups that have actually been restored",
    problem:
      "Almost every organisation has backups. A much smaller number have restored from them recently, and a smaller number still know how long a full recovery would take. The gap between having a backup and having a recovery capability is where the damage happens.",
    solution:
      "We start from the recovery requirement rather than the backup schedule: how much data can this business afford to lose, and how long can it be without this system? Those two answers determine the design, and they are business decisions rather than technical ones.\n\nWe then build to meet them, document the recovery procedure, and test it — including a restore that someone other than the person who built it can perform.",
    benefits: [
      "Recovery point and recovery time objectives agreed per system",
      "Backup design built to meet those objectives, not a default schedule",
      "Offsite and immutable copies protecting against ransomware",
      "Microsoft 365 data backed up, which the platform does not do for you",
      "Documented recovery procedures anyone qualified can follow",
      "Scheduled restore testing with results reported",
    ],
    process: [
      { step: 1, title: "Requirement setting", description: "Recovery point and recovery time objectives agreed per system with the business, not assumed by IT." },
      { step: 2, title: "Current state review", description: "Existing backup coverage, retention, offsite copies and any untested assumptions." },
      { step: 3, title: "Design", description: "Backup topology, retention, immutability and offsite replication designed against the agreed objectives." },
      { step: 4, title: "Implementation", description: "Backup infrastructure deployed and initial seeding completed." },
      { step: 5, title: "Recovery documentation", description: "Written recovery procedures for each system, in enough detail to be followed under pressure." },
      { step: 6, title: "Restore testing", description: "Scheduled tests with documented results, performed by someone who did not build the system." },
    ],
    technologies: ["Veeam", "Azure Backup", "Microsoft 365 Backup", "Azure Site Recovery", "Immutable object storage"],
    displayOrder: 40,
    featured: true,
    faqs: [
      { question: "Does Microsoft back up our Microsoft 365 data?", answer: "Not in the way most organisations assume. Microsoft protects the service and provides limited retention and recycle bin recovery, but it is explicitly your responsibility to protect your data against accidental deletion, malicious action or a retention gap. A third-party backup is a genuine requirement, not an upsell." },
      { question: "How often should restores be tested?", answer: "At least annually for a full recovery scenario, and quarterly for file-level restores. A backup that has never been restored is an assumption. The first restore should not happen during an incident." },
    ],
  },
  {
    slug: "it-helpdesk",
    name: "IT Helpdesk & Managed Support",
    category: "Managed services",
    summary:
      "Service desk, monitoring and proactive maintenance with defined response commitments.",
    heroHeadline: "A service desk with response times in writing",
    problem:
      "Small IT teams spend their time on interruptions. The work that would reduce future interruptions — patching, monitoring, documentation, capacity planning — is always next week's work, and next week has its own interruptions.",
    solution:
      "We take the interruption load: a service desk with defined response times, monitoring that catches failures before users report them, and the routine maintenance that otherwise never happens.\n\nWhat we do not do is become an opaque dependency. Documentation, monitoring dashboards and ticket history stay accessible to you, so the relationship can be ended without an archaeology project.",
    benefits: [
      "Defined response and resolution commitments stated in the agreement",
      "Monitoring with alerting before users notice",
      "Patch and update management on a schedule",
      "Asset and configuration documentation maintained",
      "Escalation path to specialists for complex issues",
      "Monthly reporting on volumes, trends and recurring causes",
    ],
    process: [
      { step: 1, title: "Onboarding audit", description: "Estate, systems, access, existing documentation and current pain points." },
      { step: 2, title: "Tooling deployment", description: "Monitoring agents, patch management and remote support tooling deployed." },
      { step: 3, title: "Service definition", description: "Response commitments, escalation path, in-scope and out-of-scope work agreed in writing." },
      { step: 4, title: "Transition", description: "Support handover with a period of overlap rather than a hard switch." },
      { step: 5, title: "Steady state", description: "Ongoing support with monthly reporting and periodic service review." },
    ],
    technologies: ["Remote monitoring and management", "Ticketing platform", "Microsoft Intune", "Patch management", "Remote support tooling"],
    displayOrder: 41,
    faqs: [
      { question: "What response times do you commit to?", answer: "Response commitments are stated in the service agreement and vary by severity and by the tier you select. We put them in writing before you sign rather than describing them qualitatively - a commitment that is not written down is not a commitment." },
      { question: "Do you replace our internal IT team?", answer: "Usually we work alongside it. The common arrangement is that we take first-line volume and routine maintenance so the internal team can work on projects. Full outsourcing is possible but is a different engagement." },
    ],
  },
  {
    slug: "software-asset-management",
    name: "Software Asset Management",
    category: "Licensing operations",
    summary:
      "Licence position audit, entitlement reconciliation and ongoing compliance management.",
    heroHeadline: "Know what you own before you renew it",
    problem:
      "Organisations routinely pay for licences nobody uses and are simultaneously under-licensed somewhere else. Both are expensive: unused subscriptions are direct waste, and a shortfall discovered during a publisher audit is settled at list price with no negotiating position.",
    solution:
      "We establish your effective licence position: what you own, what is deployed, what is actually used, and where the two do not match. That comparison almost always finds recoverable cost — unassigned seats, over-specified editions, duplicate tools serving the same purpose — and it finds shortfalls while they can still be corrected quietly.\n\nWe then put a process in place so the position stays current instead of degrading until the next audit.",
    benefits: [
      "Effective licence position across your main publishers",
      "Unused and unassigned seats identified for reclamation",
      "Edition right-sizing where a higher tier is not being used",
      "Compliance gaps found before a publisher audit finds them",
      "Renewal calendar so no renewal happens by default",
      "Process to keep the position current rather than a one-off snapshot",
    ],
    process: [
      { step: 1, title: "Entitlement collection", description: "Purchase records, agreements and portal entitlements are gathered into a single position." },
      { step: 2, title: "Deployment discovery", description: "What is actually installed and, where measurable, actually used." },
      { step: 3, title: "Reconciliation", description: "Entitlement against deployment, producing the effective licence position." },
      { step: 4, title: "Findings and actions", description: "Recoverable cost and compliance gaps, each with a recommended action." },
      { step: 5, title: "Renewal calendar", description: "Every renewal date recorded with a review window before it, so nothing auto-renews unexamined." },
      { step: 6, title: "Ongoing management", description: "Periodic reconciliation so the position stays accurate as the estate changes." },
    ],
    technologies: ["Microsoft 365 admin centre", "Adobe Admin Console", "Autodesk Account", "Discovery tooling", "Entitlement reconciliation"],
    displayOrder: 50,
    featured: true,
    faqs: [
      { question: "How much do organisations typically recover?", answer: "It varies too widely to promise a figure, and we will not quote one before looking. The common sources are unassigned subscription seats, users on a higher edition than they use, and overlapping tools bought by different departments. We report what we find with the evidence attached." },
      { question: "What happens if we find we are under-licensed?", answer: "It is corrected quietly and on your terms, which is precisely the reason to look before a publisher does. A shortfall found in an audit is settled at list price with penalties; the same shortfall found internally is a purchase at normal commercial rates." },
    ],
  },
  {
    slug: "licence-management",
    name: "Licence Management",
    category: "Licensing operations",
    summary:
      "Ongoing licence administration, renewal handling and seat allocation as your organisation changes.",
    heroHeadline: "Licensing that keeps pace with your headcount",
    problem:
      "Licence administration is a small task that is never anyone's priority. Seats stay assigned to people who left, new starters wait for someone to notice they need a licence, renewals happen automatically at whatever the count was last year, and the total quietly grows.",
    solution:
      "We manage the administration: seat assignment and reclamation as people join and leave, a renewal calendar with a review before each date, and a single consolidated view across publishers rather than one portal per publisher.\n\nThe intent is that your licence count tracks your headcount closely, in both directions.",
    benefits: [
      "Seat assignment and reclamation handled as staff change",
      "Renewal calendar with a review window before every date",
      "Consolidated view across Microsoft, Adobe, Autodesk and Zoho",
      "Mid-term additions handled without a procurement cycle",
      "Renewal quotations prepared in advance rather than at the deadline",
      "Single point of contact across publishers",
    ],
    process: [
      { step: 1, title: "Position baseline", description: "Current entitlements, assignments and renewal dates across publishers." },
      { step: 2, title: "Process agreement", description: "How joiner and leaver notifications reach us, and what we are authorised to do without further approval." },
      { step: 3, title: "Ongoing administration", description: "Seat changes actioned within the agreed window as notifications arrive." },
      { step: 4, title: "Renewal cycle", description: "Each renewal reviewed against actual usage before it is quoted, not after it has renewed." },
      { step: 5, title: "Periodic review", description: "Quarterly review of position, spend and upcoming renewals." },
    ],
    technologies: ["Microsoft 365 admin centre", "Adobe Admin Console", "Autodesk Account", "Zoho admin", "Renewal tracking"],
    displayOrder: 51,
    faqs: [
      { question: "How quickly are seat changes actioned?", answer: "Within the window agreed in your service definition, which for most clients is one business day for additions and reclamations. Urgent additions for a new starter are handled same-day where the notification reaches us in the morning." },
    ],
  },
  {
    slug: "it-procurement",
    name: "IT Procurement",
    category: "Licensing operations",
    summary:
      "Multi-brand sourcing, consolidated quotations and single purchase order fulfilment.",
    heroHeadline: "One purchase order for your whole technology stack",
    problem:
      "A single technology refresh can involve four publishers, two hardware manufacturers and a services engagement. Handled directly, that is seven supplier relationships, seven quotations in different formats, seven purchase orders through your finance system and seven sets of invoices to reconcile — for one project.",
    solution:
      "We consolidate the sourcing. One requirement goes in, one quotation comes back covering every line, one purchase order is raised, and one GST invoice is issued.\n\nThe quotation itemises every line at its own price, so consolidation does not mean losing visibility of what each component costs.",
    benefits: [
      "One quotation covering multiple brands, itemised by line",
      "Single purchase order and single GST invoice",
      "One point of contact for order status across brands",
      "Consistent commercial terms rather than per-supplier variation",
      "Renewal dates consolidated onto common anniversaries where possible",
      "Reduced administrative load on your finance team",
    ],
    process: [
      { step: 1, title: "Requirement", description: "You describe the requirement once, in whatever detail you have." },
      { step: 2, title: "Sourcing", description: "We source across the relevant publishers and manufacturers, including alternatives worth considering." },
      { step: 3, title: "Consolidated quotation", description: "A single itemised quotation with every line priced and the GST position stated." },
      { step: 4, title: "Order", description: "One purchase order covers the whole quotation." },
      { step: 5, title: "Fulfilment", description: "Licences provisioned and hardware shipped, with a single status contact throughout." },
      { step: 6, title: "Invoice", description: "One GST invoice with your GSTIN recorded for input credit." },
    ],
    technologies: ["Multi-brand sourcing", "Consolidated quotation", "GST invoicing", "Purchase order fulfilment"],
    displayOrder: 52,
    featured: true,
    faqs: [
      { question: "Do you handle hardware as well as software?", answer: "Yes. Servers, storage, networking and workstations can appear on the same quotation and the same purchase order as the software licensing, which is usually the point." },
      { question: "Can renewals be aligned to one date?", answer: "Often, yes. Co-terminating subscriptions onto a common anniversary is possible with most publishers and considerably reduces administrative overhead. It usually involves a prorated adjustment in the first term, which we will show you before proceeding." },
    ],
  },
];
