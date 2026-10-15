import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppLink } from "@/components/whatsapp-link";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AI সেবা — সহজভাবে শুরু করুন", template: "%s | AI সেবা" },
  description:
    "বাংলাদেশের জন্য AI সেবার মার্কেটপ্লেস। সেবা ও মূল্য জানুন, bKash পেমেন্টের তথ্য জমা দিন এবং অর্ডার ট্র্যাক করুন।",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="bn">
      <body>
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
