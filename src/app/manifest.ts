import type { MetadataRoute } from "next";

// Reuses the same dynamically-generated icons as the browser favicon/home
// screen icon (see app/icon.tsx and app/apple-icon.tsx) rather than shipping
// separate static image assets — one source of truth for the mark.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flicks & Licks",
    short_name: "Flicks & Licks",
    description: "Order delivery or pickup from Flicks & Licks — the Suya Boss. Four branches across Accra.",
    start_url: "/",
    display: "standalone",
    background_color: "#120404",
    theme_color: "#e42313",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
