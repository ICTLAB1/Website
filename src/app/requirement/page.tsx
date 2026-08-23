import Link from "next/link";
import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { RequirementForm } from "@/components/enquiry/requirement-form";
import { REQUIREMENT_LINE_SLOTS } from "@/lib/rfq";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Tell us what you need — technology procurement",
  description:
    "Describe the requirement rather than the products: quantity, specification, timescale and where it is going. We come back with options and a written quotation.",
  path: "/requirement",
});

/**
 * The other way in.
 *
 * The catalogue and the enquiry basket both assume the customer knows what they
 * want. Most procurement does not start there: it starts with a headcount, a
 * refresh cycle or a tender, and the products are the *answer*. This page is
 * where that requirement can be written down, and it produces the same
 * enquiry, the same reference and the same quotation as anything else.
 */
export default async function RequirementPage() {
  const user = await getSessionUser();

  // Prefill from the signed-in account only, and never trusted on submit — the
  // action revalidates every field and takes the organisation from the session.
  const [company, profile] = await Promise.all([
    user?.companyId
      ? prisma.company.findUnique({
          where: { id: user.companyId },
          select: { name: true, gstin: true },
        })
      : null,
    user ? prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }) : null,
  ]);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Tell us what you need" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Tell us what you need</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          You do not need to know the product. Describe the requirement — how many, what it is
          for, roughly what specification, and when you need it — and we will come back with
          options from the brands we supply and a written quotation covering all of them.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Already know the products?{" "}
          <Link href="/products" className="text-accent-700 underline underline-offset-2">
            Browse the catalogue
          </Link>{" "}
          and build an enquiry instead. Have it as a file already?{" "}
          <Link href="/requirement/upload" className="text-accent-700 underline underline-offset-2">
            Upload a bill of quantities
          </Link>
          .
        </p>
      </header>

      <div className="max-w-3xl">
        <RequirementForm
          slots={REQUIREMENT_LINE_SLOTS}
          defaults={{
            contactName: user?.name,
            contactEmail: user?.email,
            contactPhone: profile?.phone ?? undefined,
            companyName: company?.name ?? user?.companyName ?? undefined,
            gstin: company?.gstin ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
