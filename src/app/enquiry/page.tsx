import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EnquiryBasket } from "@/components/enquiry/enquiry-basket";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Enquiry Basket — Request an Enterprise Quote",
  description:
    "Build a multi-brand enquiry and request a single consolidated quotation covering every product, with GST invoicing and one purchase order.",
  path: "/enquiry",
  // Transactional page: useful to visitors, not to a search index.
  noIndex: true,
});

export default async function EnquiryPage() {
  const user = await getSessionUser();

  // Prefill from the signed-in account only. Nothing here is trusted on submit;
  // the server revalidates every field.
  const company = user?.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { name: true },
      })
    : null;

  const profile = user
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } })
    : null;

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Enquiry" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Your enquiry</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Add products from any brand to a single enquiry. We return one consolidated,
          itemised quotation covering all of them — which becomes one purchase order and one
          GST invoice.
        </p>
      </header>

      <EnquiryBasket
        prefill={{
          contactName: user?.name ?? "",
          contactEmail: user?.email ?? "",
          companyName: company?.name ?? user?.companyName ?? "",
          phone: profile?.phone ?? "",
        }}
      />
    </div>
  );
}
