import Link from "next/link";
import { HomeCategoryTabs } from "@/components/home-category-tabs";
import { HomeHero } from "@/components/home-hero";
import { mockProducts } from "@/data/mock-products";

const steps = [
  {
    number: "০১",
    title: "প্ল্যান বেছে নিন",
    text: "AI Tools বিভাগে আপনার প্রয়োজনের প্ল্যান নির্বাচন করুন।",
  },
  {
    number: "০২",
    title: "অর্ডার তথ্য দিন",
    text: "অর্ডার চালু হলে প্রয়োজনীয় যোগাযোগের তথ্য দিয়ে ফর্ম পূরণ করুন।",
  },
  {
    number: "০৩",
    title: "bKash-এ পেমেন্ট করুন",
    text: "ফর্মে দেখানো সঠিক পরিমাণ পাঠিয়ে TrxID জমা দিন।",
  },
  {
    number: "০৪",
    title: "পেমেন্ট যাচাই",
    text: "অ্যাডমিন bKash অ্যাপে লেনদেনের তথ্য হাতে মিলিয়ে দেখেন।",
  },
  {
    number: "০৫",
    title: "ডেলিভারি সম্পন্ন",
    text: "পেমেন্ট নিশ্চিত হওয়ার পর অনুমোদিত পণ্য বা সেবা দেওয়া হয়।",
  },
  {
    number: "০৬",
    title: "অর্ডার ট্র্যাক করুন",
    text: "অর্ডার কোড ও প্রেরকের bKash নম্বরের শেষ চার অঙ্ক দিয়ে আপডেট দেখুন।",
  },
];

const trustItems = [
  {
    number: "01",
    title: "পাসওয়ার্ড কখনো নয়",
    text: "আপনার তৃতীয় পক্ষের অ্যাকাউন্টের পাসওয়ার্ড আমরা চাই না।",
  },
  {
    number: "02",
    title: "ম্যানুয়াল পেমেন্ট যাচাই",
    text: "শুধু TrxID জমা দিলেই পেমেন্ট নিশ্চিত হয় না।",
  },
  {
    number: "03",
    title: "স্পষ্ট অর্ডার তথ্য",
    text: "প্ল্যান, মূল্য ও ডেলিভারির শর্ত আগে দেখে নিন।",
  },
  {
    number: "04",
    title: "অর্ডার ট্র্যাকিং",
    text: "অর্ডার কোড ও bKash নম্বরের শেষ চার অঙ্ক দিয়ে অবস্থা দেখুন।",
  },
  {
    number: "05",
    title: "নীতিমালা ও সহায়তা",
    text: "Refund, Privacy, Terms ও Contact তথ্য সহজে পাওয়া যাবে।",
  },
];

export default function HomePage() {
  return (
    <div className="vexora-home">
      <HomeHero />

      <section
        id="plans"
        className="vexora-section vexora-products-section"
        aria-labelledby="vexora-products-heading"
      >
        <div className="vexora-container">
          <div className="vexora-section-heading">
            <div>
              <p className="vexora-eyebrow">YOUR DIGITAL TOOLKIT</p>
              <h2 id="vexora-products-heading">আপনার AI Tools, এক জায়গায়</h2>
              <p className="vexora-section-intro">
                আপনার প্রয়োজনের সেবা ও নমুনা প্ল্যান দেখুন। অর্ডার চালু হলে
                প্রকাশিত তথ্য অনুযায়ী পরবর্তী ধাপ অনুসরণ করতে পারবেন।
              </p>
            </div>
            <span className="vexora-section-index">01 / PRODUCTS</span>
          </div>
          <HomeCategoryTabs products={mockProducts} />
        </div>
      </section>

      <section
        id="how-it-works"
        className="vexora-section vexora-process-section"
        aria-labelledby="vexora-process-heading"
      >
        <div className="vexora-container">
          <div className="vexora-section-heading">
            <div>
              <p className="vexora-eyebrow">SIMPLE BY DESIGN</p>
              <h2 id="vexora-process-heading">কীভাবে কাজ করে</h2>
              <p className="vexora-section-intro">
                অর্ডার চালু হলে প্ল্যান নির্বাচন থেকে ডেলিভারি—প্রতিটি ধাপ
                সহজ ও পরিষ্কারভাবে অনুসরণ করতে পারবেন।
              </p>
            </div>
            <span className="vexora-section-index">02 / PROCESS</span>
          </div>

          <ol className="vexora-steps">
            {steps.map((step) => (
              <li className="vexora-step-card" key={step.number}>
                <span className="vexora-step-number">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="vexora-section vexora-trust-section"
        aria-labelledby="vexora-trust-heading"
      >
        <div className="vexora-container">
          <div className="vexora-section-heading">
            <div>
              <p className="vexora-eyebrow">YOUR TRUST MATTERS</p>
              <h2 id="vexora-trust-heading">নিরাপত্তা ও স্বচ্ছতা</h2>
              <p className="vexora-section-intro">
                আপনার তথ্য, পেমেন্ট যাচাই এবং অর্ডারের প্রতিটি ধাপে পরিষ্কার নিয়ম।
              </p>
            </div>
            <span className="vexora-section-index">03 / TRUST</span>
          </div>

          <div className="vexora-trust-grid">
            {trustItems.map((item) => (
              <article className="vexora-trust-card" key={item.number}>
                <span className="vexora-trust-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="vexora-section vexora-about-section">
        <div className="vexora-container vexora-about-card">
          <div>
            <p className="vexora-eyebrow">OUR PURPOSE</p>
            <h2>আমাদের লক্ষ্য</h2>
          </div>
          <div className="vexora-about-copy">
            <p>
              বাংলাদেশে AI Tools ও ডিজিটাল সেবার ব্যবহার সহজ করা—পরিষ্কার তথ্য,
              সহজ ধাপ এবং নিরাপদ ব্যবহারের ওপর গুরুত্ব দিয়ে।
            </p>
            <p>
              কোনো তৃতীয় পক্ষের অ্যাকাউন্টের পাসওয়ার্ড নয়। পেমেন্ট চালু হলে
              প্রতিটি দাবি হাতে যাচাই করে তারপর অনুমোদিত ডেলিভারির ব্যবস্থা করা হবে।
            </p>
          </div>
        </div>
      </section>

      <section
        id="faq-preview"
        className="vexora-section vexora-faq-section"
        aria-labelledby="vexora-faq-heading"
      >
        <div className="vexora-container">
          <div className="vexora-section-heading">
            <div>
              <p className="vexora-eyebrow">GOOD TO KNOW</p>
              <h2 id="vexora-faq-heading">সাধারণ কিছু প্রশ্ন</h2>
            </div>
            <Link className="vexora-inline-link" href="/faq">
              সব প্রশ্ন দেখুন <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="vexora-faq-list">
            <details>
              <summary>
                এখন কি অর্ডার করা যাবে?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                না। এই মুহূর্তে সাইটটি প্রিভিউ মোডে। এখানে দেখানো মূল্যগুলো
                নমুনা; এখন কোনো অর্ডার বা পেমেন্ট নেওয়া হচ্ছে না।
              </p>
            </details>
            <details>
              <summary>
                পেমেন্ট কীভাবে যাচাই হয়?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                অর্ডার চালু হলে TrxID ও লেনদেনের তথ্য bKash অ্যাপে হাতে যাচাই
                করা হবে। শুধু TrxID জমা দেওয়া পেমেন্টের প্রমাণ নয়।
              </p>
            </details>
            <details>
              <summary>
                আপনারা কি আমার পাসওয়ার্ড চাইবেন?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                না। কোনো তৃতীয় পক্ষের অ্যাকাউন্টের পাসওয়ার্ড দেবেন না।
                নিজের অ্যাকাউন্ট ব্যবহার করার নির্দেশনাই দেওয়া হবে।
              </p>
            </details>
            <details>
              <summary>
                অর্ডার ট্র্যাক করব কীভাবে?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                অর্ডার চালু হলে অর্ডার কোড এবং পেমেন্ট পাঠানো bKash নম্বরের
                শেষ চার অঙ্ক দিয়ে <Link href="/track">ট্র্যাকিং পেজে</Link>
                অবস্থা দেখা যাবে।
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="vexora-bottom-cta">
        <div className="vexora-container vexora-bottom-cta-inner">
          <div>
            <p className="vexora-eyebrow">READY WHEN YOU ARE</p>
            <h2>আপনার প্রয়োজনের AI সেবা খুঁজে নিন</h2>
            <p>নমুনা প্ল্যান দেখুন এবং সাইটের আপডেট সম্পর্কে জানুন।</p>
          </div>
          <div className="vexora-bottom-actions">
            <Link href="#plans" className="vexora-button vexora-button-primary">
              প্ল্যান দেখুন <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/track" className="vexora-button vexora-button-secondary">
              Track order
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
