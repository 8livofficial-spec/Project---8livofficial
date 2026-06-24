export function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString();
}

export function formatCurrency(value: number | null | undefined): string {
  return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDateOnly(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", { dateStyle: "medium" });
}
