import type { Metadata } from "next";
import { headers } from "next/headers";
import { orderRuntime } from "@/lib/orders/runtime";
import { TrackingForm } from "@/components/tracking-form";
export const metadata: Metadata = { title: "অর্ডার ট্র্যাক / Track order", robots: { index: false, follow: false } };
export default async function TrackPage() {
  const { config } = orderRuntime();
  const nonce = (await headers()).get("x-nonce") ?? "";
  return <div className="container page-space track-page"><h1>অর্ডার ট্র্যাক / Track order</h1><p>অর্ডার কোড ও যে bKash নম্বর থেকে পেমেন্ট করেছেন তার শেষ ৪ অঙ্ক দিন।</p><p>Enter the order code and the last four digits of the sending bKash number.</p><TrackingForm nonce={nonce} siteKey={config.NEXT_PUBLIC_TURNSTILE_SITE_KEY} whatsappNumber={config.ADMIN_WHATSAPP_NUMBER} /></div>;
}
