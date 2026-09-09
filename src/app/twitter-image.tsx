import { renderBrandOgImage, OG_IMAGE_SIZE, OG_IMAGE_ALT } from "@/lib/brand-og-image";

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBrandOgImage();
}
