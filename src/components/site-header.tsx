import Link from "next/link";

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">মূল অংশে যান</a>
      <div className="demo-banner">ডেমো সাইট · এখন কোনো অর্ডার বা পেমেন্ট নেওয়া হচ্ছে না</div>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label="AI সেবা — হোম">
            <span className="brand-mark" aria-hidden="true">ai<span>·</span></span>
            <span>AI সেবা</span>
          </Link>
          <nav className="main-nav" aria-label="প্রধান মেনু">
            <Link href="/">হোম</Link>
            <Link href="/products">সেবা ও প্ল্যান</Link>
            <Link href="/faq">প্রশ্নোত্তর</Link>
            <Link href="/contact">যোগাযোগ</Link>
          </nav>
        </div>
      </header>
    </>
  );
}
