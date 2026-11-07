"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { ProductCard } from "@/components/product-card";
import type { MockProduct } from "@/data/mock-products";

type Category = "ai" | "fashion";

export function HomeCategoryTabs({
  products,
}: {
  products: readonly MockProduct[];
}) {
  const [category, setCategory] = useState<Category>("ai");
  const [selectedSlug, setSelectedSlug] = useState(products[0]?.slug ?? "");

  useEffect(() => {
    if (!products.some((product) => product.slug === selectedSlug)) {
      setSelectedSlug(products[0]?.slug ?? "");
    }
  }, [products, selectedSlug]);

  const selectedProduct =
    products.find((product) => product.slug === selectedSlug) ?? products[0];

  function handleCategoryKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextCategory = category === "ai" ? "fashion" : "ai";
    setCategory(nextCategory);
    document.getElementById("vexora-tab-" + nextCategory)?.focus();
  }

  return (
    <div className="vexora-category-experience">
      <div className="vexora-category-tabs" role="tablist" aria-label="পণ্যের বিভাগ">
        <button
          id="vexora-tab-ai"
          type="button"
          role="tab"
          aria-selected={category === "ai"}
          aria-controls="vexora-category-panel"
          tabIndex={category === "ai" ? 0 : -1}
          onClick={() => setCategory("ai")}
          onKeyDown={handleCategoryKeyDown}
        >
          AI Tools
        </button>
        <button
          id="vexora-tab-fashion"
          type="button"
          role="tab"
          aria-selected={category === "fashion"}
          aria-controls="vexora-category-panel"
          tabIndex={category === "fashion" ? 0 : -1}
          onClick={() => setCategory("fashion")}
          onKeyDown={handleCategoryKeyDown}
        >
          Fashion <span>শীঘ্রই আসছে</span>
        </button>
      </div>

      <div
        id="vexora-category-panel"
        className="vexora-category-panel"
        role="tabpanel"
        aria-labelledby={category === "ai" ? "vexora-tab-ai" : "vexora-tab-fashion"}
        aria-live="polite"
      >
        {category === "fashion" ? (
          <div className="vexora-coming-soon-card">
            <span className="vexora-coming-soon-label">COMING SOON</span>
            <h3>Fashion &amp; Dresses</h3>
            <p>
              আমাদের Fashion collection প্রস্তুত হচ্ছে। এই বিভাগে এখন কোনো
              অর্ডার বা পেমেন্ট নেওয়া হচ্ছে না।
            </p>
            <span className="vexora-coming-soon-bangla">শীঘ্রই আসছে</span>
          </div>
        ) : products.length === 0 ? (
          <div className="vexora-catalog-notice">
            <span className="vexora-catalog-label">AI TOOLS</span>
            <h3>নতুন প্ল্যান শিগগিরই যুক্ত হবে</h3>
            <p>
              এই মুহূর্তে কোনো AI Tools plan নেই। নতুন প্ল্যান যুক্ত হলে
              এখানেই দেখা যাবে।
            </p>
          </div>
        ) : (
          <>
            {products.length > 1 && (
              <div className="vexora-plan-selector" role="group" aria-label="প্ল্যান নির্বাচন">
                <span className="vexora-plan-selector-label">SELECT A PLAN</span>
                <div className="vexora-plan-chips">
                  {products.map((product) => (
                    <button
                      key={product.slug}
                      type="button"
                      aria-pressed={selectedProduct?.slug === product.slug}
                      onClick={() => setSelectedSlug(product.slug)}
                    >
                      {product.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedProduct && (
              <div className="vexora-featured-plan">
                <div className="vexora-featured-plan-heading">
                  <span className="vexora-featured-plan-badge">
                    {products.length === 1 ? "SAMPLE PLAN" : "SELECTED SAMPLE"}
                  </span>
                  <p>DEMO CATALOG · ORDERS CLOSED</p>
                </div>
                <div className="vexora-product-grid">
                  <ProductCard product={selectedProduct} />
                </div>
                <p className="vexora-featured-plan-note">
                  এই মূল্য ও বিবরণ নমুনা ডেটা। এগুলো দিয়ে এখন অর্ডার বা পেমেন্ট
                  করা যাবে না।
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
