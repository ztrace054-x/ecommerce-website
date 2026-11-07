import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppLink } from "@/components/whatsapp-link";

import "./design-tokens.css";
import "./globals.css";

const bengali = localFont({
  src: "../../public/fonts/noto-sans-bengali.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-bengali",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "VEXORA — নিরাপদ ও সহজ ডিজিটাল পণ্য",
    template: "%s | VEXORA",
  },
  description:
    "ডলার কার্ড ছাড়াই ডিজিটাল পণ্য কিনুন। বিকাশে পেমেন্ট করুন, TrxID দিন, আমরা যাচাই করে পণ্য পৌঁছে দেব।",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="bn">
      <body className={bengali.variable + " " + display.variable}>
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <WhatsAppLink />
      </body>
    </html>
  );
}
