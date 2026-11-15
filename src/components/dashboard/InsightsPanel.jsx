import { useState } from "react";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { recommendations } from "../../data/demoData";
import { fmtKwh, fmtPKR } from "../../utils/format";

export default function InsightsPanel({ data = [] }) {
  const [done, setDone] = useState([]);

  const hasData = Array.isArray(data) && data.length > 0;
  let observations = [];

  if (hasData) {
    const peak = data.reduce((a, b) => (b.kwh > a.kwh ? b : a));
    const low = data.reduce((a, b) => (b.kwh < a.kwh ? b : a));
    const avg = data.reduce((s, d) => s + d.kwh, 0) / data.length;
    observations = [
      `Highest consumption: ${peak.label} at ${fmtKwh(peak.kwh)}.`,
      `Lowest consumption: ${low.label} at ${fmtKwh(low.kwh)}.`,
      `Average monthly consumption: ${fmtKwh(avg)} over ${data.length} ${data.length === 1 ? "month" : "months"} shown.`,
    ];
  }

  const toggle = (id) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const planned = recommendations.filter((r) => done.includes(r.id)).reduce((s, r) => s + r.saving, 0);

  return (
    <Card>
      <CardHeader title="Insights" subtitle="Calculated from your saved bills, plus general tips" />
      <div className="space-y-5 p-5">
        {hasData ? (
          <ul className="space-y-2">
            {observations.map((o) => (
              <li key={o} className="flex gap-2 text-sm text-muted">
                <TrendingUp size={16} className="mt-0.5 shrink-0 text-brand" /> {o}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Not enough data yet. Insights appear once at least one bill is saved.</p>
        )}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">General energy-saving recommendations</h4>
            <span className="text-xs font-semibold text-muted">Illustrative, not measured savings</span>
          </div>
          <p className="mb-2 text-xs text-muted">
            These are general tips. The amounts are example figures, not based on your bills, and selecting a tip does not change your actual bill.
          </p>
          <ul className="space-y-2">
            {recommendations.map((r) => {
              const on = done.includes(r.id);
              return (
                <li key={r.id}>
                  <button onClick={() => toggle(r.id)} aria-pressed={on}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${on ? "border-brand/40 bg-brand/10" : "border-line bg-raised/50 hover:border-brand/30"}`}>
                    {on ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand" /> : <Circle size={18} className="mt-0.5 shrink-0 text-muted" />}
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{r.title}</span>
                      <span className="block text-xs text-muted">{r.detail}</span>
                    </span>
                    <span className="text-xs font-semibold text-muted">e.g. ~{fmtPKR(r.saving)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {done.length > 0 && (
            <p className="mt-2 text-xs text-muted">Example total for selected tips: ~{fmtPKR(planned)}/mo (illustrative only).</p>
          )}
        </div>
      </div>
    </Card>
  );
}