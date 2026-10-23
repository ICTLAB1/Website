import { MARGIN_PERCENT, sellingPriceMinor } from "./margin";
import type { ContentMigration } from "./types";

/**
 * The hardware and remaining software, priced from the distributor cost list.
 *
 * The business filled in the sheet this audit asked for — 183 SKUs across the
 * products that had no price anywhere in the database — and filled in a column
 * the sheet did not have: DTP, the distributor transfer price. That is a cost,
 * not a list price, so the figure published is the cost plus the same
 * `MARGIN_PERCENT` the three publisher lists use.
 *
 * ## It is the same percentage on a different base, and that is deliberate
 *
 * 25% on a publisher's list price and 25% on a distributor's cost are not the
 * same economics — a list price already stands above cost — so this was put to
 * the business rather than assumed. They chose cost plus 25% for these.
 *
 * ## Two rows are not loaded
 *
 * `ADSK-3DSMAX-1Y` and `ADSK-ACC-DOCS-1Y` came back as "113000+" and
 * "162000+". A figure with a plus on it is a floor rather than a price, and
 * publishing a floor as a price is the thing this whole exercise exists to
 * avoid. 3ds Max is already priced from the Autodesk list and is unaffected;
 * Autodesk Construction Cloud stays quoted until an exact figure arrives.
 *
 * ## The ESP column is not read
 *
 * Five cells carry something. Four of them are "Month" or "annual" — term
 * labels typed into a price column — and the fifth computes the flat ₹5,000
 * margin that the percentage replaced. Reading any of them would publish
 * either a word or a superseded rule, so the column is ignored and the DTP is
 * the only input.
 *
 * ## Matched on SKU
 *
 * Every row is matched on the SKU the sheet carried out and back. One did not
 * come back unchanged — the Adobe Creative Cloud for Enterprise row returned
 * Adobe's own part number `65325060CA01A12` in place of `ADB-CC-ENT` — so it
 * finds nothing and is reported rather than guessed at. That part number is
 * worth having on the record, but as `partNumber`, which is a different
 * column and a different change.
 */

/**
 * The row whose SKU did not come back.
 *
 * Adobe Creative Cloud for Enterprise returned Adobe's own part number
 * `65325060CA01A12` where `ADB-CC-ENT` went out, so it matches nothing. The
 * product is unambiguous — the sheet names it in the row — so it is priced
 * here by slug instead of being left as the only quoted Adobe product for the
 * sake of an edited cell.
 *
 * The part number is kept as well. It is the manufacturer's identifier, which
 * is the column `partNumber` exists for and which 84 of 88 products were
 * missing when this audit started.
 */
const BY_SLUG: Array<{ slug: string; sku: string; dtpRupees: number; partNumber: string }> = [
  {
    slug: "adobe-creative-cloud-enterprise",
    sku: "ADB-CC-ENT",
    dtpRupees: 153_293,
    partNumber: "65325060CA01A12",
  },
];

/** `[sku, distributor transfer price in rupees]`, as supplied. */
const COSTS: Array<[string, number]> = [
  ["3Y1P2PA", 48522],  // HP Pro 400 G7 Small Form Factor
  ["52J89AV", 139520],  // HP Pro 400 G9 Microtower
  ["55G76PA", 37582],  // HP Pro 400 G7 Microtower
  ["65325060CA01A12", 153293],  // Adobe Creative Cloud for Enterprise
  ["6X9Z3PA", 42589],  // HP Pro 400 G7 Small Form Factor
  ["780A4PA", 78580],  // HP ProOne 440 G9 All-in-One
  ["7B9T6PA", 139852],  // HP Pro Small Form Factor 280 G9
  ["7E951AV", 155356],  // HP Pro 400 G9 Microtower
  ["7E953AV", 150025],  // HP Pro 400 G9 Microtower
  ["7K1H4PA", 38652],  // HP Pro 285 G8 Microtower
  ["7K659PA", 156452],  // HP Pro 400 G9 Microtower
  ["7N5L7PA", 158230],  // HP Pro 400 G9 Microtower
  ["7P9E7PA", 155965],  // HP Pro 400 G9 Small Form Factor
  ["8X3U9AV", 142580],  // HP Pro Tower 280 G9
  ["A1VZ2PT", 88522],  // HP Z1 G9 Tower Workstation
  ["A1ZX9PT", 185620],  // HP Z2 G9 Tower Workstation
  ["A20BQPT", 182564],  // HP Z2 G9 Tower Workstation
  ["A44X4PA", 140200],  // HP Pro Tower 280 G9
  ["B1UM7PT", 149562],  // HP Pro 400 G9 Microtower
  ["B1WW6PT", 140250],  // HP Pro Tower 280 G9
  ["B3WH0PT", 160252],  // HP Pro 400 G9 Microtower
  ["B3WH8PT", 165263],  // HP Pro 400 G9 Microtower
  ["B4SF3PT", 142587],  // HP Pro Tower 280 G9
  ["B59PRPT", 156895],  // HP Pro 400 G9 Small Form Factor
  ["B5SL4PT", 145275],  // HP Pro Tower 280 G9
  ["B6BP4AT", 139548],  // HP Pro Tower 280 G9
  ["B6BV6PT", 37852],  // HP Pro 285 G8 Microtower
  ["B6CP9PT", 39857],  // HP Pro 285 G8 Microtower
  ["B6QN9PT", 175525],  // HP Pro 400 G9 Microtower
  ["BC5W4AT", 158521],  // HP Pro Tower 280 G9
  ["BC5Y0AT", 146385],  // HP Pro Tower 280 G9
  ["BC5Y2AT", 178520],  // HP Pro Tower 280 G9
  ["BC5Y3AT", 182505],  // HP Pro Tower 280 G9
  ["BF0N8AT", 79852],  // HP ProOne 440 G9 All-in-One
  ["BG1D0PT", 180365],  // HP Z2 G9 Tower Workstation
  ["BG1D1PT", 178542],  // HP Z2 G9 Tower Workstation
  ["BK9U2PT", 157865],  // HP Pro 400 G9 Small Form Factor
  ["BN0S4PT", 78952],  // HP ProDesk 2 Small Form Factor G1i
  ["BN0S7PT", 98520],  // HP ProDesk 2 Small Form Factor G1i
  ["C1PT8PT", 115230],  // HP Z2 G1i Tower Workstation
  ["C1UH1AT", 158522],  // HP Pro 400 G9 Microtower
  ["C2FK3AT", 85242],  // HP ProOne 440 G9 All-in-One
  ["C2FL4AT", 83562],  // HP ProOne 440 G9 All-in-One
  ["CB1N9AT", 148752],  // HP Pro 400 G9 Microtower
  ["CC9H8PA", 124555],  // HP Z2 G1i Tower Workstation
  ["CC9N5PA", 124689],  // HP Z2 G1i Tower Workstation
  ["CD3A1PA", 125897],  // HP Z2 G1i Tower Workstation
  ["CD3A2PA", 135658],  // HP Z2 G1i Tower Workstation
  ["CD3A3PA", 136024],  // HP Z2 G1i Tower Workstation
  ["CD3A5PA", 130253],  // HP Z2 G1i Tower Workstation
  ["CD3A8PA", 129586],  // HP Z2 G1i Tower Workstation
  ["CD3B0PA", 135658],  // HP Z2 G1i Tower Workstation
  ["CD3B4PA", 136024],  // HP Z2 G1i Tower Workstation
  ["CD3B6PA", 130253],  // HP Z2 G1i Tower Workstation
  ["CF4Z4PA", 129586],  // HP Z2 G1i Tower Workstation
  ["CF5A1PA", 128546],  // HP Z2 G1i Tower Workstation
  ["CN8M7AT", 82562],  // HP ProOne 440 G9 All-in-One
  ["D10LVAT", 79852],  // HP ProOne 440 G9 All-in-One
  ["D10LYAT", 85246],  // HP ProOne 440 G9 All-in-One
  ["D1VT8AT", 138520],  // HP Pro Tower 2 G1a
  ["D2FX3PA", 98520],  // HP Z1 G1i Tower Workstation
  ["D2FX9PA", 99582],  // HP Z1 G1i Tower Workstation
  ["D30A8PA", 97522],  // HP Z1 G1i Tower Workstation
  ["D3MV6PA", 94235],  // HP Z1 G1i Tower Workstation
  ["D42SKPA", 195620],  // HP Z2 G9 Tower Workstation
  ["D52Q6PA", 92568],  // HP Z1 G1i Tower Workstation
  ["D52VDPA", 127568],  // HP Z2 G1i Tower Workstation
  ["D52VQPA", 136254],  // HP Z2 G1i Tower Workstation
  ["D52Y7PA", 135658],  // HP Z2 G1i Tower Workstation
  ["D52ZXPA", 136024],  // HP Z2 G1i Tower Workstation
  ["D52ZYPA", 130253],  // HP Z2 G1i Tower Workstation
  ["D53A0PA", 129586],  // HP Z2 G1i Tower Workstation
  ["D53A1PA", 128546],  // HP Z2 G1i Tower Workstation
  ["D53J8PA", 127568],  // HP Z2 G1i Tower Workstation
  ["D53JCPA", 136254],  // HP Z2 G1i Tower Workstation
  ["D53JGPA", 135245],  // HP Z2 G1i Tower Workstation
  ["D53JHPA", 134568],  // HP Z2 G1i Tower Workstation
  ["D88Z0PA", 134586],  // HP Z2 G1i Tower Workstation
  ["D88Z1PA", 95266],  // HP Z1 G1i Tower Workstation
  ["DELL-PRECISION-CFG", 152600],  // Dell Precision Workstation
  ["DELL-PWRSTORE-CFG", 356200],  // Dell PowerStore Storage
  ["HPE-ARUBA-SW-CFG", 58200],  // HPE Aruba Networking Switch
  ["HPE-MSA-CFG", 17520],  // HPE MSA Storage Array
  ["MS-AZ-CSP-CONSUMP", 2800],  // Microsoft Azure Consumption
  ["MS-ONEDRIVE-P2-A1", 8850],  // Microsoft OneDrive for Business Plan 2
  ["MS-VISIO-P1-A1", 4800],  // Microsoft Visio Plan 1
  ["MS-VISIO-P2-A1", 12500],  // Microsoft Visio Plan 2
  ["MS-VS-ENT-A1", 378522],  // Visual Studio Enterprise
  ["dell-poweredge-r260-c1", 262000],  // Dell PowerEdge R260
  ["dell-poweredge-r260-c2", 262250],  // Dell PowerEdge R260
  ["dell-poweredge-r260-c3", 262650],  // Dell PowerEdge R260
  ["dell-poweredge-r260-c4", 262033],  // Dell PowerEdge R260
  ["dell-poweredge-r470-c1", 265800],  // Dell PowerEdge R470
  ["dell-poweredge-r470-c2", 240665],  // Dell PowerEdge R470
  ["dell-poweredge-r470-c3", 278000],  // Dell PowerEdge R470
  ["dell-poweredge-r570-c1", 268952],  // Dell PowerEdge R570
  ["dell-poweredge-r570-c2", 266200],  // Dell PowerEdge R570
  ["dell-poweredge-r570-c3", 249520],  // Dell PowerEdge R570
  ["dell-poweredge-r570-c4", 247850],  // Dell PowerEdge R570
  ["dell-poweredge-r570-c5", 278200],  // Dell PowerEdge R570
  ["dell-poweredge-r570-c6", 278522],  // Dell PowerEdge R570
  ["dell-poweredge-r660xs-c1", 284560],  // Dell PowerEdge R660xs
  ["dell-poweredge-r660xs-c2", 278560],  // Dell PowerEdge R660xs
  ["dell-poweredge-r670-c1", 1352200],  // Dell PowerEdge R670
  ["dell-poweredge-r670-c2", 1354777],  // Dell PowerEdge R670
  ["dell-poweredge-r670-c3", 1245885],  // Dell PowerEdge R670
  ["dell-poweredge-r670-c4", 1245778],  // Dell PowerEdge R670
  ["dell-poweredge-r760-c1", 856220],  // Dell PowerEdge R760
  ["dell-poweredge-r760-c2", 854622],  // Dell PowerEdge R760
  ["dell-poweredge-r760-c3", 862545],  // Dell PowerEdge R760
  ["dell-poweredge-r760-c4", 843250],  // Dell PowerEdge R760
  ["dell-poweredge-r760-c5", 825456],  // Dell PowerEdge R760
  ["dell-poweredge-r760xs-c1", 458701],  // Dell PowerEdge R760xs
  ["dell-poweredge-r760xs-c2", 485210],  // Dell PowerEdge R760xs
  ["dell-poweredge-r760xs-c3", 445856],  // Dell PowerEdge R760xs
  ["dell-poweredge-r760xs-c4", 410025],  // Dell PowerEdge R760xs
  ["dell-poweredge-r760xs-c5", 398522],  // Dell PowerEdge R760xs
  ["dell-poweredge-r770-c1", 1222500],  // Dell PowerEdge R770
  ["dell-poweredge-r770-c2", 1204560],  // Dell PowerEdge R770
  ["dell-poweredge-r770-c3", 1124587],  // Dell PowerEdge R770
  ["dell-poweredge-t160-c1", 165820],  // Dell PowerEdge T160
  ["dell-poweredge-t160-c2", 163252],  // Dell PowerEdge T160
  ["dell-poweredge-t160-c3", 162545],  // Dell PowerEdge T160
  ["dell-poweredge-t160-c4", 160522],  // Dell PowerEdge T160
  ["dell-poweredge-t360-c1", 289365],  // Dell PowerEdge T360
  ["dell-poweredge-t360-c2", 285846],  // Dell PowerEdge T360
  ["dell-poweredge-t560-c1", 389202],  // Dell PowerEdge T560
  ["dell-poweredge-t560-c2", 378520],  // Dell PowerEdge T560
  ["dell-poweredge-t560-c3", 366895],  // Dell PowerEdge T560
  ["dell-poweredge-t560-c4", 375400],  // Dell PowerEdge T560
  ["dell-poweredge-t560-c5", 368542],  // Dell PowerEdge T560
  ["hp-elite-small-form-factor-800-g9-c1", 149852],  // HP Elite Small Form Factor 800 G9
  ["hp-elite-small-form-factor-800-g9-c2", 148542],  // HP Elite Small Form Factor 800 G9
  ["hp-elite-small-form-factor-805-g9-c1", 145632],  // HP Elite Small Form Factor 805 G9
  ["hp-elite-small-form-factor-805-g9-c2", 144562],  // HP Elite Small Form Factor 805 G9
  ["hp-elite-tower-800-g9-c1", 102320],  // HP Elite Tower 800 G9
  ["hp-elite-tower-800-g9-c2", 99852],  // HP Elite Tower 800 G9
  ["hp-elite-tower-800-g9-c3", 99575],  // HP Elite Tower 800 G9
  ["hp-elite-tower-800-g9-c4", 105620],  // HP Elite Tower 800 G9
  ["hp-elite-tower-800-g9-c5", 103525],  // HP Elite Tower 800 G9
  ["hp-elite-tower-800-g9-c6", 104525],  // HP Elite Tower 800 G9
  ["hp-elite-tower-800-g9-c7", 105636],  // HP Elite Tower 800 G9
  ["hp-elite-tower-800-g9-c8", 102245],  // HP Elite Tower 800 G9
  ["hp-pro-400-g9-microtower-c4", 153256],  // HP Pro 400 G9 Microtower
  ["hp-pro-tower-280-g9-c1", 175820],  // HP Pro Tower 280 G9
  ["hp-pro-tower-280-g9-c2", 178542],  // HP Pro Tower 280 G9
  ["hp-pro-tower-280-g9-c3", 189520],  // HP Pro Tower 280 G9
  ["hp-pro-tower-280-g9-c4", 195820],  // HP Pro Tower 280 G9
  ["hp-pro-tower-280-g9-c5", 193562],  // HP Pro Tower 280 G9
  ["hp-z2-g1i-tower-workstation-c13", 129355],  // HP Z2 G1i Tower Workstation
  ["hp-z2-g1i-tower-workstation-c20", 124999],  // HP Z2 G1i Tower Workstation
  ["hp-z2-g1i-tower-workstation-c5", 132156],  // HP Z2 G1i Tower Workstation
  ["hp-z4-g5-tower-workstation-c1", 752100],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c10", 745852],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c11", 768956],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c12", 785224],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c13", 754562],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c14", 745456],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c15", 736000],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c2", 754200],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c3", 782000],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c4", 754600],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c5", 785400],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c6", 769852],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c7", 745800],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c8", 735500],  // HP Z4 G5 Tower Workstation
  ["hp-z4-g5-tower-workstation-c9", 725200],  // HP Z4 G5 Tower Workstation
  ["hp-z8-fury-g5-tower-workstation-c1", 744200],  // HP Z8 Fury G5 Tower Workstation
  ["hp-z8-fury-g5-tower-workstation-c2", 754520],  // HP Z8 Fury G5 Tower Workstation
  ["hp-z8-fury-g5-tower-workstation-c3", 768500],  // HP Z8 Fury G5 Tower Workstation
  ["hp-z8-fury-g5-tower-workstation-c4", 735666],  // HP Z8 Fury G5 Tower Workstation
  ["hp-z8-fury-g5-tower-workstation-c5", 762520],  // HP Z8 Fury G5 Tower Workstation
  ["hp-z8-fury-g5-tower-workstation-c6", 721200],  // HP Z8 Fury G5 Tower Workstation
  ["hpe-proliant-dl360-gen10-c1", 135220],  // HPE ProLiant DL360 Gen10
  ["hpe-proliant-dl360-gen11-c1", 245600],  // HPE ProLiant DL360 Gen11
  ["hpe-proliant-dl380-gen10-plus-c1", 372858],  // HPE ProLiant DL380 Gen10 Plus
  ["hpe-proliant-dl380-gen11-c1", 685920],  // HPE ProLiant DL380 Gen11
  ["hpe-proliant-dl380-gen11-c2", 678552],  // HPE ProLiant DL380 Gen11
  ["hpe-proliant-dl380-gen11-c3", 652000],  // HPE ProLiant DL380 Gen11
  ["hpe-proliant-ml110-gen11-c1", 246200],  // HPE ProLiant ML110 Gen11
  ["hpe-proliant-ml30-gen11-c1", 442000],  // HPE ProLiant ML30 Gen11
];

const PROVENANCE = `Distributor cost list supplied by the business, 23 October 2026 — DTP excluding GST, plus the ${MARGIN_PERCENT}% margin.`;

export const dtpPriceList: ContentMigration = {
  id: "2026-10-dtp-price-list",
  describe: "price the hardware and remaining software from the supplied distributor cost list",

  async apply(prisma) {
    let priced = 0;
    let unchanged = 0;
    const missing: string[] = [];

    for (const [sku, dtpRupees] of COSTS) {
      const variant = await prisma.productVariant.findUnique({
        where: { sku },
        select: { id: true, listPriceMinor: true },
      });

      if (!variant) {
        missing.push(sku);
        continue;
      }

      const listPriceMinor = sellingPriceMinor(dtpRupees);
      if (variant.listPriceMinor === listPriceMinor) {
        unchanged += 1;
        continue;
      }

      await prisma.productVariant.update({
        where: { id: variant.id },
        // `deletedAt: null` restores a variant archived by the annual-only
        // sweep: a configuration the business has just priced is one it
        // intends to sell.
        data: { listPriceMinor, salePriceMinor: null, deletedAt: null },
      });
      await prisma.price.create({
        data: { variantId: variant.id, listPriceMinor, gstRatePercent: 18, note: PROVENANCE },
      });
      priced += 1;
    }

    for (const entry of BY_SLUG) {
      const variant = await prisma.productVariant.findUnique({
        where: { sku: entry.sku },
        select: { id: true, listPriceMinor: true, productId: true },
      });
      if (!variant) {
        missing.push(entry.sku);
        continue;
      }

      const listPriceMinor = sellingPriceMinor(entry.dtpRupees);
      if (variant.listPriceMinor !== listPriceMinor) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { listPriceMinor, salePriceMinor: null, deletedAt: null },
        });
        await prisma.price.create({
          data: { variantId: variant.id, listPriceMinor, gstRatePercent: 18, note: PROVENANCE },
        });
        priced += 1;
      }

      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { partNumber: entry.partNumber },
      });
    }

    const parts = [`priced ${priced} variant${priced === 1 ? "" : "s"} from cost`];
    if (unchanged > 0) parts.push(`${unchanged} already at that figure`);
    if (missing.length > 0) {
      parts.push(`${missing.length} SKU${missing.length === 1 ? "" : "s"} not found (${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", …" : ""})`);
    }
    return parts.join(", ");
  },
};
