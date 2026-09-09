import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Baloo_2 } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Brand display faces for customer-facing surfaces (homepage, order flow,
// tracking page) — an ultra-bold condensed headline face plus a rounded
// bold face matching the real "Flicks & Licks" logo's hand-lettered
// wordmark. Staff/admin surfaces keep plain Geist.
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const baloo = Baloo_2({
  variable: "--font-marker",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const SITE_TITLE = "Flicks & Licks — The Suya Boss";
const SITE_DESCRIPTION = "Order delivery or pickup from four branches across Accra. Loaded fries, suya, shawarma and pizza, tracked live from our kitchen to your door.";

export const metadata: Metadata = {
  // Lets Next.js resolve the opengraph-image/twitter-image file conventions
  // (and any other relative metadata URL) into an absolute one — without
  // this it falls back to guessing from the request, which is wrong for a
  // link shared from a Vercel preview deployment's own ephemeral URL.
  metadataBase: new URL(getSiteUrl()),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "Flicks & Licks",
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
