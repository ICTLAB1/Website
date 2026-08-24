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

Every one of these is a line drawing made for this repository, not a
photograph. That is the point rather than a shortfall: a photograph of a machine
is a photograph of *a* machine, and one placed against forty models is wrong
about thirty-nine of them in a way no caption repairs. A drawing of the chassis
class makes no claim about the model at all.

They carry no maker's mark and no port detail precise enough to identify a
chassis, so none of them can be read as a particular unit.

| File | Form factors it stands in for | Provenance |
|---|---|---|
| `representative-desktop-tower.png` | `DESKTOP_TOWER`, `DESKTOP_WORKSTATION` | Drawn for this repository, 24 August 2026. Original work; no third-party artwork used. |
| `representative-desktop-sff.png` | `DESKTOP_SFF`, `DESKTOP_MINI` | Drawn for this repository, 24 August 2026. Original work; no third-party artwork used. |
| `representative-laptop.png` | `LAPTOP`, `MOBILE_WORKSTATION` | Drawn for this repository, 24 August 2026. Original work; no third-party artwork used. |
| `representative-all-in-one.png` | `ALL_IN_ONE` | Drawn for this repository, 24 August 2026. Original work; no third-party artwork used. |

An earlier version of this table listed a supplied tower photograph as present.
No such file was ever in this directory — the row described an intention. If a
real photograph arrives, it replaces the drawing for that form factor here, or
better, goes on the individual model as `Product.imageUrl`, where it needs no
caveat at all.

### What these do not do

They are not product images for Google. `image` in a page's Product structured
data is only emitted for a real photograph on the model — see the product page —
because `image` asserts "this is a picture of this product", which is exactly
what the notice under these drawings denies. A Merchant Center feed needs real
photographs for the same reason.

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
