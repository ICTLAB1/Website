import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CompanyForm } from "@/components/admin/company-form";
import { CompanyAddressForm } from "@/components/admin/company-address-form";
import { CompanyContactForm } from "@/components/admin/company-contact-form";
import { AdminForm } from "@/components/admin/admin-form";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { deleteCompanyAddress, deleteCompanyContact } from "@/app/admin/organisation-actions";
import { requireCapability } from "@/lib/auth/guards";
import { can, COMPANY_ROLE_LABELS } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db";
import { formatDate, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Organisation" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminOrganisationDetailPage({ params }: PageProps) {
  const staff = await requireCapability("customers.read");
  const mayWrite = can(staff, "customers.write");
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      pan: true,
      gstin: true,
      website: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postcode: true,
      country: true,
      employeeCount: true,
      createdAt: true,
      accountManager: { select: { name: true } },
      users: {
        where: { deletedAt: null },
        orderBy: { companyRole: "asc" },
        select: { id: true, name: true, email: true, companyRole: true },
      },
      addresses: { where: { deletedAt: null }, orderBy: [{ kind: "asc" }, { label: "asc" }] },
      contacts: { orderBy: [{ kind: "asc" }, { name: "asc" }] },
      _count: { select: { enquiries: true, quotes: true, orders: true, licences: true, devices: true } },
    },
  });
  if (!company) notFound();

  return (
    <div className="space-y-10">
      <header>
        <Link href="/admin/organisations" className="text-[13px] text-accent-700 hover:underline">
          &larr; Organisations
        </Link>
        <h1 className="mt-2 text-2xl">{company.name}</h1>
        <p className="mt-1.5 text-[13px] text-ink-500">
          Since {formatDate(company.createdAt)} &middot; Account manager:{" "}
          {company.accountManager?.name ?? "Nobody"}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-600">
          <span>{company._count.enquiries} enquiries</span>
          <span>{company._count.quotes} quotes</span>
          <span>{company._count.orders} orders</span>
          <span>{company._count.licences} licences</span>
          <span>{company._count.devices} devices</span>
        </p>
      </header>

      {company.users.length > 0 ? (
        <section>
          <h2 className="mb-4 text-[1.15rem]">People</h2>
          <ul className="flex flex-wrap gap-2">
            {company.users.map((person) => (
              <li
                key={person.id}
                className="rounded-[--radius-md] border border-line bg-white px-3 py-1.5 text-[13px]"
              >
                <span className="text-graphite-900">{person.name}</span>{" "}
                <span className="text-ink-500">{person.email}</span>{" "}
                <Badge tone={person.companyRole === "ADMIN" ? "brand" : "neutral"}>
                  {COMPANY_ROLE_LABELS[person.companyRole]}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-5 text-[1.15rem]">Organisation details</h2>
        {mayWrite ? (
          <CompanyForm company={company} />
        ) : (
          <p className="text-[13px] text-ink-500">Your role does not include changing this.</p>
        )}
      </section>

      <section>
        <h2 className="mb-5 text-[1.15rem]">Addresses</h2>

        {company.addresses.length === 0 ? (
          <p className="mb-6 rounded-[--radius-lg] border border-dashed border-line-strong bg-white px-5 py-6 text-[13px] text-ink-500">
            No addresses on file beyond the registered one above.
          </p>
        ) : (
          <TableWrap className="mb-8">
            <Table className="min-w-[44rem]">
              <thead>
                <tr>
                  <Th>Label</Th>
                  <Th>Used for</Th>
                  <Th>Address</Th>
                  <Th>Preferred</Th>
                </tr>
              </thead>
              <tbody>
                {company.addresses.map((address) => (
                  <Tr key={address.id}>
                    <Td className="text-[13px] font-medium text-graphite-900">{address.label}</Td>
                    <Td className="text-[13px]">{humanise(address.kind)}</Td>
                    <Td className="text-[13px] text-ink-600">
                      {[address.line1, address.line2, address.city, address.state, address.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </Td>
                    <Td>{address.isDefault ? <Badge tone="accent">Preferred</Badge> : null}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        {mayWrite ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {company.addresses.map((address) => (
              <details key={address.id} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <summary className="cursor-pointer text-[14px] font-medium text-graphite-900">
                  Edit {address.label}
                </summary>
                <div className="mt-5 space-y-4">
                  <CompanyAddressForm companyId={company.id} address={address} />
                  <AdminForm
                    action={deleteCompanyAddress}
                    submitLabel="Remove this address"
                    pendingLabel="Removing…"
                    variant="danger"
                    hidden={{ companyId: company.id, addressId: address.id }}
                  />
                </div>
              </details>
            ))}

            <div className="rounded-[--radius-lg] border border-line bg-white p-5">
              <h3 className="mb-5 text-[14px] font-medium text-graphite-900">Add an address</h3>
              <CompanyAddressForm companyId={company.id} />
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-5 text-[1.15rem]">Named contacts</h2>

        {company.contacts.length === 0 ? (
          <p className="mb-6 rounded-[--radius-lg] border border-dashed border-line-strong bg-white px-5 py-6 text-[13px] text-ink-500">
            No named contacts on file.
          </p>
        ) : (
          <TableWrap className="mb-8">
            <Table className="min-w-[40rem]">
              <thead>
                <tr>
                  <Th>Role</Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                </tr>
              </thead>
              <tbody>
                {company.contacts.map((contact) => (
                  <Tr key={contact.id}>
                    <Td className="text-[13px]">{humanise(contact.kind)}</Td>
                    <Td className="text-[13px] font-medium text-graphite-900">{contact.name}</Td>
                    <Td className="text-[13px] text-ink-600">{contact.email}</Td>
                    <Td className="text-[13px] text-ink-600">{contact.phone ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        {mayWrite ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {company.contacts.map((contact) => (
              <details key={contact.id} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <summary className="cursor-pointer text-[14px] font-medium text-graphite-900">
                  Edit {contact.name}
                </summary>
                <div className="mt-5 space-y-4">
                  <CompanyContactForm companyId={company.id} contact={contact} />
                  <AdminForm
                    action={deleteCompanyContact}
                    submitLabel="Remove this contact"
                    pendingLabel="Removing…"
                    variant="danger"
                    hidden={{ companyId: company.id, contactId: contact.id }}
                  />
                </div>
              </details>
            ))}

            <div className="rounded-[--radius-lg] border border-line bg-white p-5">
              <h3 className="mb-5 text-[14px] font-medium text-graphite-900">Add a contact</h3>
              <CompanyContactForm companyId={company.id} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
