import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS/Android home-screen ("add to home screen") icon — the full two-line
// wordmark reads fine at this size, unlike the 32px favicon in icon.tsx.
export default function AppleIcon() {
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
          background: "#e42313",
          color: "#fff4ec",
        }}
      >
        <div style={{ display: "flex", fontSize: 46, fontWeight: 800, lineHeight: 1 }}>Flicks</div>
        <div style={{ display: "flex", fontSize: 46, fontWeight: 800, lineHeight: 1, marginTop: 6 }}>Licks&amp;</div>
      </div>
    ),
    { ...size }
  );
}
