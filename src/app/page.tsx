import Link from "next/link";
import { HomeCategoryTabs } from "@/components/home-category-tabs";
import { HomeHero } from "@/components/home-hero";
import { catalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const steps = [
  {
    number: "০১",
    title: "প্ল্যান বেছে নিন",
    text: "আপনার প্রয়োজন অনুযায়ী AI Tools থেকে পছন্দের প্ল্যান নির্বাচন করুন এবং অর্ডার ফর্ম পূরণ করুন।",
  },
  {
    number: "০২",
    title: "নির্দিষ্ট টাকা পাঠান",
    text: "অর্ডার ফর্মে দেখানো সঠিক পরিমাণ টাকা আমাদের বিকাশ নম্বরে পাঠান।",
  },
  {
    number: "০৩",
    title: "TrxID জমা দিন",
    text: "বিকাশের SMS বা অ্যাপ থেকে TrxID নিয়ে অর্ডার ফর্মে লিখুন।",
  },
  {
    number: "০৪",
    title: "আমরা পেমেন্ট যাচাই করি",
    text: "আমরা নিজেরাই বিকাশ অ্যাপে লেনদেনের তথ্য মিলিয়ে দেখব।",
  },
  {
    number: "০৫",
    title: "পণ্য গ্রহণ করুন",
    text: "পেমেন্ট যাচাই হলে ইমেইল বা WhatsApp-এ আপনার পণ্য পৌঁছে দেওয়া হবে।",
  },
  {
    number: "০৬",
    title: "অর্ডার ট্র্যাক করুন",
    text: "আপনার অর্ডার কোড দিয়ে যেকোনো সময় ডেলিভারির অবস্থা দেখুন।",
  },
];

const trustItems = [
  {
    number: "01",
    title: "পাসওয়ার্ড কখনো নয়",
    text: "আপনার কোনো অ্যাকাউন্ট বা ইমেইলের পাসওয়ার্ড আমরা চাই না।",
  },
  {
    number: "02",
    title: "ম্যানুয়াল পেমেন্ট যাচাই",
    text: "প্রতিটি পেমেন্টের তথ্য আমরা নিজেরা বিকাশ অ্যাপে মিলিয়ে দেখি।",
  },
  {
    number: "03",
    title: "প্রয়োজনীয় তথ্যই শুধু",
    text: "আপনার তথ্য অর্ডার সম্পন্ন করা ও সাপোর্ট দেওয়ার কাজেই ব্যবহার হয়।",
  },
  {
    number: "04",
    title: "স্পষ্ট রিফান্ড নীতি",
    text: "রিফান্ডের শর্ত ও যোগাযোগের নিয়ম আমাদের নীতিমালায় দেওয়া আছে।",
  },
  {
    number: "05",
    title: "সরাসরি সাপোর্ট",
    text: "অর্ডার বা পেমেন্ট নিয়ে প্রশ্ন থাকলে আমাদের সাপোর্ট টিমের সঙ্গে যোগাযোগ করুন।",
  },
];

export default async function HomePage() {
  const { products, sample } = await catalog();

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
                প্ল্যানের সুবিধা ও মূল্য দেখে আপনার প্রয়োজনেরটি বেছে নিন।
              </p>
            </div>
            <span className="vexora-section-index">01 / PRODUCTS</span>
          </div>
          <HomeCategoryTabs products={products} sample={sample} />
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
                প্ল্যান নির্বাচন থেকে ডেলিভারি—প্রতিটি ধাপ সহজ ও পরিষ্কার।
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
              <h2 id="vexora-trust-heading">কেন VEXORA-কে বিশ্বাস করবেন</h2>
              <p className="vexora-section-intro">
                নিরাপদ পেমেন্ট, স্বচ্ছ নিয়ম এবং আপনার ব্যক্তিগত তথ্যের প্রতি সম্মান।
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
            <p className="vexora-eyebrow">A SMALL BANGLADESHI INITIATIVE</p>
            <h2>আমরা কারা</h2>
          </div>
          <div className="vexora-about-copy">
            <p>
              VEXORA একটি ছোট বাংলাদেশি উদ্যোগ। অনেকের ডলার কার্ড নেই বলে
              আন্তর্জাতিক ডিজিটাল পণ্য কেনা কঠিন। আমরা বিকাশে পেমেন্ট নিয়ে,
              নিজে যাচাই করে পণ্য পৌঁছে দেওয়ার অভিজ্ঞতাকে সহজ করতে কাজ করছি।
            </p>
            <p>
              আমরা ছোট আকারে শুরু করেছি এবং প্রতিটি অর্ডার গুরুত্ব দিয়ে দেখি।
              আপনার নিরাপত্তা, পরিষ্কার তথ্য এবং নির্ভরযোগ্য সাপোর্ট আমাদের
              অগ্রাধিকার।
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
                আমি কীভাবে অর্ডার করব?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                পছন্দের প্ল্যান বেছে অর্ডার ফর্ম পূরণ করুন। দেখানো নম্বরে
                বিকাশে টাকা পাঠিয়ে TrxID জমা দিন।
              </p>
            </details>
            <details>
              <summary>
                কত টাকা পাঠাতে হবে?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                অর্ডার ফর্মে যে সঠিক পরিমাণ দেখাবে, ঠিক সেই পরিমাণই পাঠান।
                কম বা বেশি পাঠালে যাচাই আটকে যেতে পারে।
              </p>
            </details>
            <details>
              <summary>
                আপনারা কি আমার পাসওয়ার্ড চাইবেন?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                না, কখনোই না। কেউ VEXORA-র নাম ব্যবহার করে পাসওয়ার্ড চাইলে
                দেবেন না এবং আমাদের জানান।
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="vexora-bottom-cta">
        <div className="vexora-container vexora-bottom-cta-inner">
          <div>
            <p className="vexora-eyebrow">READY WHEN YOU ARE</p>
            <h2>আপনার ডিজিটাল অভিজ্ঞতা শুরু হোক</h2>
            <p>প্ল্যান দেখুন, অর্ডারের অবস্থা জানুন—সবকিছু এক জায়গায়।</p>
          </div>
          <div className="vexora-bottom-actions">
            <Link href="#plans" className="vexora-button vexora-button-primary">
              প্ল্যান বেছে নিন <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/track-order" className="vexora-button vexora-button-secondary">
              Track order
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
