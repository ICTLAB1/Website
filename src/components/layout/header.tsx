import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { MegaMenu } from "@/components/layout/mega-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BasketButton } from "@/components/layout/basket-button";
import { SearchBox } from "@/components/layout/search-box";
import { ButtonLink } from "@/components/ui/button";
import { utilityNav } from "@/lib/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSiteConfig } from "@/lib/site-config";

/**
 * Site header. A Server Component: the session lookup and configuration read
 * happen on the server, and only the interactive pieces (mega menu, mobile
 * drawer, search, basket count) are client components.
 */
export async function Header() {
  const [user, config] = await Promise.all([
    getSessionUser(),
    Promise.resolve(getSiteConfig()),
  ]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      {/* Utility bar */}
      <div className="hidden border-b border-navy-800 bg-navy-900 text-navy-100 lg:block">
        <div className="container-page flex h-9 items-center justify-between text-[12px]">
          <p className="text-navy-200">{config.tagline}</p>
          <nav aria-label="Utility">
            <ul className="flex items-center gap-5">
              {utilityNav.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={user ? "/account" : "/login"}
                  className="font-medium text-white hover:underline"
                >
                  {user ? `Account (${user.name.split(" ")[0]})` : "Login"}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main bar */}
      <div className="container-page">
        <div className="flex h-16 items-center gap-4 lg:h-[4.5rem]">
          <Logo name={config.tradingName} className="shrink-0" />

          <div className="ml-auto hidden max-w-md flex-1 lg:block xl:max-w-lg">
            <SearchBox placeholder="Search software, SKU or solution" />
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link
              href="/search"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[--radius-md] border border-line-strong text-navy-900 lg:hidden"
            >
              <span className="sr-only">Search</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.14 3.13a1 1 0 0 0 1.41-1.41l-3.13-3.14A5.5 5.5 0 0 0 9 3.5M5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"
                  clipRule="evenodd"
                />
              </svg>
            </Link>

            <Link
              href={user ? "/account" : "/login"}
              className="hidden h-10 w-10 items-center justify-center rounded-[--radius-md] border border-line-strong text-navy-900 hover:border-navy-400 hover:bg-navy-50 sm:inline-flex lg:hidden xl:inline-flex"
            >
              <span className="sr-only">{user ? "My account" : "Sign in"}</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3.5 16.5a6.5 6.5 0 0 1 13 0 .5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5" />
              </svg>
            </Link>

            <BasketButton />

            <ButtonLink href="/enquiry" size="sm" className="hidden md:inline-flex">
              Get Enterprise Quote
            </ButtonLink>

            <MobileNav signedIn={Boolean(user)} />
          </div>
        </div>
      </div>

      {/* Primary navigation */}
      <div className="hidden border-t border-line lg:block">
        <div className="container-page">
          <MegaMenu />
        </div>
      </div>
    </header>
  );
}
