import type { Metadata } from "next";
import { AccountNav } from "@/components/layout/account-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth/guards";
import { verificationEnforced } from "@/lib/auth/email-verification";
import { ButtonLink } from "@/components/ui/button";

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
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/account");

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="relative isolate mb-8 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-(--radius-xl) bg-career-navy-dark px-6 py-7 text-white sm:px-8">
        <span
          aria-hidden="true"
          className="absolute -right-10 -top-10 -z-10 h-48 w-48 rotate-12 bg-career-blue/30 [clip-path:polygon(0_0,100%_0,100%_100%)]"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 -z-10 h-10 w-48 bg-career-orange [clip-path:polygon(0_100%,100%_100%,0_20%)]"
        />
        <div className="pb-3">
          <h1 className="text-2xl font-bold text-white sm:text-[1.9rem]">
            My account
          </h1>
          <p className="mt-1.5 text-[15px] text-white/90">
            {user.name}
            {user.companyName ? (
              <>
                {" · "}
                <span className="text-white/75">{user.companyName}</span>
              </>
            ) : null}
          </p>
        </div>
        <SignOutButton tone="onDark" />
      </header>

      {/*
        One banner for the whole account area rather than a notice on each page.
        It appears only while the address is unconfirmed *and* confirmation is
        being enforced — on a deployment without SMTP there is no link to open,
        so nagging about one would be cruel.
      */}
      {(await verificationEnforced()) && !user.emailVerified ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-(--radius-lg) border border-warning-600/40 bg-warning-50 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-warning-700">
              Confirm your email address
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-700">
              We sent a link to {user.email}. Until you open it you can browse
              and use your account, but not submit an enquiry, accept a
              quotation or place an order.
            </p>
          </div>
          <ButtonLink href="/verify-email/required" variant="outline" size="sm">
            Sort this out
          </ButtonLink>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0">
          <AccountNav />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
