"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="container empty-page">
      <p className="eyebrow">আবার চেষ্টা করুন</p>
      <h1>পেজটি এখন খোলা যায়নি</h1>
      <p>সাময়িক সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।</p>
      <button type="button" className="button button-primary" onClick={reset}>
        আবার চেষ্টা করুন
      </button>
    </section>
  );
}
