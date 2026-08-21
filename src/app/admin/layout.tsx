import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/layout/admin-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { isAdmin, requireStaff } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  // The admin area must never be indexed, and must never be cached by a shared
  // cache. The proxy also sets no-store for this path.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Every route beneath /admin passes through this layout, and this layout calls
 * requireStaff() on the server. A non-staff visitor is redirected before any
 * admin data is fetched or rendered - navigation links are hidden as a matter
 * of tidiness, never as the access control itself.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const admin = isAdmin(user);

  return (
    <div className="min-h-dvh bg-surface-muted">
      <div className="grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="bg-graphite-900 px-4 py-5 lg:min-h-dvh lg:px-5 lg:py-7">
          <div className="mb-6 flex items-center justify-between gap-3 lg:block">
            <div>
              <Link href="/admin" className="text-[15px] font-semibold text-white">
                Administration
              </Link>
              <p className="mt-1 text-[12px] text-graphite-400">
                {user.name} · {admin ? "Administrator" : "Sales"}
              </p>
            </div>
            <Link
              href="/"
              className="text-[12px] text-graphite-300 hover:text-white hover:underline lg:mt-3 lg:block"
            >
              View site &rarr;
            </Link>
          </div>

          <AdminNav isAdmin={admin} />

          <div className="mt-8 hidden lg:block">
            <SignOutButton className="w-full border-graphite-700 bg-graphite-800 text-graphite-100 hover:border-danger-600 hover:text-white" />
          </div>
        </aside>

        <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!admin ? (
            <p className="mb-5">
              <Badge tone="warning">
                Sales role — staff user and settings management is restricted to administrators
              </Badge>
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
