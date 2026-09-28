import { listBranches } from "@/modules/branches/services/branch.service";
import { prisma } from "@/db/client";
import { HomePage } from "@/components/home/HomePage";

// Must render per-request, not be statically prerendered — the CSP nonce
// (see proxy.ts) is generated fresh per request, and Next.js can only thread
// it into this page's inline hydration scripts when the page is rendered
// dynamically. A prerendered version bakes in a stale nonce that never
// matches the real request's CSP header, silently breaking hydration.
export const dynamic = "force-dynamic";

// Curated homepage picks — kept as real Product rows (not a hardcoded list)
// so price/copy always match the live menu. Each photo was shot in the
// actual shop (from @bobaking_gh), not a stock/illustrated placeholder.
// `position` is a CSS object-position tuned per photo so the cup stays
// framed once the source (often a portrait social crop) is cropped into
// the card's aspect ratio.
//
// taro-milk-tea and brown-sugar-boba-milk-tea are deliberately left out: the
// only taro photo is a promo poster with "Taro Milk Tea" and a price baked
// into the pixels, and because that source is portrait (narrower than every
// card shape here), object-position can only crop it vertically — there's no
// framing that hides the poster's own (stale, ₵45 vs. the real ₵65) price
// while keeping the cup in frame. Brown sugar has no distinct photo at all.
const PRODUCT_PHOTOS: Record<string, { src: string; position: string }> = {
  "strawberry-milk-tea": { src: "/images/boba/strawberry-milk-tea.jpg", position: "78% 45%" },
  "blueberry-milk-tea": { src: "/images/boba/blueberry-milk-tea.jpg", position: "68% 32%" },
  "strawberry-matcha-latte": { src: "/images/boba/strawberry-matcha-latte.jpg", position: "center 38%" },
  "matcha-milk-tea": { src: "/images/boba/matcha-milk-tea.jpg", position: "center 92%" },
  "mango-biscoff-milk-tea": { src: "/images/boba/mango-biscoff-caramel.jpg", position: "center 35%" },
  "loaded-waffle": { src: "/images/boba/waffle-aesthetic.jpg", position: "30% 78%" },
  "waffle-milk-tea-combo": { src: "/images/boba/waffle-combo.jpg", position: "center 55%" },
};
const FEATURED_SLUGS = Object.keys(PRODUCT_PHOTOS);
const POPULAR_SLUGS = new Set(["strawberry-milk-tea", "strawberry-matcha-latte", "blueberry-milk-tea"]);

export default async function Home() {
  const [branches, featuredProducts] = await Promise.all([
    listBranches({ status: "ACTIVE" }),
    prisma.product.findMany({
      where: { slug: { in: FEATURED_SLUGS }, isActive: true },
      select: { id: true, slug: true, name: true, basePrice: true },
    }),
  ]);

  const productsBySlug = new Map(featuredProducts.map((p) => [p.slug, p]));
  const dishes = FEATURED_SLUGS.map((slug) => {
    const product = productsBySlug.get(slug);
    const photo = PRODUCT_PHOTOS[slug];
    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      price: Number(product.basePrice),
      tag: POPULAR_SLUGS.has(slug) ? "Popular" : undefined,
      photo: photo.src,
      photoPosition: photo.position,
    };
  }).filter((d): d is NonNullable<typeof d> => d != null);

  return (
    <HomePage
      branches={branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
      }))}
      dishes={dishes}
    />
  );
}
