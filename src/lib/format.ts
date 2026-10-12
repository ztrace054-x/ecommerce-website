const takaFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Presentation only. Real order amounts must later come from the database. */
export function formatTaka(pricePoisha: number): string {
  return takaFormatter.format(pricePoisha / 100);
}
