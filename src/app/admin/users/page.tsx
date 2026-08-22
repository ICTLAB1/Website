import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/admin/admin-form";
import { DangerZone } from "@/components/admin/danger-zone";
import { DeletedNotice } from "@/components/admin/deleted-notice";
import { Field, Input, Select } from "@/components/ui/form";
import { updateUserRole } from "@/app/admin/actions";
import { createUser, resendInvite } from "@/app/admin/user-actions";
import { DELETABLE } from "@/lib/admin/deletable";
import { requireAdmin } from "@/lib/auth/guards";
import { listAdminUsers } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Staff users" };

type PageProps = { searchParams: Promise<{ deleted?: string }> };

const ROLES = [
  { value: "SALES", label: "Salesperson — own leads, customers and quotations" },
  { value: "SALES_MANAGER", label: "Sales manager — the sales team, quotations and reporting" },
  { value: "DIRECTOR", label: "Director — management, approvals and margin" },
  { value: "PROCUREMENT", label: "Procurement — the catalogue and supplier orders" },
  { value: "OPERATIONS", label: "Operations — orders, fulfilment and delivery" },
  { value: "ACCOUNTS", label: "Accounts — invoices, payments and reporting" },
  { value: "SUPPORT", label: "Support — tickets and the customers who raise them" },
  { value: "ADMIN", label: "Administrator — full access, including settings" },
  { value: "CUSTOMER", label: "Customer — no admin access" },
];

/**
 * Restricted to ADMIN. requireAdmin() redirects a SALES user away before any
 * data is read, and every action re-checks the role independently — the page
 * guard and the action guards are separate on purpose.
 */
export default async function AdminUsersPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const [users, params] = await Promise.all([listAdminUsers(), searchParams]);

  const others = users.filter((user) => user.id !== admin.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Staff users</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Accounts with access to this administration area. Changing a role revokes that
          user&rsquo;s existing sessions immediately, so the change takes effect without waiting
          for them to sign in again.
        </p>
      </header>

      <DeletedNotice reference={params.deleted} noun="staff user" />

      <TableWrap>
        <Table className="min-w-[44rem]">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Signed in yet</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td className="font-medium text-graphite-900">
                  {user.name}
                  {user.id === admin.id ? (
                    <span className="ml-2 align-middle">
                      <Badge tone="accent">You</Badge>
                    </span>
                  ) : null}
                </Td>
                <Td className="text-[13px]">{user.email}</Td>
                <Td>
                  <Badge tone={user.role === "ADMIN" ? "brand" : "neutral"}>{user.role}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-[13px]">
                  {/*
                    * "Never" here usually means an invitation that has not been
                    * acted on, which is the one thing an administrator wants to
                    * see on this screen and could not before.
                    */}
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Not yet"}
                </Td>
                <Td className="whitespace-nowrap text-[13px]">{formatDate(user.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-graphite-900">Add a user</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            You never set their password. They are emailed a link to choose their own, which
            expires in three days and also confirms their address. Until they use it the account
            cannot be signed in to.
          </p>
          <div className="mt-5">
            <AdminForm action={createUser} submitLabel="Create and invite" pendingLabel="Creating…">
              <Field name="name" label="Full name" required>
                <Input name="name" autoComplete="off" maxLength={120} />
              </Field>
              <Field name="email" label="Email address" required>
                <Input name="email" type="email" autoComplete="off" maxLength={254} />
              </Field>
              <Field name="phone" label="Phone">
                <Input name="phone" type="tel" autoComplete="off" maxLength={32} />
              </Field>
              <Field name="role" label="Role" required>
                <Select name="role" defaultValue="SALES" required>
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </AdminForm>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">
              Change a user&rsquo;s role
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              You cannot change your own role, and the last remaining administrator cannot be
              demoted.
            </p>
            <div className="mt-5">
              <AdminForm action={updateUserRole} submitLabel="Update role" pendingLabel="Updating…">
                <Field name="userId" label="User" required>
                  <Select name="userId" required>
                    <option value="">Choose a user</option>
                    {others.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field name="role" label="New role" required>
                  <Select name="role" defaultValue="SALES" required>
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </AdminForm>
            </div>
          </section>

          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">Send a new set-up link</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              For somebody who never received their invitation, or who is locked out. Any earlier
              link stops working.
            </p>
            <div className="mt-5">
              <AdminForm action={resendInvite} submitLabel="Send link" pendingLabel="Sending…">
                <Field name="userId" label="User" required>
                  <Select name="userId" required>
                    <option value="">Choose a user</option>
                    {others.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </Select>
                </Field>
              </AdminForm>
            </div>
          </section>
        </div>
      </div>

      {others.length > 0 ? (
        <section>
          <h2 className="text-[15px] font-semibold text-graphite-900">Remove a user</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-600">
            Archiving revokes their access immediately and keeps their name on everything they
            worked on. Your own account is not listed, and the last administrator cannot be
            removed.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {others.map((user) => (
              <details
                key={user.id}
                className="rounded-[--radius-lg] border border-line bg-white p-5"
              >
                <summary className="cursor-pointer text-[14px] font-medium text-graphite-900">
                  {user.name} — {user.email}
                </summary>
                <DangerZone
                  config={DELETABLE.users}
                  id={user.id}
                  reference={user.email}
                  className="mt-4 rounded-[--radius-md] border border-danger-600/30 bg-danger-50/40 p-4"
                />
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
