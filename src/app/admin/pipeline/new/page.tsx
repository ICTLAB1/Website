import Link from "next/link";
import type { Metadata } from "next";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { createDealAction } from "@/app/admin/crm-actions";
import { requireStaff } from "@/lib/auth/guards";
import { dealOwners } from "@/lib/queries/crm";
import { prisma } from "@/lib/db";
import { DEAL_SOURCES, DEAL_SOURCE_LABELS } from "@/lib/crm/pipeline";

export const metadata: Metadata = { title: "New deal" };

/**
 * Starting a deal from nothing.
 *
 * The form asks for as little as it can. A deal logged badly is worth far more
 * than a deal not logged, and every required field is a reason to close the tab
 * and mean to come back — which nobody does. So: a title, and either an
 * existing customer or the organisation's name as it was given on the phone.
 * Everything else can be filled in on the deal itself.
 *
 * A deal raised from an enquiry does not come through here — see the button on
 * the enquiry, which copies what the customer already told us rather than
 * asking somebody to retype it.
 */
export default async function AdminNewDealPage() {
  const staff = await requireStaff();

  const [owners, companies] = await Promise.all([
    dealOwners(),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <Link href="/admin/pipeline" className="text-[13px] text-accent-700 hover:underline">
          &larr; Pipeline
        </Link>
        <h1 className="mt-2 text-2xl">New deal</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          A piece of business being pursued. It does not need to have come from an enquiry — a
          call, a renewal or somebody you approached all belong here.
        </p>
      </header>

      <AdminForm action={createDealAction} submitLabel="Create deal" pendingLabel="Creating…">
        <Field
          label="Title"
          name="title"
          hint="What it is, in a few words: “Fifty EliteBooks for the Pune office”."
          required
        >
          <Input name="title" maxLength={160} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Existing customer"
            name="companyId"
            hint="Leave blank if they are not on the system yet."
          >
            <Select name="companyId" defaultValue="">
              <option value="">Not an existing customer</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Organisation name"
            name="companyName"
            hint="Needed if they are not an existing customer."
          >
            <Input name="companyName" maxLength={160} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact" name="contactName">
            <Input name="contactName" maxLength={120} />
          </Field>
          <Field label="Email" name="contactEmail">
            <Input name="contactEmail" type="email" maxLength={160} />
          </Field>
          <Field label="Phone" name="contactPhone">
            <Input name="contactPhone" maxLength={40} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner" name="ownerId" hint="Defaults to you. A deal with no owner is nobody's job.">
            <Select name="ownerId" defaultValue={staff.id}>
              <option value="">Nobody</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name ?? owner.email}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="How it came in" name="source">
            <Select name="source" defaultValue="DIRECT">
              {DEAL_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {DEAL_SOURCE_LABELS[source]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Expected value (₹)"
            name="expectedValue"
            hint="A forecast, never shown to the customer. A rough figure now beats an exact one later."
          >
            <Input name="expectedValue" inputMode="decimal" />
          </Field>
          <Field label="Expected close" name="expectedCloseOn">
            <Input name="expectedCloseOn" type="date" />
          </Field>
        </div>

        <Field label="Notes" name="notes">
          <Textarea name="notes" rows={4} maxLength={4000} />
        </Field>
      </AdminForm>
    </div>
  );
}
