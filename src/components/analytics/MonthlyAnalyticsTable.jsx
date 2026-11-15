import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { sortRows } from "../../utils/analytics";

const units = (n) => n.toLocaleString("en-PK", { maximumFractionDigits: 2 });
const money = (n) => n.toLocaleString("en-PK", { maximumFractionDigits: 2 });

export default function MonthlyAnalyticsTable({ rows, summary }) {
  const [order, setOrder] = useState("desc");
  const sorted = sortRows(rows, order);

  return (
    <Card>
      <CardHeader
        title="Monthly analytics table"
        subtitle="One row per month; bills in the same month are added together"
        action={
          <button type="button" onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-semibold transition hover:border-brand/40 hover:text-brand">
            <ArrowUpDown size={14} /> {order === "desc" ? "Newest first" : "Oldest first"}
          </button>
        }
      />
      <div className="overflow-x-auto p-3">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Month</th>
              <th className="px-3 py-2 text-right font-medium">Total units (kWh)</th>
              <th className="px-3 py-2 text-right font-medium">Total expense (PKR)</th>
              <th className="px-3 py-2 text-right font-medium">Number of bills</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-muted">No months in this period.</td></tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-line/60 transition hover:bg-raised/60">
                <th scope="row" className="px-3 py-3 text-left font-semibold">{r.label}</th>
                <td className="px-3 py-3 text-right">{units(r.kwh)}</td>
                <td className="px-3 py-3 text-right">{money(r.expense)}</td>
                <td className="px-3 py-3 text-right">{r.bills}</td>
              </tr>
            ))}
          </tbody>
          {summary && (
            <tfoot>
              <tr className="font-semibold">
                <th scope="row" className="px-3 py-3 text-left">Total ({summary.monthCount} {summary.monthCount === 1 ? "month" : "months"})</th>
                <td className="px-3 py-3 text-right">{units(summary.totalKwh)}</td>
                <td className="px-3 py-3 text-right">{money(summary.totalExpense)}</td>
                <td className="px-3 py-3 text-right">{summary.totalBills}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}