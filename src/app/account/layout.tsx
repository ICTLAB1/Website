import type { Metadata } from "next";
import { AccountNav } from "@/components/layout/account-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: { default: "My account", template: "%s | My account" },
  robots: { index: false, follow: false },
};

/**
 * Every page beneath /account inherits this layout, and this layout calls
 * requireUser(). Authorisation therefore happens server-side for the whole
 * section rather than page by page, with each page additionally scoping its
 * own queries by the resolved user id.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem]">My account</h1>
          <p className="mt-1.5 text-[14px] text-ink-600">
            {user.name}
            {user.companyName ? (
              <>
                {" · "}
                <span className="text-ink-500">{user.companyName}</span>
              </>
            ) : null}
          </p>
        </div>
        <SignOutButton />
      </header>

      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
