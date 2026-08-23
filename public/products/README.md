# Product artwork

Two different things live here, and confusing them is the failure this file
exists to prevent.

## 1. Photographs of a model

A picture of the actual model listed. Referenced from `Product.imageUrl`, shown
with no caveat, because none is needed. Name it after the model.

## 2. Category illustrations (`representative-*.jpg`)

A generic picture of a *class* of machine, shown when a model has no photograph
of its own. Never referenced from `Product.imageUrl` — the mapping from form
factor to illustration is in `src/lib/representative-image.ts` and is applied at
render time, so a model that later gets a real photograph simply overrides it
with no data change.

Every one of these is rendered with a "Representative image" badge on the
picture and the full disclaimer on the product page. That is not a nicety: it is
the reason showing them is honest. `src/components/catalogue/product-photo.tsx`
resolves the source and draws the badge in the same component precisely so that
no caller can obtain one without the other.

### Present

| File | Form factors it stands in for | Provenance |
|---|---|---|
| `representative-desktop-tower.jpg` | `DESKTOP_TOWER`, `DESKTOP_WORKSTATION` | Supplied by the business, 23 August 2026. Cropped to the subject and resized to 800px wide; not otherwise altered. |

### Wanted

These form factors are in the catalogue and currently show "Photograph to
follow". Each needs one illustration; adding it is a file here plus one line in
`REPRESENTATIVE_IMAGES`.

| Filename to use | Covers | Active models |
|---|---|---|
| `representative-laptop.jpg` | `LAPTOP`, `MOBILE_WORKSTATION` | 0 today — the laptop catalogue is not loaded yet |
| `representative-desktop-sff.jpg` | `DESKTOP_SFF`, `DESKTOP_MINI` | 6 |
| `representative-all-in-one.jpg` | `ALL_IN_ONE` | 1 |

Servers (`TOWER_SERVER`, `RACK_SERVER`, 17 models) are deliberately excluded. A
rack server does not resemble a desktop, and no caption repairs a picture that
is wrong about the goods. They keep the empty frame until real photographs
exist.

## Rules for anything added here

- **Say where it came from.** Add a row to the table above. Artwork whose
  licence nobody can establish cannot stay: these are commercial pages.
- **Do not use a manufacturer's press photograph** unless the business holds
  written permission for it. Reseller media kits usually grant this; assuming it
  is not the same as holding it.
- **Do not use a photograph of one model as the illustration for a category.**
  It reads as that model. The illustrations here are generic units for that
  reason.
- A mapped file that is missing fails `tests/representative-image.test.ts`
  rather than shipping a broken image.
