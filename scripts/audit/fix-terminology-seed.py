import pathlib, sys
PAIRS = [
 ("Can you supply multiple vendors on one purchase order?", "Can you supply multiple brands on one purchase order?"),
 ("multi-vendor solutions depend on vendor response", "multi-brand solutions depend on the publisher's or manufacturer's response"),
 (" * Vendor catalogue.", " * Brand catalogue."),
 ("Copy here is written for this application. Vendor names and product names are",
  "Copy here is written for this application. Brand names and product names are"),
 ("used descriptively to identify the software being resold; no vendor marketing",
  "used descriptively to identify the software being resold; no publisher marketing"),
 ("a single vendor covering CRM, accounting, service desk and collabora",
  "a single publisher covering CRM, accounting, service desk and collabora"),
 ("standardise a mixed estate on one vendor and one support relationship",
  "standardise a mixed estate on one manufacturer and one support relationship"),
 ("one portal per vendor", "one portal per publisher"),
 ("Multi-vendor sourcing", "Multi-brand sourcing"),
 ("two hardware vendors", "two hardware manufacturers"),
 ("seven vendor relati", "seven supplier relati"),
 ("One quotation covering multiple vendors, itemised by line",
  "One quotation covering multiple brands, itemised by line"),
 ("One point of contact for order status across vendors",
  "One point of contact for order status across brands"),
 ("Consistent commercial terms rather than per-vendor variation",
  "Consistent commercial terms rather than per-supplier variation"),
 ("We source across the relevant publishers and vendors, including alternatives worth considering.",
  "We source across the relevant publishers and manufacturers, including alternatives worth considering."),
 ("assignments in each vendor's admin console", "assignments in each publisher's admin console"),
 ("into your tenant or vendor account", "into your tenant or publisher account"),
 ("shipped from the vendor or distributor", "shipped from the manufacturer or distributor"),
 ("certified by the software vendors whose applications run on them",
  "certified by the software publishers whose applications run on them"),
 ("several publishers and hardware vendors", "several publishers and hardware manufacturers"),
 (" * vendor.", " * brand."),
]
total = 0
for path in sorted(pathlib.Path("prisma").rglob("*.ts")):
    s = path.read_text(); orig = s
    for old, new in PAIRS:
        s = s.replace(old, new)
    if s != orig:
        path.write_text(s); total += 1
        print(f"  {path}")
print(f"{total} seed file(s) updated.")
