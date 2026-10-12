import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/icons";

export const metadata: Metadata = { title: "যোগাযোগ" };

export default function ContactPage() {
  return (
    <section className="container prose-page contact-page">
      <p className="eyebrow">আমরা কীভাবে সাহায্য করতে পারি?</p>
      <h1>যোগাযোগ</h1>
      <p className="page-intro">সেবা ও নিরাপদ ব্যবহার সম্পর্কে জানতে আগে প্রশ্নোত্তর দেখুন। আসল যোগাযোগের মাধ্যম চালুর আগে এখানে জানানো হবে।</p>
      <div id="whatsapp" className="contact-card">
        <span className="contact-icon"><WhatsAppIcon /></span>
        <div><h2>WhatsApp যোগাযোগ</h2><p>WhatsApp নম্বর এখনও যুক্ত হয়নি। তাই এখন কোনো চ্যাট খোলা বা মেসেজ পাঠানো যাবে না।</p><span className="sample-pill">যোগাযোগ চালু হয়নি</span></div>
      </div>
      <div className="prose-content">
        <section><h2>ইমেইল</h2><p>সাপোর্ট ইমেইল এখনও যুক্ত হয়নি। কোনো নমুনা বা অনুমান করা ঠিকানায় ব্যক্তিগত তথ্য পাঠাবেন না।</p></section>
        <section><h2>আপনার নিরাপত্তা</h2><p>কাউকে পাসওয়ার্ড, bKash PIN বা OTP দেবেন না। সেবা চালু হলে যোগাযোগের ঠিকানা ও পেমেন্টের নির্দেশনা এই সাইটে জানানো হবে।</p></section>
      </div>
      <Link className="button button-secondary" href="/faq">সাধারণ প্রশ্নের উত্তর দেখুন</Link>
    </section>
  );
}
