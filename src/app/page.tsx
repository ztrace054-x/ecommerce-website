import Link from "next/link";
import { ArrowIcon, CheckIcon, ServiceIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { catalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";

const steps = [
  {
    number: "০১",
    title: "সেবা বেছে নিন",
    text: "কী পাবেন ও কত লাগবে, আগে দেখে নিন।",
  },
  {
    number: "০২",
    title: "পেমেন্ট যাচাই",
    text: "প্রতিটি bKash পেমেন্ট দাবি হাতে যাচাই করা হবে।",
  },
  {
    number: "০৩",
    title: "সেবা গ্রহণ করুন",
    text: "যাচাইয়ের পরে নির্বাচিত সেবা দেওয়া হবে।",
  },
];

const benefits = [
  { icon: "prompt", title: "বাংলায় সহজ সহায়তা", text: "AI টুলের ব্যবহার ও কাজের নিয়ম নিজের ভাষায় বুঝে নিন।" },
  { icon: "setup", title: "স্থানীয় পেমেন্ট", text: "সেবা চালু হলে আন্তর্জাতিক কার্ড ছাড়াই bKash দিয়ে পেমেন্ট করা যাবে।" },
  { icon: "website", title: "আগেই পরিষ্কার শর্ত", text: "সেবায় কী পাবেন, সময় ও ডেলিভারির ধরন প্ল্যানেই দেখে নিন।" },
  { icon: "chatbot", title: "অর্ডারের খবর জানুন", text: "ব্যক্তিগত অ্যাক্সেস কী দিয়ে পেমেন্ট যাচাই ও ডেলিভারির অবস্থা দেখুন।" },
] as const;

export default async function HomePage() {
  const { products, sample } = await catalog();
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="small-dot" /> সহজ শুরু, নিরাপদ ব্যবহার
            </p>
            <h1>
              AI সেবা নিন,
              <br />
              <span>সহজভাবে।</span>
            </h1>
            <p className="hero-description">
              সেটআপ থেকে নিজের ওয়েবসাইট—আপনার প্রয়োজনের AI সেবাটি বেছে নিন।
              স্থানীয় bKash পেমেন্ট, পরিষ্কার সেবার শর্ত ও যাচাইয়ের পরে
              ডেলিভারি।
            </p>
            <div className="hero-actions">
              <Link href="/products" className="button button-primary">
                সেবা ও প্ল্যান দেখুন <ArrowIcon />
              </Link>
              <Link href="/faq" className="text-link">
                কীভাবে কাজ করবে?
              </Link>
            </div>
            <p className="hero-safety">
              <CheckIcon /> কোনো অ্যাকাউন্টের পাসওয়ার্ড দিতে হবে না
            </p>
          </div>
          <div className="journey-card">
            <div className="journey-heading">
              <span className="service-icon">
                <ServiceIcon kind="prompt" />
              </span>
              <div>
                <span className="eyebrow">তিনটি সহজ ধাপ</span>
                <h2>শুরু থেকে সেবা পাওয়া</h2>
              </div>
            </div>
            <ol className="journey-steps">
              {steps.map((step) => (
                <li key={step.number}>
                  <span className="step-number">{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="journey-note">
              TrxID জমা দিলেই পেমেন্ট নিশ্চিত হয় না। প্রতিটি দাবি হাতে যাচাই করা
              হবে।
            </p>
          </div>
        </div>
      </section>

      <section
        className="container section-space"
        aria-labelledby="services-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">আপনার প্রয়োজন অনুযায়ী</p>
            <h2 id="services-heading">সেবা ও প্ল্যান</h2>
          </div>
          <span className="sample-pill">
            {sample ? "নমুনা সেবা · নমুনা মূল্য" : "সেবা ও মূল্য"}
          </span>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} sample={sample} />
          ))}
        </div>
        {products.length === 0 && (
          <p className="notice">নতুন সেবা শিগগিরই যুক্ত হবে।</p>
        )}
      </section>

      <section className="container section-space" aria-labelledby="benefits-heading">
        <div className="section-heading">
          <div><p className="eyebrow">বাংলাদেশের ব্যবহারকারীদের জন্য</p><h2 id="benefits-heading">আপনার কাজ, আপনার সুবিধা</h2></div>
        </div>
        <div className="benefit-grid">
          {benefits.map((benefit) => (
            <article className="benefit-card" key={benefit.title}>
              <span className="service-icon"><ServiceIcon kind={benefit.icon} /></span>
              <h3>{benefit.title}</h3><p>{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="container safety-strip"
        aria-label="নিরাপদ সেবার নিয়ম"
      >
        <div>
          <CheckIcon />
          <p>
            <strong>নিজের অ্যাকাউন্ট</strong>
            <span>শেয়ার করা লগইন নয়</span>
          </p>
        </div>
        <div>
          <CheckIcon />
          <p>
            <strong>পাসওয়ার্ড প্রয়োজন নেই</strong>
            <span>ব্যক্তিগত তথ্য নিরাপদ রাখুন</span>
          </p>
        </div>
        <div>
          <CheckIcon />
          <p>
            <strong>যাচাইয়ের পর ডেলিভারি</strong>
            <span>ম্যানুয়াল পেমেন্ট যাচাই</span>
          </p>
        </div>
      </section>

      <section className="container faq-callout">
        <div>
          <h2>কোনো প্রশ্ন আছে?</h2>
          <p>সেবা, পেমেন্ট ও নিরাপদ ব্যবহার সম্পর্কে সহজ উত্তর দেখুন।</p>
        </div>
        <Link href="/faq" className="button button-secondary">
          প্রশ্নোত্তর দেখুন <ArrowIcon />
        </Link>
      </section>
      <section
        className="container section-space"
        aria-labelledby="home-faq-heading"
      >
        <div className="section-heading">
          <h2 id="home-faq-heading">শুরু করার আগে</h2>
          <Link href="/track-order" className="text-link">
            অর্ডার ট্র্যাক করুন
          </Link>
        </div>
        <div className="faq-list">
          <details>
            <summary>
              পেমেন্টের পরে কী হবে?<span aria-hidden="true">+</span>
            </summary>
            <p>
              লেনদেনের তথ্য জমা দিন। অ্যাডমিন নিজের bKash অ্যাপে পেমেন্ট মিলিয়ে
              দেখে নিশ্চিত করবেন। তারপর নির্বাচিত সেবা দেওয়া হবে।
            </p>
          </details>
          <details>
            <summary>
              অর্ডার ট্র্যাক করতে কি পাসওয়ার্ড লাগবে?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              নতুন অ্যাকাউন্ট খুলতে হবে না। অর্ডার কোড, আপনার ইমেইল ও অর্ডারের
              ব্যক্তিগত অ্যাক্সেস কী দিয়ে অবস্থা দেখা যাবে।
            </p>
          </details>
        </div>
      </section>
      <section className="container home-cta" aria-labelledby="home-cta-heading">
        <div>
          <p className="eyebrow">আপনার প্রয়োজন থেকেই শুরু</p>
          <h2 id="home-cta-heading">কোন AI সেবাটি আপনার কাজে লাগবে?</h2>
          <p>প্রতিটি প্ল্যানের কাজ, সময় ও ডেলিভারির তথ্য তুলনা করে দেখুন। শুরু করার আগে সেবার শর্ত ও নীতিগুলো পড়ে নিন।</p>
        </div>
        <Link href="/products" className="button button-primary">সব সেবা দেখুন <ArrowIcon /></Link>
      </section>
    </>
  );
}
