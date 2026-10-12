"use client";

import { useRef, useState } from "react";

/** UI preview only: no form submission, API calls, logging, or persistent storage. */
export function CheckoutPreview() {
  const fieldsRef = useRef<HTMLFieldSetElement>(null);
  const [message, setMessage] = useState<"" | "invalid" | "ready">("");

  function checkPreview() {
    const inputs = fieldsRef.current?.querySelectorAll("input");
    if (!inputs) return;

    for (const input of inputs) {
      if (!input.checkValidity() || (input.required && !input.value.trim())) {
        setMessage("invalid");
        input.focus();
        input.reportValidity();
        return;
      }
    }

    // Validity checks are local. Never serialize, transmit, or persist values.
    setMessage("ready");
  }

  return (
    <section className="checkout-form card-surface" aria-labelledby="customer-heading">
      <div className="form-heading">
        <span className="step-number">০১</span>
        <div><h2 id="customer-heading">আপনার তথ্য</h2><p>এই ডেমোতে শুধু নমুনা তথ্য ব্যবহার করুন।</p></div>
      </div>
      {/* A fieldset without a form or input names cannot natively submit PII. */}
      <fieldset ref={fieldsRef} onChange={() => setMessage("")}>
        <legend className="sr-only">চেকআউটের নমুনা তথ্য</legend>
        <div className="field">
          <label htmlFor="customer-name">নাম <span aria-hidden="true">*</span></label>
          <input id="customer-name" type="text" placeholder="নমুনা নাম"
            autoComplete="off" required minLength={2} maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="customer-email">ইমেইল <span aria-hidden="true">*</span></label>
          <input id="customer-email" type="email" placeholder="demo@example.com"
            autoComplete="off" required maxLength={254} dir="ltr" />
        </div>
        <div className="field">
          <label htmlFor="bkash-sender">bKash প্রেরকের নম্বর <span aria-hidden="true">*</span></label>
          <input id="bkash-sender" type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
            autoComplete="off" required pattern="01[3-9][0-9]{8}" maxLength={11}
            aria-describedby="sender-help" dir="ltr" />
          <p id="sender-help" className="field-help">ইংরেজি অঙ্কে ১১ সংখ্যার নমুনা দিন।</p>
        </div>
        <div className="field">
          <label htmlFor="whatsapp-number">WhatsApp নম্বর <span className="optional-label">(ঐচ্ছিক)</span></label>
          <input id="whatsapp-number" type="tel" inputMode="tel" placeholder="না দিলেও হবে"
            autoComplete="off" maxLength={16} dir="ltr" />
        </div>
      </fieldset>
      <p className="form-privacy">কোনো পাসওয়ার্ড, PIN বা OTP দেবেন না। তথ্য কোথাও পাঠানো বা সংরক্ষণ করা হবে না।</p>
      <button type="button" className="button button-primary button-full" onClick={checkPreview}>
        নমুনা ফর্ম যাচাই করুন
      </button>
      <div className={`form-message${message ? ` form-message-${message}` : ""}`} role="status" aria-live="polite" aria-atomic="true">
        {message === "invalid" && "প্রয়োজনীয় ঘরগুলো সঠিকভাবে পূরণ করুন।"}
        {message === "ready" && "নমুনা ফর্ম পূরণ হয়েছে। কোনো অর্ডার তৈরি হয়নি এবং কিছু পাঠানো হয়নি।"}
      </div>
      <noscript><p className="notice">নমুনা ফর্ম যাচাই করতে JavaScript চালু করুন। এখন কোনো অর্ডার নেওয়া হচ্ছে না।</p></noscript>
    </section>
  );
}
