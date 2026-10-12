import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container empty-page">
      <p className="eyebrow">৪০৪</p>
      <h1>পেজটি পাওয়া যায়নি</h1>
      <p>লিংকটি ঠিক আছে কি না দেখুন, অথবা সেবার তালিকায় ফিরে যান।</p>
      <Link href="/products" className="button button-primary">সেবা ও প্ল্যান দেখুন</Link>
    </section>
  );
}
