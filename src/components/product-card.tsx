import Link from "next/link";
import { ArrowIcon, ServiceIcon } from "@/components/icons";
import type { CatalogProduct } from "@/server/catalog";
import { productPresentation } from "@/lib/product-presentation";
import { formatTaka } from "@/lib/format";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const presentation = productPresentation(product);
  return (
    <article className="product-card">
      <div className="card-topline">
        <span className="service-icon"><ServiceIcon kind={presentation.icon} /></span>
        <span className="category-label">{presentation.category}</span>
      </div>
      <h3>{product.name}</h3>
      <p className="card-description">{product.description}</p>
      <div className="card-price">
        <span className="price-caption">নমুনা মূল্য</span>
        <strong>{formatTaka(product.priceBdt)}</strong>
        <span className="price-unit">/ {presentation.unit}</span>
      </div>
      <Link className="card-link" href={`/products/${product.id}`}
        aria-label={`${product.name} — প্ল্যান দেখুন`}>
        প্ল্যান দেখুন <ArrowIcon />
      </Link>
    </article>
  );
}
