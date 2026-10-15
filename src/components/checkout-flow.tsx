"use client";
import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import type { Product } from "@/lib/domain";
import { formatPoisha } from "@/lib/format";
import { browserApi, errorMessage } from "@/lib/browser-api";
import { CheckoutPreview } from "./checkout-preview";
import { ServiceIcon, CheckIcon } from "./icons";
import { Turnstile } from "./turnstile";
type Quote = {
  quoteToken: string;
  orderCode: string;
  product: Product;
  amountPoisha: number;
  recipient: string;
  paymentMethod: string;
  expiresAt: string;
};
export function CheckoutFlow({
  product,
  ordersOpen,
  siteKey,
  sample,
}: {
  product: Product;
  ordersOpen: boolean;
  siteKey: string;
  sample: boolean;
}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  const [result, setResult] = useState<{
    order: { orderCode: string; status: string };
    accessKey: string;
  } | null>(null);
  const onToken = useCallback((value: string) => setToken(value), []);
  async function startQuote() {
    setBusy(true);
    setMessage("");
    try {
      const data = await browserApi<{ quote: Quote }>("/api/orders/quote", {
        productId: product.id,
      });
      setQuote(data.quote);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      setResult(
        await browserApi("/api/orders", {
          quoteToken: quote.quoteToken,
          customerName: fields.get("customerName"),
          customerEmail: fields.get("customerEmail"),
          bkashSender: fields.get("bkashSender"),
          whatsapp: fields.get("whatsapp") ?? "",
          trxId: fields.get("trxId"),
          turnstileToken: token,
          acceptedTerms: fields.get("terms") === "on",
        }),
      );
    } catch (e) {
      setMessage(errorMessage(e));
      setToken("");
      setChallenge((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  async function copyReceipt() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        `Order: ${result.order.orderCode}\nAccess key: ${result.accessKey}`,
      );
      setMessage("অর্ডার কোড ও অ্যাক্সেস কী কপি হয়েছে। নিরাপদে রাখুন।");
    } catch {
      setMessage("নিচের কোড ও অ্যাক্সেস কী নির্বাচন করে কপি করুন।");
    }
  }
  const selected = quote?.product ?? product;
  return (
    <div className="checkout-grid">
      {result ? (
        <section
          className="card-surface checkout-form"
          aria-labelledby="success-heading"
        >
          <span className="success-mark">
            <CheckIcon />
          </span>
          <h2 id="success-heading">পেমেন্টের তথ্য জমা হয়েছে</h2>
          <p>
            পেমেন্ট এখনও নিশ্চিত হয়নি। অ্যাডমিন bKash লেনদেন যাচাই করার পরে
            অর্ডারের অবস্থা বদলাবে।
          </p>
          <div className="receipt-box">
            <span>অর্ডার কোড</span>
            <strong dir="ltr">{result.order.orderCode}</strong>
            <span>ব্যক্তিগত অ্যাক্সেস কী</span>
            <code dir="ltr">{result.accessKey}</code>
          </div>
          <p className="notice">
            এই কী এখনই নিরাপদে রাখুন। পেজ বন্ধ করলে এখানে আর দেখা যাবে না।
            অর্ডার ট্র্যাক করতে কোড, আপনার ইমেইল ও এই কী লাগবে।
          </p>
          <button
            type="button"
            className="button button-primary button-full"
            onClick={copyReceipt}
          >
            কোড ও কী কপি করুন
          </button>
          <Link
            href="/track-order"
            className="button button-secondary button-full"
          >
            অর্ডার ট্র্যাক করুন
          </Link>
          <p role="status" className="form-message">
            {message}
          </p>
        </section>
      ) : !ordersOpen ? (
        <div>
          <div className="notice checkout-closed">
            <strong>অর্ডার এখন বন্ধ</strong>
            <p>
              কোনো টাকা পাঠাবেন না। নিচের ফর্মে শুধু নমুনা তথ্য দিয়ে অভিজ্ঞতাটি
              দেখতে পারেন।
            </p>
          </div>
          <CheckoutPreview />
        </div>
      ) : (
        <section className="card-surface checkout-form">
          <div className="form-heading">
            <span className="step-number">০১</span>
            <div>
              <h2>নিশ্চিত মূল্য ও পেমেন্ট</h2>
              <p>প্রথমে পেমেন্ট নির্দেশনা নিন।</p>
            </div>
          </div>
          {!quote ? (
            <>
              <p>
                সার্ভার নির্বাচিত সেবার মূল্য নিশ্চিত করে অর্ডার কোড ও bKash
                নির্দেশনা দেখাবে।
              </p>
              <button
                type="button"
                className="button button-primary button-full"
                disabled={busy}
                onClick={startQuote}
              >
                {busy ? "নির্দেশনা আনা হচ্ছে…" : "পেমেন্ট নির্দেশনা দেখুন"}
              </button>
            </>
          ) : (
            <>
              <div className="payment-card">
                <span>
                  bKash ·{" "}
                  {quote.paymentMethod === "payment" ? "Payment" : "Send Money"}
                </span>
                <strong dir="ltr">{quote.recipient}</strong>
                <p>
                  পাঠাবেন: <b>{formatPoisha(quote.amountPoisha)}</b>
                </p>
                <p>
                  অর্ডার কোড: <b dir="ltr">{quote.orderCode}</b>
                </p>
                <small>
                  নির্দেশনার মেয়াদ:{" "}
                  {new Date(quote.expiresAt).toLocaleString("bn-BD", {
                    timeZone: "Asia/Dhaka",
                  })}
                </small>
              </div>
              <p className="field-help">
                bKash অ্যাপ থেকে উপরের নম্বর ও পরিমাণ মিলিয়ে পেমেন্ট করুন। তারপর
                পাওয়া TrxID দিন। PIN বা OTP দেবেন না। তথ্য জমা হওয়া পর্যন্ত এই
                পেজ বন্ধ করবেন না এবং অর্ডার কোড রেখে দিন।
              </p>
              <div className="form-heading">
                <span className="step-number">০২</span>
                <div>
                  <h2>আপনার তথ্য ও TrxID</h2>
                  <p>পেমেন্টের দাবি হাতে যাচাই হবে।</p>
                </div>
              </div>
              <form onSubmit={submit} method="post" action="/api/orders">
                <fieldset disabled={busy}>
                  <legend className="sr-only">গ্রাহক ও পেমেন্টের তথ্য</legend>
                  <div className="field">
                    <label htmlFor="order-name">আপনার নাম *</label>
                    <input
                      id="order-name"
                      name="customerName"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="order-email">ইমেইল *</label>
                    <input
                      id="order-email"
                      name="customerEmail"
                      type="email"
                      required
                      maxLength={254}
                      dir="ltr"
                      autoComplete="email"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="order-whatsapp">
                      WhatsApp নম্বর (ঐচ্ছিক)
                    </label>
                    <input
                      id="order-whatsapp"
                      name="whatsapp"
                      type="tel"
                      maxLength={16}
                      dir="ltr"
                      placeholder="+8801XXXXXXXXX"
                      autoComplete="tel"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="order-sender">bKash প্রেরকের নম্বর *</label>
                    <input
                      id="order-sender"
                      name="bkashSender"
                      type="tel"
                      inputMode="numeric"
                      required
                      pattern="01[3-9][0-9]{8}"
                      maxLength={11}
                      dir="ltr"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="order-trx">Transaction ID (TrxID) *</label>
                    <input
                      id="order-trx"
                      name="trxId"
                      required
                      pattern="[A-Za-z0-9]{10}"
                      minLength={10}
                      maxLength={10}
                      dir="ltr"
                      autoComplete="off"
                      aria-describedby="trx-help"
                    />
                    <p id="trx-help" className="field-help">
                      bKash লেনদেনের অক্ষর ও সংখ্যা যেমন আছে তেমন দিন। এটি জমা
                      দিলেই পেমেন্ট নিশ্চিত হয় না।
                    </p>
                  </div>
                  <label className="checkbox-label">
                    <input name="terms" type="checkbox" required />{" "}
                    <span>
                      আমি{" "}
                      <Link href="/terms" className="text-link">
                        শর্ত
                      </Link>
                      ,{" "}
                      <Link href="/privacy" className="text-link">
                        গোপনীয়তা
                      </Link>{" "}
                      ও{" "}
                      <Link href="/refund" className="text-link">
                        অর্থ ফেরত নীতি
                      </Link>{" "}
                      পড়েছি।
                    </span>
                  </label>
                </fieldset>
                <Turnstile
                  key={challenge}
                  siteKey={siteKey}
                  onToken={onToken}
                />
                <button
                  type="submit"
                  className="button button-primary button-full"
                  disabled={busy || !token}
                >
                  {busy ? "তথ্য জমা হচ্ছে…" : "পেমেন্টের তথ্য জমা দিন"}
                </button>
              </form>
              <noscript>
                <p className="notice">অর্ডার জমা দিতে JavaScript চালু করুন।</p>
              </noscript>
            </>
          )}
          <p
            role="status"
            aria-live="polite"
            className="form-message form-message-invalid"
          >
            {message}
          </p>
        </section>
      )}
      <aside
        className="summary-card checkout-summary"
        aria-labelledby="summary-heading"
      >
        <h2 id="summary-heading">নির্বাচিত সেবা</h2>
        <div className="selected-product">
          <span className="service-icon">
            <ServiceIcon kind={selected.icon} />
          </span>
          <div>
            <h3>{selected.name}</h3>
            <p>{selected.unit}</p>
          </div>
        </div>
        <div className="summary-divider" />
        <div className="price-row">
          <span>
            {sample ? "নমুনা মূল্য" : quote ? "নিশ্চিত মূল্য" : "বর্তমান মূল্য"}
          </span>
          <strong>
            {formatPoisha(quote?.amountPoisha ?? selected.pricePoisha)}
          </strong>
        </div>
        <dl className="summary-facts">
          <div>
            <dt>সময়</dt>
            <dd>{selected.duration}</dd>
          </div>
          <div>
            <dt>ডেলিভারি</dt>
            <dd>{selected.deliveryMethod}</dd>
          </div>
        </dl>
        <p className="summary-note">{selected.deliveryNote}</p>
        <p className="summary-note">
          কোনো পাসওয়ার্ড, PIN বা OTP লাগবে না। পেমেন্ট যাচাইয়ের পরে সেবা দেওয়া
          হবে।
        </p>
        <Link href="/refund" className="text-link">
          অর্থ ফেরত নীতি দেখুন
        </Link>
      </aside>
    </div>
  );
}
