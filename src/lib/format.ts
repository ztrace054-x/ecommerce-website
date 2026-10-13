const takaFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Database amounts are whole BDT integers, as specified in Phase 2. */
export function formatTaka(priceBdt: number): string {
  return takaFormatter.format(priceBdt);
}

/** API DTO amounts use integer poisha; storage remains whole BDT. */
export function formatPoisha(pricePoisha: number): string {
  return formatTaka(pricePoisha / 100);
}
