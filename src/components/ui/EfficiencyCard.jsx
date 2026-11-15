import { Gauge } from "lucide-react";
import Card from "./Card";

export default function EfficiencyCard({ score, hint, available = true }) {
  const hasScore = available && Number.isFinite(score);
  const label = !hasScore ? "Not enough data" : score >= 75 ? "Efficient" : score >= 55 ? "Moderate" : "High usage";
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">Energy efficiency</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand">
          <Gauge size={18} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <svg width="76" height="76" viewBox="0 0 76 76" role="img"
          aria-label={hasScore ? `Efficiency score ${score} out of 100` : "Efficiency score unavailable"}>
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgb(148 163 184 / 0.15)" strokeWidth="8" />
          {hasScore ? (
            <>
              <circle cx="38" cy="38" r={r} fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 38 38)"
                style={{ transition: "stroke-dashoffset .6s ease" }} />
              <text x="38" y="43" textAnchor="middle" fill="#f8fafc" fontSize="18" fontWeight="700">{score}</text>
            </>
          ) : (
            <text x="38" y="44" textAnchor="middle" fill="#94a3b8" fontSize="20" fontWeight="700">—</text>
          )}
        </svg>
        <div>
          <p className="text-lg font-bold">{label}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </div>
    </Card>
  );
}