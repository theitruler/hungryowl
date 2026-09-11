import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell";
import { isDemo } from "@/lib/runtime";
import { getViewer } from "@/lib/auth";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "HungryOwl · Bangalore after hours", template: "%s · HungryOwl" },
  description:
    "Find open late-night food stalls near you in Bangalore. Made for night riders and midnight appetites.",
  applicationName: "HungryOwl",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#111310", width: "device-width", initialScale: 1 };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Shell viewer={await getViewer()} demo={isDemo()}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
