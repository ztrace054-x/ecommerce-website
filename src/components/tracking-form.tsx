"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { TrackingView } from "../lib/orders/tracking-view";
import { TurnstileChallenge } from "./turnstile-challenge";
import { takeTrackingCode } from "./tracking-handoff";
export function TrackingForm({ nonce, siteKey, whatsappNumber }: { nonce: string; siteKey: string; whatsappNumber: string }) {
  const [code, setCode] = useState("");
  const [last4, setLast4] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<TrackingView | null>(null);
  const [errors, setErrors] = useState({ code: "", last4: "" });
  useEffect(() => { setCode(takeTrackingCode()); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const nextErrors = { code: /^ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(code.trim()) ? "" : "সঠিক অর্ডার কোড দিন / Enter a valid order code.", last4: /^\d{4}$/.test(last4) ? "" : "ঠিক ৪ অঙ্ক দিন / Enter exactly 4 digits." };
    setErrors(nextErrors);setResult(null);setMessage("");
    if (nextErrors.code || nextErrors.last4 || !token) return;
    setSending(true);
    try {
      const response = await fetch("/api/orders/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderCode: code.trim(), last4, turnstileToken: token }), cache: "no-store" });
      const body = await response.json();
      if (response.ok) setResult(body);
      else if (response.status === 429) setMessage(`অনুগ্রহ করে অপেক্ষা করুন / Please wait ${response.headers.get("Retry-After") ?? "900"} seconds before retrying.`);
      else if (response.status === 404) setMessage("অর্ডার পাওয়া যায়নি। কোড ও শেষ ৪ অঙ্ক যাচাই করুন। Order not found. Check your order code and the last 4 digits.");
      else setMessage(body.error?.message ?? "অর্ডার দেখা যাচ্ছে না / Unable to look up order.");
    } catch { setMessage("সংযোগ হয়নি / Connection failed. Try again later."); }
    finally { setSending(false);setLast4("");setToken("");setResetKey(value => value + 1); }
  }
  const progress = ["submitted", "verified", "delivered"];
  return <section className="card-surface checkout-form">
    <form onSubmit={submit} noValidate>
      <fieldset disabled={sending}>
        <div className="field"><label htmlFor="track-code">অর্ডার কোড / Order code</label><input id="track-code" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }} maxLength={64} autoComplete="off" spellCheck={false} aria-invalid={!!errors.code} aria-describedby="track-code-error" /><p id="track-code-error" role="alert">{errors.code}</p></div>
        <div className="field"><label htmlFor="track-last4">bKash নম্বরের শেষ ৪ অঙ্ক / Last 4 digits</label><input id="track-last4" value={last4} onChange={e => { setLast4(e.target.value); setResult(null); }} inputMode="numeric" maxLength={4} autoComplete="off" aria-invalid={!!errors.last4} aria-describedby="track-last4-error" /><p id="track-last4-error" role="alert">{errors.last4}</p></div>
      </fieldset>
      <TurnstileChallenge nonce={nonce} siteKey={siteKey} action="track" onToken={setToken} resetKey={resetKey} />
      <button type="submit" className="button button-primary" disabled={sending || !token}>{sending ? "খোঁজা হচ্ছে / Looking up…" : "অর্ডার দেখুন / Find order"}</button>
      <p role="alert">{message}</p>
    </form>
    {result && <section aria-live="polite" className="tracking-result"><h2>{result.orderCode}</h2><p>{result.productName}</p><p>৳{result.amountExpected}</p><p><time dateTime={result.createdAt}>{new Date(result.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} (Bangladesh time)</time></p><p>{result.message.bn}</p><p>{result.message.en}</p>
      {progress.includes(result.status) ? <ol aria-label="অর্ডারের ধাপ / Order progress">{progress.map((step, index) => <li key={step} aria-current={step === result.status ? "step" : undefined}>{["জমা / Submitted", "যাচাই / Verified", "ডেলিভারি / Delivered"][index]}{index <= progress.indexOf(result.status) ? " ✓" : ""}</li>)}</ol> : <p>{result.status === "rejected" ? "প্রত্যাখ্যাত / Rejected" : "ফেরত / Refunded"}</p>}
      <a className="button button-primary" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Please help with order ${result.orderCode}.`)}`} rel="noreferrer">WhatsApp-এ যোগাযোগ / Contact us on WhatsApp</a>
    </section>}
  </section>;
}
