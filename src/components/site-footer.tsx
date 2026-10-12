import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link className="footer-brand" href="/">AI সেবা</Link>
          <p>আপনার নিজের অ্যাকাউন্ট। নিরাপদ ব্যবহারের সহায়তা।</p>
        </div>
        <nav className="footer-links" aria-label="নীতি ও যোগাযোগ">
          <Link href="/refund">অর্থ ফেরত নীতি</Link>
          <Link href="/privacy">গোপনীয়তা</Link>
          <Link href="/terms">শর্তাবলি</Link>
          <Link href="/contact">যোগাযোগ</Link>
        </nav>
      </div>
      <div className="container footer-bottom">এটি একটি নমুনা সাইট। দেখানো মূল্য চূড়ান্ত অফার নয়।</div>
    </footer>
  );
}
