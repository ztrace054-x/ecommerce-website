"use client";

/** Never render or log the server error, SQL, customer data, or environment values. */
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="container empty-page">
      <h1>সেবার তালিকা এখন দেখা যাচ্ছে না</h1>
      <p>কিছুক্ষণ পরে আবার চেষ্টা করুন। এখন কোনো অর্ডার বা পেমেন্ট নেওয়া হচ্ছে না।</p>
      <button className="button button-primary" type="button" onClick={reset}>আবার চেষ্টা করুন</button>
    </section>
  );
}
