import { Download, RefreshCw } from "lucide-react";

const PERIODS = [
  { id: "3", label: "3M" },
  { id: "6", label: "6M" },
  { id: "12", label: "12M" },
  { id: "all", label: "All" },
  { id: "custom", label: "Custom" },
];

const selectClass =
  "rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50";

export default function AnalyticsFilters({
  period,
  onPeriod,
  months,
  rangeStart,
  rangeEnd,
  onRangeStart,
  onRangeEnd,
  rangeError,
  periodLabel,
  onExport,
  exportDisabled,
  onRefresh,
  refreshing,
}) {
  const noData = months.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Analytics period" className="flex rounded-xl border border-line bg-surface p-1">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => onPeriod(p.id)} aria-pressed={period === p.id}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${period === p.id ? "bg-brand text-base" : "text-muted hover:text-ink"}`}>
              {p.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <>
            <label className="flex items-center gap-2 text-sm text-muted">
              From
              <select value={rangeStart} onChange={(e) => onRangeStart(e.target.value)} disabled={noData} className={selectClass}>
                {months.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              To
              <select value={rangeEnd} onChange={(e) => onRangeEnd(e.target.value)} disabled={noData} className={selectClass}>
                {months.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onRefresh} disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button onClick={onExport} disabled={exportDisabled}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-inherit">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {rangeError ? (
        <p role="alert" className="text-sm text-rose-300">{rangeError}</p>
      ) : (
        <p className="text-xs text-muted">Showing: {periodLabel}</p>
      )}
    </div>
  );
}