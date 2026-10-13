import Link from "next/link";
import { checkoutSettings } from "@/lib/config";

export function SiteFooter() {
  const { ordersOpen } = checkoutSettings();
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link className="footer-brand" href="/">
            AI সেবা
          </Link>
          <p>আপনার নিজের অ্যাকাউন্ট। নিরাপদ ব্যবহারের সহায়তা।</p>
        </div>
        <nav className="footer-links" aria-label="নীতি ও যোগাযোগ">
          <Link href="/refund">অর্থ ফেরত নীতি</Link>
          <Link href="/privacy">গোপনীয়তা</Link>
          <Link href="/terms">শর্তাবলি</Link>
          <Link href="/contact">যোগাযোগ</Link>
          <Link href="/admin/login">অ্যাডমিন</Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        {ordersOpen
          ? "নিরাপদ ব্যবহার · ম্যানুয়াল যাচাইয়ের পরে সেবা"
          : "প্রিভিউ · অর্ডার এখন বন্ধ · নমুনা মূল্য চূড়ান্ত অফার নয়"}
      </div>
    </footer>
  );
}
