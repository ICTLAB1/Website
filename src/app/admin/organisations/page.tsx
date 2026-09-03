import Link from "next/link";
import type { Metadata } from "next";

import { AdminForm } from "@/components/admin/admin-form";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { setAccountManager } from "@/app/admin/organisation-actions";
import { requireCapability } from "@/lib/auth/guards";
import { can, COMPANY_ROLE_LABELS } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Organisations" };

/**
 * Customers as organisations rather than as individual sign-ins.
 *
 * The customers screen lists people; this one lists the companies they work
 * for, which is the unit everything else is actually about — a quotation is
 * raised for a company, an order ships to a company, a renewal belongs to a
 * company. It is also where a customer relationship gets a name against it.
 */
export default async function AdminOrganisationsPage() {
  const staff = await requireCapability("customers.read");
  const mayAssign = can(staff, "customers.write");

  const [companies, managers] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      take: 200,
      select: {
        id: true,
        name: true,
        gstin: true,
        createdAt: true,
        accountManagerId: true,
        accountManager: { select: { name: true } },
        users: {
          where: { deletedAt: null },
          orderBy: { companyRole: "asc" },
          select: { id: true, name: true, email: true, companyRole: true },
        },
        _count: { select: { enquiries: true, quotes: true, orders: true, licences: true } },
      },
    }),
    /*
     * Who may be an account manager: staff who can see customer records. A
     * name against an account that cannot open it is worse than no name, so
     * the list is filtered by capability rather than by job title.
     */
    prisma.user
      .findMany({
        where: { deletedAt: null, role: { not: "CUSTOMER" } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      })
      .then((rows) => rows.filter((row) => can(row, "customers.read"))),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Organisations</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {companies.length} customer {companies.length === 1 ? "organisation" : "organisations"}.
          Everyone listed under an organisation sees that organisation&rsquo;s records.
        </p>
      </header>

      {companies.length === 0 ? (
        <EmptyState
          title="No organisations yet"
          description="A company record is created the first time a customer saves their company details."
        />
      ) : (
        <TableWrap>
          <Table className="min-w-[56rem]">
            <thead>
              <tr>
                <Th>Organisation</Th>
                <Th>People</Th>
                <Th>Activity</Th>
                <Th>Account manager</Th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <Tr key={company.id}>
                  <Td>
                    <Link
                      href={`/admin/organisations/${company.id}`}
                      className="font-medium text-graphite-900 hover:underline"
                    >
                      {company.name}
                    </Link>
                    <span className="block font-mono text-[12px] text-ink-500">
                      {company.gstin ?? "No GSTIN on file"}
                    </span>
                    <span className="block text-label text-ink-400">
                      Since {formatDate(company.createdAt)}
                    </span>
                  </Td>
                  <Td className="text-[13px]">
                    {company.users.length === 0 ? (
                      <span className="text-ink-400">Nobody</span>
                    ) : (
                      <ul className="space-y-1">
                        {company.users.map((person) => (
                          <li key={person.id}>
                            <span className="text-graphite-900">{person.name}</span>{" "}
                            <Badge tone={person.companyRole === "ADMIN" ? "brand" : "neutral"}>
                              {COMPANY_ROLE_LABELS[person.companyRole]}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] tabular-nums text-ink-600">
                    {company._count.enquiries} enquiries
                    <span className="block">{company._count.quotes} quotes</span>
                    <span className="block">{company._count.orders} orders</span>
                    <span className="block">{company._count.licences} licences</span>
                  </Td>
                  <Td>
                    {mayAssign ? (
                      <AdminForm
                        action={setAccountManager}
                        submitLabel="Assign"
                        pendingLabel="Saving…"
                        variant="outline"
                        hidden={{ companyId: company.id }}
                        compact
                      >
                        <Field label="Account manager" name="accountManagerId">
                          <Select
                            name="accountManagerId"
                            defaultValue={company.accountManagerId ?? ""}
                          >
                            <option value="">Nobody</option>
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </AdminForm>
                    ) : (
                      <span className="text-[13px] text-ink-600">
                        {company.accountManager?.name ?? "Nobody"}
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
