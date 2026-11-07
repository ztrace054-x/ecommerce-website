import Link from "next/link";
import { checkoutSettings } from "@/lib/config";
import { supportDetails } from "@/lib/support";

export function SiteFooter() {
  const { ordersOpen } = checkoutSettings();
  const { whatsapp } = supportDetails();

  return (
    <footer className="vexora-footer">
      <div className="vexora-container vexora-footer-inner">
        <div className="vexora-footer-brand-block">
          <Link className="vexora-footer-brand" href="/">
            VEXORA<span>.</span>
          </Link>
          <p>নিরাপদ ও সহজ ডিজিটাল পণ্য, বিকাশে পেমেন্ট।</p>
          {whatsapp ? (
            <a
              className="vexora-footer-contact"
              href={"https://wa.me/" + whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp: +{whatsapp}
            </a>
          ) : (
            <Link className="vexora-footer-contact" href="/contact#whatsapp">
              WhatsApp support
            </Link>
          )}
        </div>

        <nav className="vexora-footer-links" aria-label="নীতি ও সহায়তা">
          <Link href="/#about">আমরা কারা</Link>
          <Link href="/refund">Refund Policy</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">যোগাযোগ</Link>
        </nav>
      </div>

      <div className="vexora-container vexora-footer-bottom">
        <span>© {new Date().getFullYear()} VEXORA. All rights reserved.</span>
        <span>
          {ordersOpen
            ? "Manual payment verification · Bangladesh"
            : "Preview mode · Orders are currently closed"}
        </span>
      </div>
    </footer>
  );
}
