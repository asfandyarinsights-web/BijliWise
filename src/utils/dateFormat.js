// Formats a YYYY-MM-DD date for display. Only the display changes, never the stored value.
//   short -> 5 Nov 2026     dmy -> 05/11/2026     iso -> 2026-11-05
export function formatDisplayDate(isoDate, style = "short") {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate ?? ""));
  if (!match) return "Not available";

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const real =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day);
  if (!real) return "Not available";

  if (style === "iso") return `${year}-${month}-${day}`;
  if (style === "dmy") return `${day}/${month}/${year}`;
  return date.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}