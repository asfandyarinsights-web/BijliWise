import { AlertCircle, Banknote, Database, Info, Lightbulb, Receipt, TrendingUp, Users, Zap } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { CATEGORY_LABELS } from "../../utils/insights";

const CATEGORY_ICONS = { information: Info, usage: Zap, expense: Banknote, data_availability: Database };
const ID_ICONS = { saved_bills: Receipt, households: Users, total_consumption: Zap, outstanding: AlertCircle };

const STATUS_STYLES = {
  info: { chip: "bg-brand/10 text-brand", badge: "border-line text-muted", label: "Info" },
  notice: { chip: "bg-amber-400/10 text-amber-300", badge: "border-amber-400/20 text-amber-300", label: "Note" },
  attention: { chip: "bg-rose-500/10 text-rose-300", badge: "border-rose-500/30 text-rose-300", label: "Needs attention" },
};

function iconFor(insight) {
  if (ID_ICONS[insight.id]) return ID_ICONS[insight.id];
  if (insight.id.startsWith("change_") || insight.id.startsWith("unusual_")) return TrendingUp;
  return CATEGORY_ICONS[insight.category] ?? Lightbulb;
}

export default function SmartInsights({ insights }) {
  return (
    <Card>
      <CardHeader
        title="Smart insights"
        subtitle="Worked out from your saved bills with fixed, transparent rules. No AI or forecasting is used."
      />
      {insights.length === 0 ? (
        <p className="p-5 text-sm text-muted">No insights are available yet.</p>
      ) : (
        <ul className="grid gap-3 p-5 md:grid-cols-2">
          {insights.map((insight) => {
            const Icon = iconFor(insight);
            const style = STATUS_STYLES[insight.status];
            return (
              <li key={insight.id} className="flex gap-3 rounded-xl border border-line bg-raised/40 p-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.chip}`}><Icon size={17} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{insight.title}</h3>
                    <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">{CATEGORY_LABELS[insight.category]}</span>
                    {insight.status !== "info" && (
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}>{style.label}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">{insight.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
