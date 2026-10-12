import Link from "next/link";
import { ArrowIcon, ServiceIcon } from "@/components/icons";
import type { MockProduct } from "@/data/mock-products";
import { formatTaka } from "@/lib/format";

export function ProductCard({ product }: { product: MockProduct }) {
  return (
    <article className="product-card">
      <div className="card-topline">
        <span className="service-icon"><ServiceIcon kind={product.icon} /></span>
        <span className="category-label">{product.category}</span>
      </div>
      <h3>{product.name}</h3>
      <p className="card-description">{product.description}</p>
      <div className="card-price">
        <span className="price-caption">নমুনা মূল্য</span>
        <strong>{formatTaka(product.pricePoisha)}</strong>
        <span className="price-unit">/ {product.unit}</span>
      </div>
      <Link className="card-link" href={`/products/${product.slug}`}
        aria-label={`${product.name} — প্ল্যান দেখুন`}>
        প্ল্যান দেখুন <ArrowIcon />
      </Link>
    </article>
  );
}
