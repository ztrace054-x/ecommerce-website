import Link from "next/link";
import { ArrowIcon, CheckIcon, ServiceIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { mockProducts } from "@/data/mock-products";

const steps = [
  { number: "০১", title: "সেবা বেছে নিন", text: "কী পাবেন ও কত লাগবে, আগে দেখে নিন।" },
  { number: "০২", title: "পেমেন্ট যাচাই", text: "চালু হলে bKash পেমেন্ট হাতে যাচাই করা হবে।" },
  { number: "০৩", title: "সেবা গ্রহণ করুন", text: "যাচাইয়ের পরে নির্বাচিত সেবা দেওয়া হবে।" },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span className="small-dot" /> সহজ শুরু, নিরাপদ ব্যবহার</p>
            <h1>AI সেবা নিন,<br /><span>সহজভাবে।</span></h1>
            <p className="hero-description">সেটআপ থেকে নিজের ওয়েবসাইট—আপনার প্রয়োজনের সেবাটি বেছে নিন। কী পাবেন, আগে পরিষ্কারভাবে জেনে নিন।</p>
            <div className="hero-actions">
              <Link href="/products" className="button button-primary">সেবা ও প্ল্যান দেখুন <ArrowIcon /></Link>
              <Link href="/faq" className="text-link">কীভাবে কাজ করবে?</Link>
            </div>
            <p className="hero-safety"><CheckIcon /> কোনো অ্যাকাউন্টের পাসওয়ার্ড দিতে হবে না</p>
          </div>
          <div className="journey-card">
            <div className="journey-heading">
              <span className="service-icon"><ServiceIcon kind="prompt" /></span>
              <div><span className="eyebrow">তিনটি সহজ ধাপ</span><h2>শুরু থেকে সেবা পাওয়া</h2></div>
            </div>
            <ol className="journey-steps">
              {steps.map((step) => (
                <li key={step.number}>
                  <span className="step-number">{step.number}</span>
                  <div><h3>{step.title}</h3><p>{step.text}</p></div>
                </li>
              ))}
            </ol>
            <p className="journey-note">চালু হওয়ার পর এই ধাপগুলো অনুসরণ করা যাবে।</p>
          </div>
        </div>
      </section>

      <section className="container section-space" aria-labelledby="services-heading">
        <div className="section-heading">
          <div><p className="eyebrow">আপনার প্রয়োজন অনুযায়ী</p><h2 id="services-heading">সেবা ও প্ল্যান</h2></div>
          <span className="sample-pill">নমুনা সেবা · নমুনা মূল্য</span>
        </div>
        <div className="product-grid">{mockProducts.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      </section>

      <section className="container safety-strip" aria-label="নিরাপদ সেবার নিয়ম">
        <div><CheckIcon /><p><strong>নিজের অ্যাকাউন্ট</strong><span>শেয়ার করা লগইন নয়</span></p></div>
        <div><CheckIcon /><p><strong>পাসওয়ার্ড প্রয়োজন নেই</strong><span>ব্যক্তিগত তথ্য নিরাপদ রাখুন</span></p></div>
        <div><CheckIcon /><p><strong>যাচাইয়ের পর ডেলিভারি</strong><span>ম্যানুয়াল পেমেন্ট যাচাই</span></p></div>
      </section>

      <section className="container faq-callout">
        <div><h2>কোনো প্রশ্ন আছে?</h2><p>সেবা, পেমেন্ট ও নিরাপদ ব্যবহার সম্পর্কে সহজ উত্তর দেখুন।</p></div>
        <Link href="/faq" className="button button-secondary">প্রশ্নোত্তর দেখুন <ArrowIcon /></Link>
      </section>
    </>
  );
}
