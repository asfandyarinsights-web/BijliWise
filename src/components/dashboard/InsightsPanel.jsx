import { useState } from "react";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import DemoBadge from "../ui/DemoBadge";
import { recommendations } from "../../data/demoData";
import { fmtKwh, fmtPKR } from "../../utils/format";

export default function InsightsPanel({ data }) {
  const [done, setDone] = useState([]);
  const peak = data.reduce((a, b) => (b.kwh > a.kwh ? b : a));
  const low = data.reduce((a, b) => (b.kwh < a.kwh ? b : a));
  const avg = data.reduce((s, d) => s + d.kwh, 0) / data.length;
  const observations = [
    `Highest usage: ${peak.label} at ${fmtKwh(peak.kwh)}.`,
    `Lowest usage: ${low.label} at ${fmtKwh(low.kwh)}.`,
    `Average over this period: ${fmtKwh(avg)} per month.`,
  ];
  const toggle = (id) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const saved = recommendations.filter((r) => done.includes(r.id)).reduce((s, r) => s + r.saving, 0);

  return (
    <Card>
      <CardHeader title="Insights" subtitle="What your usage says, and what to do about it" action={<DemoBadge />} />
      <div className="space-y-5 p-5">
        <ul className="space-y-2">
          {observations.map((o) => (
            <li key={o} className="flex gap-2 text-sm text-muted">
              <TrendingUp size={16} className="mt-0.5 shrink-0 text-brand" /> {o}
            </li>
          ))}
        </ul>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Energy-saving recommendations</h4>
            <span className="text-xs font-semibold text-brand">Planned saving: {fmtPKR(saved)}/mo</span>
          </div>
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
                    <span className="text-xs font-semibold text-brand">~{fmtPKR(r.saving)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}
