import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppLink } from "@/components/whatsapp-link";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AI সেবা — সহজভাবে শুরু করুন", template: "%s | AI সেবা" },
  description: "AI সেটআপ, প্রম্পট শেখা, চ্যাটবট ও ওয়েবসাইট তৈরির সেবার নমুনা। এখন কোনো অর্ডার বা পেমেন্ট নেওয়া হচ্ছে না।",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="bn">
      <body>
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>{children}</main>
        <SiteFooter />
        <WhatsAppLink />
      </body>
    </html>
  );
}
