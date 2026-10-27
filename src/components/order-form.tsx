"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { TurnstileChallenge } from "./turnstile-challenge";
import { rememberTrackingCode } from "./tracking-handoff";
type Props = { productId: string; siteKey: string; nonce: string };
export function OrderForm({ productId, siteKey, nonce }: Props) {
  const [resetKey, setResetKey] = useState(0);
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ orderCode: string; amountExpected: number; whatsappLink: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || result || !token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true); setMessage(""); setErrors({});
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, customerName: data.get("customerName"), customerEmail: data.get("customerEmail"), senderBkashNumber: data.get("senderBkashNumber"), ...(data.get("whatsapp") ? { whatsapp: data.get("whatsapp") } : {}), trxId: data.get("trxId"), turnstileToken: token }) });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error?.message ?? "অর্ডার পাঠানো যায়নি।");
        setErrors(body.error?.fields ?? {});
      } else { setResult(body); form.reset(); }
    } catch { setMessage("সংযোগ হয়নি। আবার চেষ্টা করুন।"); }
    finally { setSending(false); setToken(""); setResetKey(value => value + 1); }
  }
  return <section className="checkout-form card-surface">

    {result ? <div role="status"><h2>অর্ডার জমা হয়েছে</h2><p>{result.orderCode}</p><p>প্রত্যাশিত মূল্য: ৳{result.amountExpected}</p><p>এখনও পেমেন্ট যাচাই হয়নি। প্রশাসক নিজে যাচাই করবেন।</p><a className="button button-primary" href={result.whatsappLink} rel="noreferrer">Confirm on WhatsApp</a><p><Link href="/track" onClick={() => rememberTrackingCode(result.orderCode)}>অর্ডার ট্র্যাক করুন / Track {result.orderCode}</Link></p></div> :
      <form onSubmit={submit}>
        <h2>আপনার তথ্য ও পেমেন্ট দাবি</h2>
        <fieldset disabled={sending}>
          {([
            ["customerName", "নাম", "text", 80], ["customerEmail", "ইমেইল", "email", 254],
            ["senderBkashNumber", "bKash প্রেরকের নম্বর", "tel", 20], ["whatsapp", "WhatsApp নম্বর (ঐচ্ছিক)", "tel", 20],
            ["trxId", "bKash TrxID", "text", 64],
          ] as const).map(([name, label, type, maxLength]) => <div className="field" key={name}>
            <label htmlFor={name}>{label}</label><input id={name} name={name} type={type} maxLength={maxLength} minLength={name === "customerName" ? 2 : undefined} required={name !== "whatsapp"} autoComplete="off" aria-invalid={!!errors[name]} aria-describedby={`${name}-error`} />
            <p id={`${name}-error`} role="alert">{errors[name]}</p>
          </div>)}
        </fieldset>
        <p>পাসওয়ার্ড, PIN বা OTP দেবেন না। জমা দেওয়া দাবি পেমেন্টের প্রমাণ নয়।</p>
        <TurnstileChallenge siteKey={siteKey} nonce={nonce} action="order" onToken={setToken} resetKey={resetKey} />
        <button type="submit" className="button button-primary" disabled={sending || !token}>{sending ? "পাঠানো হচ্ছে…" : "পেমেন্ট দাবি জমা দিন"}</button>
        <p role="alert">{message}</p>
      </form>}
  </section>;
}
