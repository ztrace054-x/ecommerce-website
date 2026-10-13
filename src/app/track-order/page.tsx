import type { Metadata } from "next";
import { OrderTracker } from "@/components/order-tracker";
import { databaseConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "অর্ডার ট্র্যাক করুন" };
export default function TrackingPage() {
  let available: boolean;
  try {
    available = Boolean(databaseConfig()) && Boolean(process.env.APP_URL);
  } catch {
    available = false;
  }
  return (
    <div className="container page-space">
      <div className="page-heading">
        <p className="eyebrow">সহজ ও ব্যক্তিগত</p>
        <h1>অর্ডার ট্র্যাক করুন</h1>
        <p className="page-intro">
          কোনো নতুন অ্যাকাউন্ট খুলতে হবে না। আপনার অর্ডার কোড, ইমেইল ও ব্যক্তিগত
          কী দিয়েই অবস্থা দেখুন।
        </p>
      </div>
      <OrderTracker available={available} />
    </div>
  );
}
