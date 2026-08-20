import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-700">
        404
      </p>
      <h1 className="mt-3 text-3xl sm:text-4xl">This page could not be found</h1>
      <p className="mt-4 max-w-lg text-[15px] text-ink-600">
        The page you are looking for has moved or no longer exists. You can search the
        catalogue or browse by vendor instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/products">Browse software</ButtonLink>
        <ButtonLink href="/" variant="outline">
          Back to home
        </ButtonLink>
        <ButtonLink href="/contact" variant="ghost">
          Contact us
        </ButtonLink>
      </div>
    </div>
  );
}
