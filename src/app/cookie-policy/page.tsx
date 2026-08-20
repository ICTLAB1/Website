import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cookie Policy",
  description:
    "The cookies this website sets, what each one does, and why no consent banner is presented.",
  path: "/cookie-policy",
});

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro={[
        "This page lists every cookie this website sets. There are two, both strictly necessary for the site to work, and there are no third-party cookies.",
        "Because no cookie here is used for advertising, analytics or tracking, this site does not present a consent banner. Whether that position holds for the operating entity's jurisdiction should be confirmed during the legal review of this document.",
      ]}
      sections={[
        {
          heading: "csrf_token",
          paragraphs: [
            "Purpose: prevents cross-site request forgery. A random value is stored in this cookie and must be echoed back in a request header when you submit a form. Because another website cannot read our cookie, only our own pages can produce a matching header.",
            "It is deliberately readable by this site's own scripts, which is what allows it to be echoed back. It contains no personal data and no identifier that can be linked to you.",
            "Set for: every visitor. Expires: 8 hours. Marked Secure in production, SameSite=Lax.",
          ],
        },
        {
          heading: "ictlab_session",
          paragraphs: [
            "Purpose: keeps you signed in. It holds an opaque random token; the server stores only a keyed hash of that token, so a database disclosure cannot be used to impersonate you.",
            "It is HttpOnly, so no script can read it, marked Secure in production and SameSite=Lax.",
            "Set for: signed-in users only. Expires: 7 days after sign-in, or immediately when you sign out. It is also revoked server-side if an administrator changes your role or you reset your password.",
          ],
        },
        {
          heading: "Local storage: your enquiry basket",
          paragraphs: [
            "Your enquiry basket is kept in your browser's local storage rather than in a cookie. It holds the product SKUs, quantities and any notes you have added.",
            "It is never transmitted to us until you submit an enquiry, and clearing your browser storage removes it entirely. When you do submit, only the SKUs and quantities are sent — prices and product names are re-read from our catalogue on the server.",
          ],
        },
        {
          heading: "What this site does not set",
          bullets: [
            "No advertising or retargeting cookies",
            "No third-party analytics cookies",
            "No social media tracking pixels",
            "No cross-site identifiers of any kind",
          ],
        },
        {
          heading: "Managing cookies",
          paragraphs: [
            "You can block or delete cookies in your browser settings. Blocking the two cookies described above will prevent you from signing in and from submitting any form on this site, because both depend on them.",
          ],
        },
      ]}
    />
  );
}
