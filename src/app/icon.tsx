import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Browser-tab favicon — a simplified monogram of the real wordmark (the
// full "Flicks Licks&" text isn't legible at 32px), in the brand's actual
// red/cream palette. See apple-icon.tsx for the larger home-screen icon,
// which has room for the full two-line wordmark.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e42313",
          borderRadius: 7,
          color: "#fff4ec",
          fontSize: 21,
          fontWeight: 800,
        }}
      >
        F
      </div>
    ),
    { ...size }
  );
}
