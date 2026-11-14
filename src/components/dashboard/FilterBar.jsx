import { Download } from "lucide-react";

const RANGES = [3, 6, 12];

export default function FilterBar({ range, onRange, months, monthIndex, onMonth, onExport }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Chart range" className="flex rounded-xl border border-line bg-surface p-1">
        {RANGES.map((r) => (
          <button key={r} onClick={() => onRange(r)} aria-pressed={range === r}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${range === r ? "bg-brand text-base" : "text-muted hover:text-ink"}`}>
            {r}M
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        KPI month
        <select value={monthIndex} onChange={(e) => onMonth(Number(e.target.value))}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink">
          {months.map((m, i) => <option key={m.id} value={i}>{m.label}</option>)}
        </select>
      </label>
      <button onClick={onExport}
        className="ml-auto inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold transition hover:border-brand/40 hover:text-brand">
        <Download size={16} /> Export CSV
      </button>
    </div>
  );
}
