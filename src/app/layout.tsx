import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../components/LanguageProvider";

import { AppNavigationProvider } from "../components/AppNavigation";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#eaf3f7" };

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CycleWorth",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CycleWorth" },
  icons: { apple: "/brand/cycleworth-icon-hd.png" },
  description: "Quantify and track financial savings and ROI from cycling commutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><LanguageProvider><AppNavigationProvider>{children}</AppNavigationProvider></LanguageProvider></body>
    </html>
  );
}
