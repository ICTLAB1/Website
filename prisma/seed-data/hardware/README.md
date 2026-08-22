# Hardware catalogue data

One JSON file per manufacturer, imported by `scripts/import-hardware.ts`. The
schema is enforced by the importer — a file that does not match is rejected
line by line rather than half-imported.

```bash
npx tsx scripts/import-hardware.ts data/hardware/hp.json --dry-run
npx tsx scripts/import-hardware.ts data/hardware/hp.json --images data/hardware/images
```

`--dry-run` reports what would change, including every missing or malformed
photograph, and writes nothing. Run it first.

## The source is the manufacturer

Every field comes from the manufacturer's own current product pages — HP India,
Lenovo India, Acer India. Not Amazon, not Flipkart, not IndiaMART, not a
reseller, not a blog, not an image search. Those sources carry discontinued
models, regional variants that are not sold here, and specifications that were
true two revisions ago.

`sourceUrl` is required on every model for this reason, and `checkedOn` records
when the pages were read. Together they are what makes the catalogue
re-checkable a year from now, when a specification is questioned and nobody
remembers where the number came from.

## Fields

### The file

| Field | Notes |
| --- | --- |
| `brand` | Brand slug, e.g. `hp`. Must already exist. |
| `category` | Category slug, e.g. `infrastructure-hardware`. Must already exist. |
| `source` | Where this came from, in words. A URL where there is one, a description where there is not — "HP Z-series line card supplied by the distributor". Required. |
| `checkedOn` | `YYYY-MM-DD`, when the source was read. |

### Each model

| Field | Notes |
| --- | --- |
| `name` | The manufacturer's model name. |
| `series` | `EliteBook`, `ThinkPad T`, `Z2`. Becomes a filter. |
| `formFactor` | One of `LAPTOP`, `MOBILE_WORKSTATION`, `DESKTOP_TOWER`, `DESKTOP_SFF`, `DESKTOP_MINI`, `DESKTOP_WORKSTATION`, `ALL_IN_ONE`. |
| `shortDescription` | One or two sentences, **written for this site**. |
| `description` | A few paragraphs, likewise written rather than copied. |
| `businessFeatures` | Security, manageability, durability — what makes the range commercial. |
| `specifications` | `{ label, value }` rows — only what is true of *every* build. Anything that varies goes in `configurations`. |
| `configurations` | The builds this model is sold in. At least one. |
| `image` | A filename inside the `--images` directory. |
| `sourceUrl` | The manufacturer's page for this model, where the source is a page. Optional. |
| `status` | `ACTIVE` or `DISCONTINUED`. Discontinued models stop being listed and keep their record. |

### Each configuration

| Field | Notes |
| --- | --- |
| `partNumber` | The manufacturer's. Optional — a line card genuinely omits it for a deal build, and the site then shows "On request" rather than a number it made up. |
| `alsoOrderedAs` | Further part numbers the same build is ordered under. |
| `processor`, `memory`, `storage`, `graphics`, `operatingSystem`, `warranty` | Free text, as the source writes it. |
| `opticalDrive`, `powerSupply` | Optional. |
| `note` | "Made in India", "Modified" — kept verbatim. |

## A model is not a build

Twelve part numbers of the same workstation are **one model with twelve
configurations**, not twelve products. Twelve cards all reading "Z2 G1i" is a
list a buyer has to decode; one card leading to a table of twelve is the
decision they came to make. Put the varying attributes in `configurations` and
leave `specifications` for what every build shares.

## Three things the importer will not do

**It will not carry a price.** There is no price field, and it writes a
zero-priced enquiry-only variant whatever a file contains. Manufacturer feeds
carry MRP and promotional pricing; none of it belongs on a quotation catalogue.

**It will not accept consumer or gaming ranges.** Pavilion, ENVY, OMEN, Victus,
IdeaPad, Legion, LOQ, Aspire, Nitro, Predator and Chromebooks are refused by
name, per brand, and reported at the end of the run. This is a commercial
catalogue; the guard exists because a manufacturer data feed usually contains
the whole product line.

**It will not invent a photograph.** A model with no image, or with a file that
is not really an image, lists with a labelled empty frame and is reported by
`npm run verify:hardware`. A generic laptop, a manufacturer logo or a render in
place of the product is worse than a gap, because it shows a buyer something
that is not what they are being quoted.

## Descriptions

Write them. Do not paste the manufacturer's marketing copy: it is theirs, it is
written to sell against competitors rather than to inform a procurement
decision, and it dates.

A useful short description names the platform, the display, and the one or two
business capabilities that matter — then stops. Where a specification varies by
configuration, say so in the value: **"Configuration dependent"** and
**"Available in selected configurations"** are correct answers and are better
than a number that is only true for one SKU.

## Images

Put the manufacturer's own product photograph in the `--images` directory and
name it in the model's `image` field. The importer validates it by its leading
bytes, renames it after the product's slug, and copies it into
`public/products/`, which is committed.

Committed rather than uploaded, because `public/` is copied into the container
image at build time — a file placed there on a running server disappears at the
next deploy. Catalogue artwork arrives with a data drop and belongs in the same
commit as the data. Photographs uploaded later from the admin panel take a
different route and are stored on the uploads volume.

## Example

`example.json` in this directory is a **worked example of the format**, not
catalogue data. Its values are placeholders and it is deliberately not imported
by anything. Copy it, replace every field from the manufacturer's own pages, and
save it as `hp.json`, `lenovo.json` or `acer.json`.
