import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Baloo_2 } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Flicks & Licks",
  description: "Flicks & Licks, the Suya Boss. Order delivery or pickup from four branches across Accra.",
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
