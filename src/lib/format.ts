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
