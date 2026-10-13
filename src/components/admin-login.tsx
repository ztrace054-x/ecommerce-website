"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserApi, errorMessage } from "@/lib/browser-api";
export function AdminLogin({ available }: { available: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await browserApi("/api/admin/auth/login", {
        email: fields.get("email"),
        password: fields.get("password"),
        mfaCode: fields.get("mfaCode"),
      });
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card-surface checkout-form admin-login">
      <span className="eyebrow">শুধু অনুমোদিত অ্যাডমিনের জন্য</span>
      <h1>অ্যাডমিন লগইন</h1>
      <p>অর্ডার যাচাই, সেবা ব্যবস্থাপনা ও ডেলিভারি আপডেট করুন।</p>
      {!available && (
        <p className="notice">
          অ্যাডমিন লগইন এখনও চালু হয়নি। কনফিগার করার পরে অনুমোদিত অ্যাডমিন এখানে
          লগইন করতে পারবেন।
        </p>
      )}
      <form onSubmit={submit} method="post" action="/api/admin/auth/login">
        <fieldset disabled={busy || !available}>
          <legend className="sr-only">অ্যাডমিন লগইন তথ্য</legend>
          <div className="field">
            <label htmlFor="admin-email">অ্যাডমিন ইমেইল</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              maxLength={254}
              dir="ltr"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-password">পাসওয়ার্ড</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              required
              maxLength={128}
              dir="ltr"
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-mfa">অথেনটিকেটর কোড</label>
            <input id="admin-mfa" name="mfaCode" type="text" required inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} dir="ltr" autoComplete="one-time-code" />
            <p className="field-hint">অ্যাডমিনের অথেনটিকেটর অ্যাপের ৬ সংখ্যার কোড দিন।</p>
          </div>
        </fieldset>
        <button
          className="button button-primary button-full"
          disabled={busy || !available}
        >
          {busy ? "লগইন হচ্ছে…" : "লগইন করুন"}
        </button>
      </form>
      <p
        className="form-message form-message-invalid"
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </section>
  );
}
