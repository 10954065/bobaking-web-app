import type { MetadataRoute } from "next";

// Reuses the same static icon files as the browser favicon/home screen icon
// (see app/icon.png and app/apple-icon.png, both generated from the real
// brand logo) rather than shipping separate manifest-only assets — one
// source of truth for the mark.
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
    ],
  };
}
