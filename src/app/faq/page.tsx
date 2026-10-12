import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "সাধারণ প্রশ্নোত্তর" };

const questions = [
  { question: "এখানে কী ধরনের সেবা আছে?", answer: "এখন AI সেটআপ, প্রম্পট শেখা, চ্যাটবট ও ওয়েবসাইট তৈরির নমুনা প্ল্যান আছে। এগুলো দেখার জন্য রাখা হয়েছে; বাস্তব অফার এখনও চালু হয়নি।" },
  { question: "এখন কি অর্ডার বা পেমেন্ট করতে পারব?", answer: "না। এটি একটি ডেমো সাইট। চেকআউটে নমুনা তথ্য লেখা যাবে, কিন্তু অর্ডার তৈরি হবে না এবং কোনো পেমেন্ট নেওয়া হবে না।" },
  { question: "চালু হলে bKash পেমেন্ট কীভাবে যাচাই হবে?", answer: "নিশ্চিত মূল্য ও প্রাপকের নম্বর দেখানোর পরে পেমেন্ট করা যাবে। TrxID জমা দেওয়ার পরে প্রশাসক নিজের bKash অ্যাপে লেনদেন মিলিয়ে দেখবেন। যাচাই না হওয়া পর্যন্ত সেবা দেওয়া হবে না।" },
  { question: "আমার অ্যাকাউন্টের পাসওয়ার্ড দিতে হবে?", answer: "না। আপনার অ্যাকাউন্টের পাসওয়ার্ড, bKash PIN বা OTP কখনো দিতে হবে না। কোনো শেয়ার করা লগইন বা তৈরি অ্যাকাউন্ট বিক্রি করা হবে না।" },
  { question: "দেখানো মূল্য কি চূড়ান্ত?", answer: "না। সব মূল্য নমুনা। বাস্তব সেবা চালু হলে কাজের পরিধি ও চূড়ান্ত মূল্য জানানো হবে। এখন নমুনা মূল্য দেখে টাকা পাঠাবেন না।" },
  { question: "অর্থ ফেরত বা যোগাযোগের নিয়ম কোথায় পাব?", answer: "নিচের লিংকগুলোতে খসড়া নীতি ও যোগাযোগের বর্তমান অবস্থা দেখতে পারবেন। বাস্তব অর্ডার নেওয়ার আগে চূড়ান্ত নীতি ও যোগাযোগের মাধ্যম প্রকাশ করা হবে।" },
];

export default function FAQPage() {
  return (
    <section className="container prose-page faq-page">
      <p className="eyebrow">সহজ উত্তর, পরিষ্কার ধারণা</p>
      <h1>সাধারণ প্রশ্নোত্তর</h1>
      <p className="page-intro">প্রশ্নের ওপর চাপ দিয়ে উত্তরটি পড়ুন।</p>
      <div className="faq-list">
        {questions.map((item) => (
          <details key={item.question}>
            <summary>{item.question}<span aria-hidden="true">+</span></summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      <div className="faq-policy-links"><Link href="/refund">অর্থ ফেরত নীতি</Link><Link href="/privacy">গোপনীয়তা</Link><Link href="/terms">শর্তাবলি</Link><Link href="/contact">যোগাযোগ</Link></div>
    </section>
  );
}
