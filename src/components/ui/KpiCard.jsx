import { TrendingUp, TrendingDown } from "lucide-react";
import Card from "./Card";

// lowerIsBetter: a drop in the value is shown as good (green).
export default function KpiCard({ icon: Icon, label, value, unit, change, lowerIsBetter = true, hint }) {
  const up = change > 0;
  const good = lowerIsBetter ? !up : up;
  const Arrow = up ? TrendingUp : TrendingDown;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand">
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight">
        {value} <span className="text-base font-medium text-muted">{unit}</span>
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {change !== undefined && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${good ? "bg-brand/10 text-brand" : "bg-rose-500/10 text-rose-400"}`}>
            <Arrow size={12} /> {Math.abs(change).toFixed(1)}%
          </span>
        )}
        <span className="text-muted">{hint}</span>
      </div>
    </Card>
  );
}
