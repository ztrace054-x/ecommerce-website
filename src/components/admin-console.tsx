"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { browserApi, errorMessage } from "@/lib/browser-api";
import type { AdminOrder, Product, OrderStatus } from "@/lib/domain";
import { statusLabels } from "@/lib/domain";
import { formatPoisha } from "@/lib/format";
type Overview = {
  total: number;
  submitted: number;
  verified: number;
  delivered: number;
  rejected: number;
  deliveredPoisha: number;
};
type Audit = {
  id: string;
  actorId: string | null;
  action: string;
  targetId?: string | null;
  createdAt: string;
  details: Record<string, unknown>;
};
type Detail = {
  order: AdminOrder;
  notes: { id: string; note: string; actorId: string; createdAt: string }[];
  audit: Audit[];
};
const date = (v: string) =>
  new Date(v).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
export function AdminConsole() {
  const [auth, setAuth] = useState<"loading" | "ready" | "login">("loading");
  const [tab, setTab] = useState<"orders" | "products" | "audit">("orders");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const handleError = useCallback((error: unknown) => {
    setMessage(errorMessage(error));
    if ((error as { status?: number })?.status === 401) {
      setAuth("login");
      setDetail(null);
      setOrders([]);
      setProducts([]);
      setAudit([]);
    }
  }, []);
  const loadOrders = useCallback(async (q: string, s: string, p: number) => {
    const filters = new URLSearchParams({ q, status: s, page: String(p) });
    const data = await browserApi<{ orders: AdminOrder[]; total: number }>(
      "/api/admin/orders?" + filters,
    );
    setOrders(data.orders);
    setTotal(data.total);
    setPage(p);
  }, []);
  const refresh = useCallback(async () => {
    const [stats, catalog] = await Promise.all([
      browserApi<{ overview: Overview }>("/api/admin/overview"),
      browserApi<{ products: Product[] }>("/api/admin/products"),
    ]);
    setOverview(stats.overview);
    setProducts(catalog.products);
  }, []);
  useEffect(() => {
    let active = true;
    async function start() {
      try {
        await browserApi("/api/admin/auth/session");
        if (!active) return;
        setAuth("ready");
        await Promise.all([refresh(), loadOrders("", "all", 1)]);
      } catch (e) {
        if (active) handleError(e);
      }
    }
    void start();
    return () => {
      active = false;
    };
  }, [refresh, loadOrders, handleError]);
  async function openOrder(id: string) {
    setBusy(true);
    setMessage("");
    try {
      setDetail(await browserApi<Detail>("/api/admin/orders/" + id));
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await loadOrders(query, status, 1);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function movePage(next: number) {
    setBusy(true);
    try {
      await loadOrders(query, status, next);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function updateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const values = new FormData(event.currentTarget);
    const nextStatus = String(values.get("status"));
    setBusy(true);
    setMessage("");
    try {
      await browserApi(
        "/api/admin/orders/" + detail.order.id,
        {
          status: nextStatus,
          expectedVersion: detail.order.version,
          note: values.get("note"),
          customerMessage: values.get("customerMessage") ?? "",
          ...(nextStatus === "verified"
            ? {
                checkedPayment: values.get("checkedPayment") === "on",
                verifiedAmountPoisha: parseAmount(
                  String(values.get("actualAmount")),
                ),
              }
            : {}),
          ...(nextStatus === "delivered"
            ? { completedDelivery: values.get("completedDelivery") === "on" }
            : {}),
        },
        "PATCH",
      );
      setDetail(
        await browserApi<Detail>("/api/admin/orders/" + detail.order.id),
      );
      await Promise.all([refresh(), loadOrders(query, status, page)]);
      setMessage("অর্ডারের অবস্থা আপডেট হয়েছে।");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await browserApi("/api/admin/orders/" + detail.order.id + "/notes", {
        note: fields.get("note"),
      });
      form.reset();
      setDetail(
        await browserApi<Detail>("/api/admin/orders/" + detail.order.id),
      );
      setMessage("নোট যোগ হয়েছে।");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    const product = {
      slug: fields.get("slug"),
      name: fields.get("name"),
      category: fields.get("category"),
      description: fields.get("description"),
      pricePoisha: parseAmount(String(fields.get("price"))),
      unit: fields.get("unit"),
      duration: fields.get("duration"),
      icon: fields.get("icon"),
      includes: String(fields.get("includes"))
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
      deliveryType: "service",
      deliveryMethod: fields.get("deliveryMethod"),
      deliveryNote: fields.get("deliveryNote"),
      terms: fields.get("terms"),
      active: fields.get("active") === "on",
    };
    try {
      await browserApi(
        editing ? "/api/admin/products/" + editing.id : "/api/admin/products",
        product,
        editing ? "PATCH" : "POST",
      );
      await refresh();
      setEditing(null);
      setMessage("সেবাটি সংরক্ষণ হয়েছে।");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function loadAudit(next = 1) {
    setBusy(true);
    setMessage("");
    try {
      const data = await browserApi<{ events: Audit[]; total: number }>(
        "/api/admin/audit?page=" + next,
      );
      setAudit(data.events);
      setAuditPage(next);
      setAuditTotal(data.total);
      setTab("audit");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await browserApi("/api/admin/auth/logout", {});
      setAuth("login");
      setOrders([]);
      setProducts([]);
      setDetail(null);
      setOverview(null);
      setAudit([]);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  if (auth === "loading")
    return <p role="status">অ্যাডমিন সেশন যাচাই হচ্ছে…</p>;
  if (auth === "login")
    return (
      <section className="summary-card admin-gate">
        <span className="eyebrow">অনুমোদিত অ্যাডমিন</span>
        <h1>অ্যাডমিন ড্যাশবোর্ড</h1>
        <p>অর্ডার, পেমেন্ট ও ডেলিভারি পরিচালনা করতে লগইন করুন।</p>
        <Link href="/admin/login" className="button button-primary">
          অ্যাডমিন লগইন
        </Link>
      </section>
    );
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">AI সেবা · ব্যবস্থাপনা</p>
          <h1>অ্যাডমিন ড্যাশবোর্ড</h1>
        </div>
        <button
          type="button"
          className="button button-secondary"
          disabled={busy}
          onClick={logout}
        >
          লগআউট
        </button>
      </div>
      <div className="stat-grid">
        {[
          ["মোট অর্ডার", overview?.total],
          ["যাচাই বাকি", overview?.submitted],
          ["যাচাই হয়েছে", overview?.verified],
          ["ডেলিভারি হয়েছে", overview?.delivered],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </div>
      <div className="admin-tabs" role="tablist" aria-label="অ্যাডমিন বিভাগ">
        <button
          type="button"
          role="tab"
          id="orders-tab"
          aria-controls="admin-panel"
          aria-selected={tab === "orders"}
          onClick={() => setTab("orders")}
        >
          অর্ডার
        </button>
        <button
          type="button"
          role="tab"
          id="products-tab"
          aria-controls="admin-panel"
          aria-selected={tab === "products"}
          onClick={() => {
            setTab("products");
            setDetail(null);
          }}
        >
          সেবা ব্যবস্থাপনা
        </button>
        <button
          type="button"
          role="tab"
          id="audit-tab"
          aria-controls="admin-panel"
          aria-selected={tab === "audit"}
          onClick={() => void loadAudit()}
        >
          অডিট ইতিহাস
        </button>
      </div>
      <p role="status" aria-live="polite" className="form-message">
        {message}
      </p>
      <div id="admin-panel" role="tabpanel" aria-labelledby={tab + "-tab"}>
        {tab === "orders" && (
          <>
            <form className="admin-filters" onSubmit={search}>
              <div className="field">
                <label htmlFor="order-search">কোড, নাম, ইমেইল বা TrxID</label>
                <input
                  id="order-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="field">
                <label htmlFor="order-status">অবস্থা</label>
                <select
                  id="order-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">সব অর্ডার</option>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <button className="button button-primary" disabled={busy}>
                খুঁজুন
              </button>
            </form>
            <div className="table-wrap">
              <table>
                <caption>অর্ডার তালিকা · {total}টি</caption>
                <thead>
                  <tr>
                    <th>অর্ডার</th>
                    <th>গ্রাহক ও সেবা</th>
                    <th>মূল্য</th>
                    <th>অবস্থা</th>
                    <th>দেখুন</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong dir="ltr">{order.orderCode}</strong>
                        <small>{date(order.createdAt)}</small>
                      </td>
                      <td>
                        {order.customerName}
                        <small>{order.productName}</small>
                      </td>
                      <td>{formatPoisha(order.amountPoisha)}</td>
                      <td>
                        <span className={"status-pill status-" + order.status}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={busy}
                          onClick={() => void openOrder(order.id)}
                          aria-label={order.orderCode + " বিস্তারিত"}
                        >
                          বিস্তারিত
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <p className="table-empty">এখানে কোনো অর্ডার পাওয়া যায়নি।</p>
              )}
            </div>
            <div className="pagination">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy || page === 1}
                onClick={() => void movePage(page - 1)}
              >
                আগের
              </button>
              <span>পৃষ্ঠা {page}</span>
              <button
                className="button button-secondary"
                type="button"
                disabled={busy || page * 25 >= total}
                onClick={() => void movePage(page + 1)}
              >
                পরের
              </button>
            </div>
            {detail && (
              <section
                className="admin-detail card-surface"
                aria-labelledby="order-detail-heading"
              >
                <div className="admin-heading">
                  <h2 id="order-detail-heading" dir="ltr">
                    {detail.order.orderCode}
                  </h2>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setDetail(null)}
                  >
                    বন্ধ করুন
                  </button>
                </div>
                <dl className="order-facts">
                  {[
                    ["গ্রাহক", detail.order.customerName],
                    ["ইমেইল", detail.order.customerEmail],
                    ["WhatsApp", detail.order.whatsapp ?? "দেওয়া হয়নি"],
                    ["bKash প্রেরক", detail.order.bkashSender],
                    [
                      "bKash প্রাপক",
                      detail.order.bkashRecipient ?? "পাওয়া যায়নি",
                    ],
                    ["সেবা", detail.order.productName],
                    ["TrxID", detail.order.trxId],
                    ["অর্ডারের মূল্য", formatPoisha(detail.order.amountPoisha)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {detail.order.productSnapshot && (
                  <p className="summary-note">
                    ডেলিভারি: {detail.order.productSnapshot.deliveryMethod} ·
                    সময়: {detail.order.productSnapshot.duration}
                  </p>
                )}
                <p>
                  <span className={"status-pill status-" + detail.order.status}>
                    {statusLabels[detail.order.status]}
                  </span>
                </p>
                {(detail.order.status === "submitted" ||
                  detail.order.status === "verified") && (
                  <OrderUpdateForm
                    key={detail.order.id + detail.order.version}
                    order={detail.order}
                    busy={busy}
                    onSubmit={updateOrder}
                  />
                )}
                <div className="admin-detail-grid">
                  <section>
                    <h3>অভ্যন্তরীণ নোট</h3>
                    {detail.order.legacyAdminNote && (
                      <p className="summary-note">আগের নোট: {detail.order.legacyAdminNote}</p>
                    )}
                    <form onSubmit={addNote}>
                      <div className="field">
                        <label htmlFor="internal-note">
                          নতুন নোট (গ্রাহক দেখবেন না)
                        </label>
                        <textarea
                          id="internal-note"
                          name="note"
                          required
                          maxLength={2000}
                          rows={3}
                        />
                      </div>
                      <button
                        className="button button-secondary"
                        disabled={busy}
                      >
                        নোট যোগ করুন
                      </button>
                    </form>
                    <ul className="audit-list">
                      {detail.notes.map((n) => (
                        <li key={n.id}>
                          <p>{n.note}</p>
                          <small>
                            {date(n.createdAt)} · {n.actorId}
                          </small>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3>অর্ডারের ইতিহাস</h3>
                    <AuditList events={detail.audit} />
                  </section>
                </div>
              </section>
            )}
          </>
        )}
        {tab === "products" && (
          <div className="admin-product-grid">
            <section className="card-surface admin-product-list">
              <div className="admin-heading">
                <h2>সেবা ও প্ল্যান</h2>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  নতুন সেবা
                </button>
              </div>
              {products.map((p) => (
                <button
                  className={
                    "product-select" + (editing?.id === p.id ? " selected" : "")
                  }
                  key={p.id}
                  onClick={() => setEditing(p)}
                  type="button"
                >
                  <span>
                    {p.name}
                    <small>
                      {p.active ? "চালু" : "বন্ধ"} · {formatPoisha(p.pricePoisha)}
                    </small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </section>
            <ProductEditor
              key={editing?.id ?? "new"}
              product={editing}
              busy={busy}
              onSubmit={saveProduct}
            />
          </div>
        )}
        {tab === "audit" && (
          <section className="card-surface admin-detail">
            <h2>অ্যাডমিন কার্যক্রমের ইতিহাস</h2>
            <AuditList events={audit} />
            <div className="pagination">
              <button
                type="button"
                className="button button-secondary"
                disabled={busy || auditPage === 1}
                onClick={() => void loadAudit(auditPage - 1)}
              >
                আগের
              </button>
              <span>পৃষ্ঠা {auditPage}</span>
              <button
                type="button"
                className="button button-secondary"
                disabled={busy || auditPage * 50 >= auditTotal}
                onClick={() => void loadAudit(auditPage + 1)}
              >
                পরের
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
function parseAmount(value: string) {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) return 0;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
function AuditList({ events }: { events: Audit[] }) {
  return (
    <ul className="audit-list">
      {events.length === 0 && <li>এখনও কোনো কার্যক্রম নেই।</li>}
      {events.map((e) => (
        <li key={e.id}>
          <strong>{e.action}</strong>
          <small>
            {date(e.createdAt)} · {e.actorId ?? "গ্রাহকের অনুরোধ"}
          </small>
          {e.targetId && <small>{e.targetId}</small>}
          {e.details.from && e.details.to ? (
            <p>
              {String(e.details.from)} → {String(e.details.to)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
function OrderUpdateForm({
  order,
  busy,
  onSubmit,
}: {
  order: AdminOrder;
  busy: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(
    order.status === "verified" ? "delivered" : "verified",
  );
  return (
    <form className="status-form" onSubmit={onSubmit}>
      <h3>অর্ডারের অবস্থা আপডেট</h3>
      <fieldset disabled={busy}>
        <legend className="sr-only">পেমেন্ট ও ডেলিভারি যাচাই</legend>
        <div className="field">
          <label htmlFor="new-status">নতুন অবস্থা</label>
          <select
            id="new-status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
          >
            {order.status === "submitted" ? (
              <>
                <option value="verified">পেমেন্ট যাচাই হয়েছে</option>
                <option value="rejected">পেমেন্ট দাবি গ্রহণ হয়নি</option>
              </>
            ) : (
              <option value="delivered">সেবা দেওয়া হয়েছে</option>
            )}
          </select>
        </div>
        {status === "verified" && (
          <>
            <p className="notice">
              নিজের bKash অ্যাপে প্রাপক, TrxID, প্রেরক ও পরিমাণ মিলিয়ে দেখুন।
              গ্রাহকের TrxID একা পেমেন্টের প্রমাণ নয়।
            </p>
            <div className="field">
              <label htmlFor="actual-amount">বাস্তবে পাওয়া টাকা (৳)</label>
              <input
                id="actual-amount"
                name="actualAmount"
                type="number"
                required
                min="0.01"
                step="1"
                dir="ltr"
              />
            </div>
            <label className="checkbox-label">
              <input name="checkedPayment" type="checkbox" required />
              <span>আমি আসল bKash লেনদেনের সব তথ্য মিলিয়ে দেখেছি।</span>
            </label>
          </>
        )}
        {status === "delivered" && (
          <label className="checkbox-label">
            <input name="completedDelivery" type="checkbox" required />
            <span>নির্বাচিত সেবা সত্যিই দেওয়া হয়েছে।</span>
          </label>
        )}
        <div className="field">
          <label htmlFor="status-note">অভ্যন্তরীণ নোট *</label>
          <textarea
            id="status-note"
            name="note"
            required
            minLength={1}
            maxLength={2000}
            rows={3}
          />
        </div>
        <div className="field">
          <label htmlFor="customer-message">
            গ্রাহকের জন্য বার্তা {status === "rejected" ? "*" : "(ঐচ্ছিক)"}
          </label>
          <textarea
            id="customer-message"
            name="customerMessage"
            required={status === "rejected"}
            minLength={status === "rejected" ? 3 : 0}
            maxLength={1000}
            rows={3}
          />
        </div>
      </fieldset>
      <button className="button button-primary" disabled={busy}>
        {busy ? "সংরক্ষণ হচ্ছে…" : "অবস্থা আপডেট করুন"}
      </button>
    </form>
  );
}
function ProductEditor({
  product: p,
  busy,
  onSubmit,
}: {
  product: Product | null;
  busy: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const fields: [string, string, string | number, number][] = [
    ["name", "সেবার নাম", p?.name ?? "", 100],
    ["slug", "URL slug", p?.slug ?? "", 80],
    ["category", "ক্যাটাগরি", p?.category ?? "", 50],
    ["price", "মূল্য (৳)", p ? p.pricePoisha / 100 : "", 20],
    ["unit", "পরিমাণ / সেশন", p?.unit ?? "", 100],
    ["duration", "সময় / মেয়াদ", p?.duration ?? "", 150],
    ["deliveryMethod", "ডেলিভারির মাধ্যম", p?.deliveryMethod ?? "", 150],
  ];
  return (
    <section className="card-surface checkout-form">
      <h2>{p ? "সেবা সম্পাদনা" : "নতুন সেবা"}</h2>
      <form onSubmit={onSubmit}>
        <fieldset disabled={busy}>
          <legend className="sr-only">সেবার তথ্য</legend>
          {fields.map(([key, label, value, max]) => (
            <div className="field" key={key}>
              <label htmlFor={"product-" + key}>{label} *</label>
              <input
                id={"product-" + key}
                name={key}
                defaultValue={value}
                required
                maxLength={max}
                {...(key === "price"
                  ? {
                      type: "number",
                      step: "0.01",
                      min: "0.01",
                      max: "1000000",
                    }
                  : {})}
              />
            </div>
          ))}
          <div className="field">
            <label htmlFor="product-icon">সেবার ধরন</label>
            <select
              id="product-icon"
              name="icon"
              defaultValue={p?.icon ?? "setup"}
            >
              <option value="setup">সেটআপ</option>
              <option value="prompt">প্রম্পট প্রশিক্ষণ</option>
              <option value="chatbot">চ্যাটবট</option>
              <option value="website">ওয়েবসাইট</option>
            </select>
          </div>
          {(
            [
              ["description", "বিবরণ", p?.description ?? "", 2000, 10],
              [
                "includes",
                "কী থাকছে (প্রতি লাইনে একটি)",
                p?.includes.join("\n") ?? "",
                2400,
                2,
              ],
              [
                "deliveryNote",
                "ডেলিভারি নির্দেশনা",
                p?.deliveryNote ?? "",
                1000,
                2,
              ],
              ["terms", "সেবার শর্ত", p?.terms ?? "", 2000, 10],
            ] as const
          ).map(([key, label, value, max, min]) => (
            <div className="field" key={key}>
              <label htmlFor={"product-" + key}>{label} *</label>
              <textarea
                id={"product-" + key}
                name={key}
                defaultValue={value}
                required
                minLength={min}
                maxLength={max}
                rows={3}
              />
            </div>
          ))}
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="active"
              defaultChecked={p?.active ?? false}
            />
            <span>এই অনুমোদিত সেবাটি গ্রাহকদের জন্য চালু করুন।</span>
          </label>
        </fieldset>
        <button className="button button-primary button-full" disabled={busy}>
          {busy ? "সংরক্ষণ হচ্ছে…" : "সেবা সংরক্ষণ করুন"}
        </button>
      </form>
    </section>
  );
}
