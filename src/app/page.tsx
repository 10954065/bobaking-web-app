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
// so price/photo always match the live menu. "Popular" is an editorial tag,
// not derived from order data.
const FEATURED_SLUGS = [
  "taro-milk-tea",
  "strawberry-matcha-latte",
  "brown-sugar-boba-milk-tea",
  "matcha-milk-tea",
  "strawberry-milk-tea",
  "loaded-waffle",
  "waffle-milk-tea-combo",
  "classic-waffle",
];
const POPULAR_SLUGS = new Set(["taro-milk-tea", "strawberry-matcha-latte", "brown-sugar-boba-milk-tea"]);

export default async function Home() {
  const [branches, featuredProducts] = await Promise.all([
    listBranches({ status: "ACTIVE" }),
    prisma.product.findMany({
      where: { slug: { in: FEATURED_SLUGS }, isActive: true },
      select: { id: true, slug: true, name: true, basePrice: true, imageUrl: true, description: true },
    }),
  ]);

  const productsBySlug = new Map(featuredProducts.map((p) => [p.slug, p]));
  const dishes = FEATURED_SLUGS.map((slug) => productsBySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.basePrice),
      image: p.imageUrl,
      description: p.description,
      tag: POPULAR_SLUGS.has(p.slug) ? "Popular" : undefined,
    }));

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
