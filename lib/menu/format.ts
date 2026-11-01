const pesos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(cents: number) {
  return pesos.format(cents / 100);
}
