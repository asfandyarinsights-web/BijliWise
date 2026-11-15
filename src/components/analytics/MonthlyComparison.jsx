import { useState } from "react";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Minus } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { compareMonths, directionOf, formatPercent, formatSigned } from "../../utils/analytics";
import { fmtKwh, fmtPKR } from "../../utils/format";

const TONE = { up: "text-rose-400", down: "text-emerald-400", flat: "text-muted" };
const ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

const selectClass = "rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink";

function Difference({ diff, format }) {
  const direction = directionOf(diff);
  const Icon = ICON[direction];
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${TONE[direction]}`}>
      <Icon size={14} aria-hidden="true" />
      {formatSigned(diff, format)}
    </span>
  );
}

function Percent({ diff, pct }) {
  if (pct === null) return <span className="text-muted">Not available</span>;
  return <span className={`font-semibold ${TONE[directionOf(diff)]}`}>{formatPercent(pct)}</span>;
}

// rows are the months in the selected period. Month A is the baseline; month B is compared against it.
export default function MonthlyComparison({ rows }) {
  const [aId, setAId] = useState(null);
  const [bId, setBId] = useState(null);

  if (rows.length < 2) {
    return (
      <Card>
        <CardHeader title="Monthly comparison" subtitle="Compare any two recorded months" />
        <p className="p-6 text-center text-sm text-muted">
          Comparison needs at least two months with recorded bills in the selected period.
        </p>
      </Card>
    );
  }

  const ids = rows.map((r) => r.id);
  const effectiveA = ids.includes(aId) ? aId : rows[rows.length - 2].id;
  const effectiveB = ids.includes(bId) ? bId : rows[rows.length - 1].id;
  const a = rows.find((r) => r.id === effectiveA);
  const b = rows.find((r) => r.id === effectiveB);
  const same = effectiveA === effectiveB;
  const result = same ? null : compareMonths(a, b);

  return (
    <Card>
      <CardHeader title="Monthly comparison" subtitle="Compare any two recorded months from the selected period" />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Month A (baseline)
            <select value={effectiveA} onChange={(e) => setAId(e.target.value)} className={selectClass}>
              {rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => { setAId(effectiveB); setBId(effectiveA); }} aria-label="Swap months"
            className="rounded-lg border border-line p-2 text-muted transition hover:border-brand/40 hover:text-brand">
            <ArrowLeftRight size={16} />
          </button>
          <label className="flex items-center gap-2 text-sm text-muted">
            Month B
            <select value={effectiveB} onChange={(e) => setBId(e.target.value)} className={selectClass}>
              {rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
        </div>

        {same ? (
          <p role="status" className="rounded-xl border border-line bg-raised/50 p-4 text-sm text-muted">
            Choose two different months to compare.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Change from <span className="font-semibold text-ink">{a.label}</span> to <span className="font-semibold text-ink">{b.label}</span>.
              Differences are {b.label} minus {a.label}, and percentages are relative to {a.label}.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-medium">Measure</th>
                    <th className="px-3 py-2 text-right font-medium">{a.label}</th>
                    <th className="px-3 py-2 text-right font-medium">{b.label}</th>
                    <th className="px-3 py-2 text-right font-medium">Difference</th>
                    <th className="py-2 pl-3 text-right font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line/60">
                    <th scope="row" className="py-3 pr-3 text-left font-semibold">Consumption</th>
                    <td className="px-3 py-3 text-right">{fmtKwh(a.kwh)}</td>
                    <td className="px-3 py-3 text-right">{fmtKwh(b.kwh)}</td>
                    <td className="px-3 py-3 text-right"><Difference diff={result.kwhDiff} format={fmtKwh} /></td>
                    <td className="py-3 pl-3 text-right"><Percent diff={result.kwhDiff} pct={result.kwhPct} /></td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-3 pr-3 text-left font-semibold">Electricity expense</th>
                    <td className="px-3 py-3 text-right">{fmtPKR(a.expense)}</td>
                    <td className="px-3 py-3 text-right">{fmtPKR(b.expense)}</td>
                    <td className="px-3 py-3 text-right"><Difference diff={result.expenseDiff} format={fmtPKR} /></td>
                    <td className="py-3 pl-3 text-right"><Percent diff={result.expenseDiff} pct={result.expensePct} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              Green means the recorded figure fell, red means it rose. This describes the numbers only; it does not show that the household became more or less efficient.
              A percentage is not available when the {a.label} value is 0.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}