import type { ContentMigration } from "./types";

/**
 * The replacement for the article the migration threw away.
 *
 * `/post/what-is-a-digital-license` carried 1,866 impressions a quarter and
 * sits at position 7.7 for "digital license". It has been answering 410 Gone —
 * a request to delete the URL — since the rebuild, and nothing on this site
 * covers the subject, so there was nowhere honest to send it.
 *
 * A redirect to `/blog` would have been the easy answer and the wrong one: an
 * index that does not mention digital licensing answers a different question
 * from the one asked, and that is the soft-404 pattern the product catch-all
 * was removed for. So the article exists, and the redirect points at it.
 *
 * ## What is in it
 *
 * General licensing knowledge, and nothing about this company's terms, prices,
 * partner status or entitlements. Everything specific to a publisher is stated
 * as something to check with that publisher, because it varies by programme and
 * by agreement and this file is not where it should be pinned down.
 *
 * British spelling throughout, as the rest of the site. The American spelling
 * appears once, in the sentence that says the two mean the same thing — which
 * is worth writing anyway for a reader who searched for it.
 */
const SLUG = "what-is-a-digital-licence";

const BODY = `A digital licence is permission to use software, recorded and delivered
electronically rather than printed on a certificate or tied to a disc. Buying one gets you an
entitlement — a right to run the software under stated conditions — and the means to activate it.

It is the same thing as a "digital license"; the spelling differs, the entitlement does not.

## What you actually receive

Three things, and it is worth knowing which is which:

- **The entitlement.** The right to use the software, held against your organisation in the
  publisher's records. This is the part that matters.
- **The activation mechanism.** A product key, a sign-in, or an assignment to a user account,
  depending on the publisher and the programme.
- **Proof of purchase.** Your invoice, and the record in the publisher's own portal.

A licence is not the download. The installer is freely available for most software; what you buy
is permission to run it.

## Perpetual, subscription and the difference that matters

A perpetual licence is bought once and does not expire. A subscription licence runs for a term —
usually a month or a year — and stops when it stops being paid for.

The practical difference is not price, it is what happens when you stop paying. A perpetual
licence keeps working at the version you bought; a subscription does not keep working at all.
Whether that risk is worth the lower entry cost depends on how long you will use the software and
whether you would have upgraded anyway.

## Assigned to a person or to a device

Publishers have moved steadily towards named-user licensing, where an entitlement is assigned to
one person and follows them across the machines they use. Device licensing, where the entitlement
belongs to a computer and anyone using it is covered, still exists in some programmes.

Which one you have determines the question you have to answer at audit: how many people use this,
or how many machines is it installed on. Those give very different numbers in an organisation with
shift work or shared workstations.

## Why the paperwork is the product

A digital licence has nothing physical to point at, so the records are the asset. Keep the invoice,
keep the account the entitlement was assigned to, and keep them somewhere that survives the person
who bought it leaving.

Two things follow from that:

- **Transfers are not automatic.** Whether an entitlement can move to another organisation, or
  between named users, is set by the publisher's terms for that programme. Check before you assume.
- **A key found online is not a licence.** Marketplaces sell keys that activate and are not
  entitlements — often volume or OEM keys sold outside their terms. They activate today and fail an
  audit, and the buyer carries that, not the seller.

## What to check before you buy

- Which programme the licence is being sold under, and whether that programme permits sale to you.
- Whether the term is perpetual or subscription, and what the renewal price is rather than the
  first-year price.
- Whether it is assigned to a user or a device.
- What you receive as proof, and whether the entitlement appears in your own publisher portal
  afterwards.

The last one is the useful test. An entitlement you can see in your own tenant or account is one
you demonstrably hold. Anything else is somebody's assurance that you do.`;

export const digitalLicenceArticle: ContentMigration = {
  id: "2026-08-digital-licence-article",
  describe: "the digital-licensing article the retired post now redirects to",

  async apply(prisma) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug: SLUG },
      select: { id: true },
    });

    // Written once. An edit made since is somebody's, and a re-run of this
    // must not quietly replace it.
    if (existing) return "the digital-licensing article is already present";

    await prisma.blogPost.create({
      data: {
        slug: SLUG,
        title: "What is a digital licence?",
        excerpt:
          "What you actually buy when software arrives as an entitlement rather than a disc, and the four things worth checking before you do.",
        body: BODY,
        category: "Licensing",
        tags: ["licensing", "digital licence", "entitlements", "compliance"],
        status: "PUBLISHED",
        readMinutes: 5,
        publishedAt: new Date(),
      },
    });

    return `published /blog/${SLUG}, which /post/what-is-a-digital-license now redirects to`;
  },
};
