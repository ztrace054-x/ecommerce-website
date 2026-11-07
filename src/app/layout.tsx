import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppLink } from "@/components/whatsapp-link";

import "./design-tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VEXORA — AI Tools ও ডিজিটাল সেবা",
    template: "%s | VEXORA",
  },
  description:
    "বাংলাদেশের ব্যবহারকারীদের জন্য AI Tools ও ডিজিটাল সেবা সম্পর্কে পরিষ্কার তথ্য, সহজ অভিজ্ঞতা এবং নিরাপদ ব্যবহারের নির্দেশনা।",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await headers(); // Preserve request-time rendering required by the nonce CSP.
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
