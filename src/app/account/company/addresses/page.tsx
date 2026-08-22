import type { Metadata } from "next";

import { AccountForm } from "@/components/account/account-form";
import { CompanyTabs } from "@/components/account/company-tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Field, Fieldset, Input, Select } from "@/components/ui/form";
import { deleteAddress, saveAddress } from "@/app/account/company/actions";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Addresses" };

const KINDS = [
  { value: "DELIVERY", label: "Delivery" },
  { value: "BILLING", label: "Billing" },
  { value: "BOTH", label: "Delivery and billing" },
];

type AddressRow = {
  id: string;
  label: string;
  kind: "BILLING" | "DELIVERY" | "BOTH";
  attention: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
  gstin: string | null;
  isDefault: boolean;
};

/** One address form, used both for adding and for editing an existing row. */
function AddressFields({ address, disabled }: { address?: AddressRow; disabled: boolean }) {
  return (
    <Fieldset legend={address ? address.label : "New address"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name this address" name="label" required hint="e.g. Head office, Pune plant">
          <Input name="label" defaultValue={address?.label ?? ""} required disabled={disabled} />
        </Field>
        <Field label="Used for" name="kind" required>
          <Select name="kind" defaultValue={address?.kind ?? "DELIVERY"} required disabled={disabled}>
            {KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="For the attention of" name="attention">
        <Input name="attention" defaultValue={address?.attention ?? ""} disabled={disabled} />
      </Field>
      <Field label="Address line 1" name="line1" required>
        <Input name="line1" defaultValue={address?.line1 ?? ""} required disabled={disabled} />
      </Field>
      <Field label="Address line 2" name="line2">
        <Input name="line2" defaultValue={address?.line2 ?? ""} disabled={disabled} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" name="city" required>
          <Input name="city" defaultValue={address?.city ?? ""} required disabled={disabled} />
        </Field>
        <Field label="State" name="state" required>
          <Input name="state" defaultValue={address?.state ?? ""} required disabled={disabled} />
        </Field>
        <Field label="PIN code" name="postcode" required>
          <Input name="postcode" defaultValue={address?.postcode ?? ""} required disabled={disabled} />
        </Field>
        <Field label="Country" name="country" required>
          <Input
            name="country"
            defaultValue={address?.country ?? "India"}
            required
            disabled={disabled}
          />
        </Field>
      </div>
      <Field
        label="GSTIN for this place of business"
        name="gstin"
        hint="Only where it differs from your registered GSTIN."
      >
        <Input
          name="gstin"
          maxLength={15}
          className="uppercase"
          defaultValue={address?.gstin ?? ""}
          disabled={disabled}
        />
      </Field>
      <Checkbox
        name="isDefault"
        label="Use this by default"
        defaultChecked={address?.isDefault ?? false}
        disabled={disabled}
      />
    </Fieldset>
  );
}

/**
 * Where an organisation wants things sent.
 *
 * A list rather than a field, because an organisation ordering forty laptops
 * routinely ships them to four sites, and a single address on the company
 * record turns that into four phone calls.
 */
export default async function CompanyAddressesPage() {
  const session = await requireUser("/account/company/addresses");

  if (!session.companyId) {
    return (
      <div className="max-w-3xl">
        <h2 className="text-[1.15rem]">Addresses</h2>
        <CompanyTabs />
        <p className="mt-8 rounded-[--radius-lg] border border-line bg-surface-muted px-5 py-4 text-[14px] leading-relaxed text-ink-600">
          Add your company details first. Addresses belong to a company.
        </p>
      </div>
    );
  }

  const mayEdit = canInCompany(session, "company.manage");
  const addresses = (await prisma.companyAddress.findMany({
    where: { companyId: session.companyId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    select: {
      id: true,
      label: true,
      kind: true,
      attention: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      postcode: true,
      country: true,
      gstin: true,
      isDefault: true,
    },
  })) as AddressRow[];

  return (
    <div className="max-w-3xl">
      <h2 className="text-[1.15rem]">Addresses</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
        Delivery and billing addresses for your organisation. Your registered address stays on the
        company details page — it is the one that goes on the tax invoice.
      </p>

      <CompanyTabs />

      {addresses.length === 0 ? (
        <p className="mt-8 text-[14px] text-ink-600">No addresses added yet.</p>
      ) : (
        <ul className="mt-8 space-y-5">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-[--radius-lg] border border-line bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="text-body font-semibold text-graphite-900">{address.label}</span>
                <Badge tone="neutral">
                  {KINDS.find((kind) => kind.value === address.kind)?.label ?? address.kind}
                </Badge>
                {address.isDefault ? <Badge tone="brand">Default</Badge> : null}
              </div>

              <AccountForm
                action={saveAddress}
                submitLabel="Save changes"
                pendingLabel="Saving…"
                variant="outline"
                hidden={{ id: address.id }}
                compact
              >
                <AddressFields address={address} disabled={!mayEdit} />
              </AccountForm>

              {mayEdit ? (
                <div className="mt-4 border-t border-line pt-4">
                  <AccountForm
                    action={deleteAddress}
                    submitLabel="Remove this address"
                    pendingLabel="Removing…"
                    variant="danger"
                    hidden={{ id: address.id }}
                    compact
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {mayEdit ? (
        <section className="mt-12 rounded-[--radius-lg] border border-line bg-white p-6">
          <h3 className="text-[1.05rem]">Add an address</h3>
          <div className="mt-6">
            <AccountForm action={saveAddress} submitLabel="Add address" pendingLabel="Adding…">
              <AddressFields disabled={false} />
            </AccountForm>
          </div>
        </section>
      ) : (
        <p className="mt-8 rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-600">
          Only a company administrator can add or change addresses.
        </p>
      )}
    </div>
  );
}
