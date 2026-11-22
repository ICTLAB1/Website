import { safeBrandLogo } from "@/lib/brand-logo";

/**
 * The picture frame for a hardware model that has no photograph and no
 * illustration of its form factor.
 *
 * The publisher's logo fills the frame, contained and never cropped, instead of
 * an empty dashed box. A publisher with no logo on file shows its name, large,
 * in the same frame — the name is a fact, not an approximation of artwork.
 * The frame is the same size as `ProductPhoto`'s, so a grid of mixed cards
 * keeps its rhythm.
 */
export function BrandLogoFrame({
  brandName,
  logoUrl,
  ratio = "4/3",
}: {
  brandName: string;
  logoUrl: string | null | undefined;
  ratio?: "4/3" | "16/10";
}) {
  const logo = safeBrandLogo(logoUrl);
  const frame = ratio === "16/10" ? "aspect-[16/10]" : "aspect-[4/3]";
  return (
    <div
      className={`${frame} flex w-full items-center justify-center overflow-hidden rounded-(--radius-md) border border-line bg-white p-6`}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={brandName}
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-center text-4xl font-bold tracking-wide text-graphite-900">{brandName}</span>
      )}
    </div>
  );
}
