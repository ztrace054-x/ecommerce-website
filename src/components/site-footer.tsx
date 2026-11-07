import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="vexora-footer">
      <div className="vexora-container vexora-footer-inner">
        <div className="vexora-footer-brand-block">
          <Link className="vexora-footer-brand" href="/">
            VEXORA<span>.</span>
          </Link>
          <p>AI Tools ও ডিজিটাল সেবার সহজ অভিজ্ঞতা।</p>
        </div>

        <nav className="vexora-footer-links" aria-label="নীতি ও সহায়তা">
          <Link href="/#about">আমাদের লক্ষ্য</Link>
          <Link href="/refund">Refund Policy</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">যোগাযোগ</Link>
        </nav>
      </div>

      <div className="vexora-container vexora-footer-bottom">
        <span>© {new Date().getFullYear()} VEXORA. All rights reserved.</span>
        <span>Preview mode · Orders are currently closed</span>
      </div>
    </footer>
  );
}
