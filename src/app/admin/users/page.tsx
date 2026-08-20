import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/admin/admin-form";
import { Field, Select } from "@/components/ui/form";
import { updateUserRole } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { listAdminUsers } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Staff users" };

/**
 * Restricted to ADMIN. requireAdmin() redirects a SALES user away before any
 * data is read, and updateUserRole re-checks the role independently - the page
 * guard and the action guard are separate on purpose.
 */
export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await listAdminUsers();

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

      <TableWrap>
        <Table className="min-w-[40rem]">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Last sign-in</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td className="font-medium text-navy-900">
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
                <Td className="whitespace-nowrap text-[13px]">{formatDate(user.lastLoginAt)}</Td>
                <Td className="whitespace-nowrap text-[13px]">{formatDate(user.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <section className="max-w-md rounded-[--radius-lg] border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-navy-900">Change a user&rsquo;s role</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
          You cannot change your own role, and the last remaining administrator cannot be
          demoted.
        </p>
        <div className="mt-5">
          <AdminForm action={updateUserRole} submitLabel="Update role" pendingLabel="Updating…">
            {({ fieldErrors }) => (
              <>
                <Field label="User" required error={fieldErrors.userId?.[0]}>
                  {({ id, describedBy, invalid }) => (
                    <Select id={id} name="userId" required aria-describedby={describedBy} invalid={invalid}>
                      <option value="">Choose a user</option>
                      {users
                        .filter((user) => user.id !== admin.id)
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                    </Select>
                  )}
                </Field>
                <Field label="New role" required error={fieldErrors.role?.[0]}>
                  {({ id, describedBy, invalid }) => (
                    <Select id={id} name="role" defaultValue="SALES" required aria-describedby={describedBy} invalid={invalid}>
                      <option value="SALES">Sales — everything except staff and settings</option>
                      <option value="ADMIN">Administrator — full access</option>
                      <option value="CUSTOMER">Customer — no admin access</option>
                    </Select>
                  )}
                </Field>
              </>
            )}
          </AdminForm>
        </div>
      </section>
    </div>
  );
}
