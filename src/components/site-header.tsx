import Link from "next/link";
import { checkoutSettings } from "@/lib/config";

export function SiteHeader() {
  const { ordersOpen } = checkoutSettings();
  return (
    <>
      <a className="skip-link" href="#main-content">
        মূল অংশে যান
      </a>
      <div className="demo-banner">
        {ordersOpen
          ? "bKash পেমেন্ট · হাতে যাচাই · নিজের অ্যাকাউন্ট নিরাপদ রাখুন"
          : "প্রিভিউ · এখন অর্ডার বা পেমেন্ট নেওয়া হচ্ছে না"}
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label="AI সেবা — হোম">
            <span className="brand-mark" aria-hidden="true">
              ai<span>·</span>
            </span>
            <span>AI সেবা</span>
          </Link>
          <nav className="main-nav" aria-label="প্রধান মেনু">
            <Link href="/">হোম</Link>
            <Link href="/products">সেবা ও প্ল্যান</Link>
            <Link href="/track-order">অর্ডার ট্র্যাক</Link>
            <Link href="/faq">প্রশ্নোত্তর</Link>
            <Link href="/contact">যোগাযোগ</Link>
          </nav>
        </div>
      </header>
    </>
  );
}
