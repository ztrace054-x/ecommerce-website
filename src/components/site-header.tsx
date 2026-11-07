import Link from "next/link";

export function SiteHeader() {
  return (
    <>
      <a className="vexora-skip-link" href="#main-content">
        মূল অংশে যান
      </a>
      <div className="vexora-demo-banner" role="status">
        PREVIEW MODE · এখন কোনো অর্ডার বা পেমেন্ট নেওয়া হচ্ছে না
      </div>
      <header className="vexora-site-header">
        <div className="vexora-header-inner">
          <Link href="/" className="vexora-brand" aria-label="VEXORA — হোম">
            <span className="vexora-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M7 18c4-8 10-10 17-6M10 22c6 2 12-1 15-7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="vexora-brand-word">VEXORA</span>
          </Link>

          <nav className="vexora-main-nav" aria-label="প্রধান মেনু">
            <Link href="/#plans">AI TOOLS</Link>
            <Link href="/#how-it-works">HOW IT WORKS</Link>
            <Link href="/track">TRACK ORDER</Link>
            <Link href="/faq">FAQ</Link>
          </nav>

          <Link href="/#plans" className="vexora-header-cta">
            প্ল্যান দেখুন <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
    </>
  );
}
