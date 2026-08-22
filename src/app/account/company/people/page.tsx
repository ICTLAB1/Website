import type { Metadata } from "next";
import type { CompanyRole } from "@prisma/client";

import { AccountForm } from "@/components/account/account-form";
import { CompanyTabs } from "@/components/account/company-tabs";
import { Badge } from "@/components/ui/badge";
import { Field, Fieldset, Input, Select } from "@/components/ui/form";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { inviteColleague, removeColleague, setColleagueRole } from "@/app/account/company/actions";
import { requireUser } from "@/lib/auth/guards";
import {
  canInCompany,
  COMPANY_ROLE_HINTS,
  COMPANY_ROLE_LABELS,
} from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "People" };

const ROLES: CompanyRole[] = ["ADMIN", "PROCUREMENT", "FINANCE", "IT", "VIEWER"];

/**
 * The colleagues who share an organisation's account.
 *
 * This screen is the answer to the thing that makes most supplier portals
 * useless: one login per company, shared around the department, and no way to
 * tell who accepted what. Everybody gets their own account, everybody sees the
 * organisation's records, and what each of them may *do* is set here.
 */
export default async function CompanyPeoplePage() {
  const session = await requireUser("/account/company/people");

  if (!session.companyId) {
    return (
      <div className="max-w-3xl">
        <h2 className="text-[1.15rem]">People</h2>
        <CompanyTabs />
        <p className="mt-8 rounded-[--radius-lg] border border-line bg-surface-muted px-5 py-4 text-[14px] leading-relaxed text-ink-600">
          Add your company details first. Colleagues belong to a company, so there is nothing to
          add them to yet.
        </p>
      </div>
    );
  }

  const mayManage = canInCompany(session, "people.manage");

  const people = await prisma.user.findMany({
    where: { companyId: session.companyId, deletedAt: null },
    orderBy: [{ companyRole: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      companyRole: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="max-w-4xl">
      <h2 className="text-[1.15rem]">People</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
        Everyone here sees your organisation&rsquo;s enquiries, quotations, orders, licences and
        tickets. What each person may do is set by their access level.
      </p>

      <CompanyTabs />

      <TableWrap className="mt-8">
        <Table>
          <thead>
            <Tr>
              <Th>Name</Th>
              <Th>Access</Th>
              <Th>Status</Th>
              {mayManage ? <Th>Change</Th> : null}
            </Tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <Tr key={person.id}>
                <Td>
                  <span className="font-medium text-graphite-900">{person.name}</span>
                  <span className="block text-label text-ink-500">{person.email}</span>
                  {person.id === session.id ? (
                    <span className="block text-label text-ink-400">This is you</span>
                  ) : null}
                </Td>
                <Td>
                  <Badge tone={person.companyRole === "ADMIN" ? "brand" : "neutral"}>
                    {COMPANY_ROLE_LABELS[person.companyRole]}
                  </Badge>
                </Td>
                <Td className="text-label text-ink-600">
                  {person.emailVerified
                    ? person.lastLoginAt
                      ? `Last signed in ${formatDate(person.lastLoginAt)}`
                      : "Confirmed, not signed in yet"
                    : "Invitation not accepted yet"}
                  <span className="block text-ink-400">Added {formatDate(person.createdAt)}</span>
                </Td>
                {mayManage ? (
                  <Td>
                    {person.id === session.id ? (
                      <span className="text-label text-ink-400">—</span>
                    ) : (
                      <div className="space-y-3">
                        <AccountForm
                          action={setColleagueRole}
                          submitLabel="Update"
                          pendingLabel="Updating…"
                          variant="outline"
                          hidden={{ userId: person.id }}
                          compact
                        >
                          <Field label="Access level" name="companyRole">
                            <Select name="companyRole" defaultValue={person.companyRole}>
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {COMPANY_ROLE_LABELS[role]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </AccountForm>
                        <AccountForm
                          action={removeColleague}
                          submitLabel="Remove access"
                          pendingLabel="Removing…"
                          variant="danger"
                          hidden={{ userId: person.id }}
                          compact
                        />
                      </div>
                    )}
                  </Td>
                ) : null}
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      {mayManage ? (
        <section className="mt-12 max-w-xl rounded-[--radius-lg] border border-line bg-white p-6">
          <h3 className="text-[1.05rem]">Add a colleague</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            They are emailed a link to choose their own password. Nobody here, including you, ever
            sets a password for somebody else.
          </p>

          <div className="mt-6">
            <AccountForm action={inviteColleague} submitLabel="Send invitation" pendingLabel="Sending…">
              <Fieldset legend="Their details">
                <Field label="Full name" name="name" required>
                  <Input name="name" required autoComplete="off" />
                </Field>
                <Field label="Work email" name="email" required>
                  <Input name="email" type="email" required autoComplete="off" />
                </Field>
                <Field label="Phone" name="phone">
                  <Input name="phone" type="tel" autoComplete="off" />
                </Field>
                <Field
                  label="Access level"
                  name="companyRole"
                  required
                  hint={COMPANY_ROLE_HINTS.PROCUREMENT}
                >
                  <Select name="companyRole" defaultValue="PROCUREMENT" required>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {COMPANY_ROLE_LABELS[role]} — {COMPANY_ROLE_HINTS[role]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </Fieldset>
            </AccountForm>
          </div>
        </section>
      ) : (
        <p className="mt-8 rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-600">
          Only a company administrator can add colleagues or change access levels.
        </p>
      )}
    </div>
  );
}
