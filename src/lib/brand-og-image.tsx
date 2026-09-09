import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT = "Flicks & Licks — The Suya Boss";

// The asset doesn't depend on request data, so it's read once at module
// scope (per Next.js's own guidance for local images in opengraph-image
// routes) rather than on every request.
const logoData = await readFile(join(process.cwd(), "public/brand/logo.png"), "base64");
const logoSrc = `data:image/png;base64,${logoData}`;

/** Shared by opengraph-image.tsx and twitter-image.tsx so the link-preview card is identical wherever it's read from. */
export function renderBrandOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#120404",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            left: "50%",
            transform: "translateX(-50%)",
            width: 680,
            height: 680,
            borderRadius: "50%",
            background: "rgba(228,35,19,0.35)",
            filter: "blur(100px)",
            display: "flex",
          }}
        />
        {/* next/image can't render inside ImageResponse (Satori) — a plain <img> is the documented way in. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={168} height={168} alt="" style={{ borderRadius: 38 }} />
        <div
          style={{
            marginTop: 40,
            fontSize: 88,
            fontWeight: 800,
            color: "#fff4ec",
            letterSpacing: -2,
            display: "flex",
          }}
        >
          Flicks &amp; Licks
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 14,
            textTransform: "uppercase",
            color: "#2fd8d1",
            display: "flex",
          }}
        >
          The Suya Boss
        </div>
      </div>
    ),
    OG_IMAGE_SIZE
  );
}
