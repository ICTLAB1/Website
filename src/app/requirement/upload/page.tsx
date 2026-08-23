import Link from "next/link";
import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { BoqUploadForm } from "@/components/enquiry/boq-upload-form";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Upload your requirement — BOQ and tender schedules",
  description:
    "Send a bill of quantities, tender annexure or requirement list as a file. We read it, confirm what it says, and come back with a written quotation.",
  path: "/requirement/upload",
});

/**
 * For the requirement that already exists as a document.
 *
 * Most public procurement arrives this way — a schedule in a tender pack, an
 * annexure, a spreadsheet from a department — and re-typing it into a web form
 * is work nobody should be asked to do twice.
 */
export default async function RequirementUploadPage() {
  const user = await getSessionUser();

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
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Tell us what you need", href: "/requirement" },
          { label: "Upload a file" },
        ]}
      />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Upload your requirement</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Send the bill of quantities, tender schedule or requirement list you already have. We
          will read it, come back to you about anything that is ambiguous, and quote against what
          you actually asked for.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Would rather type it?{" "}
          <Link href="/requirement" className="text-accent-700 underline underline-offset-2">
            Describe the requirement instead
          </Link>
          .
        </p>
      </header>

      <div className="max-w-3xl">
        <BoqUploadForm
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
