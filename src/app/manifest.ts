import type { MetadataRoute } from "next";

// All generated from the real brand logo (see public/brand/logo.png) — one
// source of truth for the mark. The 192/512 sizes aren't cosmetic: Chrome's
// "Add to Home Screen"/install-ability check requires at least a 192x192
// icon (512x512 recommended) to build the home-screen icon and splash
// screen from. Without them it silently falls back to a generic placeholder
// glyph instead of erroring, which is why it went unnoticed until someone
// actually added the site to their home screen.
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
      { src: "/icon.png", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
