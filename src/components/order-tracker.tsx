"use client";
import { useState, type FormEvent } from "react";
import type { PublicOrder } from "@/lib/domain";
import { statusLabels } from "@/lib/domain";
import { formatPoisha } from "@/lib/format";
import { browserApi, errorMessage } from "@/lib/browser-api";
export function OrderTracker({ available }: { available: boolean }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setOrder(null);
    setBusy(true);
    setMessage("");
    try {
      const data = await browserApi<{ order: PublicOrder }>(
        "/api/orders/track",
        {
          orderCode: form.get("orderCode"),
          customerEmail: form.get("customerEmail"),
          accessKey: form.get("accessKey"),
        },
      );
      setOrder(data.order);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="tracking-grid">
      <section className="card-surface checkout-form">
        <h2>অর্ডারের তথ্য দিন</h2>
        <p>অর্ডার জমা দেওয়ার পরে পাওয়া কোড ও ব্যক্তিগত কী ব্যবহার করুন।</p>
        {!available && (
          <p className="notice">
            অর্ডার ট্র্যাকিং এখনও চালু হয়নি। এখন কোনো ব্যক্তিগত তথ্য জমা দেবেন
            না।
          </p>
        )}
        <form onSubmit={submit} method="post" action="/api/orders/track">
          <fieldset disabled={busy || !available}>
            <legend className="sr-only">অর্ডার যাচাই</legend>
            <div className="field">
              <label htmlFor="track-code">অর্ডার কোড *</label>
              <input
                name="orderCode"
                id="track-code"
                placeholder="ORD-XXXXXXXX"
                required
                maxLength={12}
                pattern="ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]{8}"
                dir="ltr"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="track-email">অর্ডারে দেওয়া ইমেইল *</label>
              <input
                name="customerEmail"
                id="track-email"
                type="email"
                required
                maxLength={254}
                dir="ltr"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="track-key">ব্যক্তিগত অ্যাক্সেস কী *</label>
              <input
                name="accessKey"
                id="track-key"
                type="password"
                required
                minLength={64}
                maxLength={64}
                pattern="[a-f0-9]{64}"
                dir="ltr"
                autoComplete="off"
                aria-describedby="key-help"
              />
              <p id="key-help" className="field-help">
                এই কী অন্য কাউকে দেবেন না। এটি আপনার AI অ্যাকাউন্টের পাসওয়ার্ড
                নয়।
              </p>
            </div>
          </fieldset>
          <button
            className="button button-primary button-full"
            disabled={busy || !available}
          >
            {busy ? "খোঁজা হচ্ছে…" : "অর্ডারের অবস্থা দেখুন"}
          </button>
        </form>
        <p
          role="status"
          aria-live="polite"
          className="form-message form-message-invalid"
        >
          {message}
        </p>
      </section>
      <section className="summary-card" aria-live="polite" aria-atomic="true">
        {order ? (
          <>
            <span className={`status-pill status-${order.status}`}>
              {statusLabels[order.status]}
            </span>
            <h2>{order.productName}</h2>
            <p dir="ltr">{order.orderCode}</p>
            <strong className="detail-price">
              {formatPoisha(order.amountPoisha)}
            </strong>
            <ol className="order-timeline">
              <li className="complete">
                <strong>পেমেন্ট দাবি জমা</strong>
                <span>
                  {new Date(order.createdAt).toLocaleString("bn-BD", {
                    timeZone: "Asia/Dhaka",
                  })}
                </span>
              </li>
              <li className={order.verifiedAt ? "complete" : ""}>
                <strong>ম্যানুয়াল যাচাই</strong>
                <span>
                  {order.verifiedAt
                    ? new Date(order.verifiedAt).toLocaleString("bn-BD", {
                        timeZone: "Asia/Dhaka",
                      })
                    : "অ্যাডমিন পেমেন্ট মিলিয়ে দেখবেন"}
                </span>
              </li>
              <li className={order.deliveredAt ? "complete" : ""}>
                <strong>সেবা ডেলিভারি</strong>
                <span>
                  {order.deliveredAt
                    ? new Date(order.deliveredAt).toLocaleString("bn-BD", {
                        timeZone: "Asia/Dhaka",
                      })
                    : "যাচাইয়ের পরে সেবা দেওয়া হবে"}
                </span>
              </li>
            </ol>
            {order.customerMessage && (
              <div className="notice">
                <strong>আপনার জন্য বার্তা</strong>
                <p>{order.customerMessage}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="eyebrow">আপনার অর্ডার, আপনার নিয়ন্ত্রণে</span>
            <h2>প্রতিটি ধাপ জানুন</h2>
            <p>
              পেমেন্ট জমা, যাচাই ও ডেলিভারির অবস্থা এখানে দেখা যাবে। আপনার
              ব্যক্তিগত যোগাযোগের তথ্য এখানে দেখানো হবে না।
            </p>
            <div className="tracking-state-preview">
              <span>পেমেন্ট দাবি</span>
              <span>হাতে যাচাই</span>
              <span>সেবা ডেলিভারি</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
