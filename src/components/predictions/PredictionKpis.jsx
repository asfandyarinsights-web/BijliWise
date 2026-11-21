import { Banknote, CalendarDays, ShieldCheck, Zap } from "lucide-react";
import Card from "../ui/Card";
import { horizonLabel } from "../../utils/predictions";

function Tile({ icon: Icon, label, value, unit, detail, unavailable }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand"><Icon size={18} aria-hidden="true" /></span>
      </div>
      {unavailable ? (
        <p className="mt-4 text-xl font-bold text-muted">Not available</p>
      ) : (
        <p className="mt-4 text-3xl font-bold tracking-tight">{value} <span className="text-base font-medium text-muted">{unit}</span></p>
      )}
      <p className="mt-3 text-xs text-muted">{detail}</p>
    </Card>
  );
}

const fmt = (n) => Math.round(n).toLocaleString("en-PK");

// Numbers appear only when `forecast.available` is true. Otherwise each tile says what is missing.
export default function PredictionKpis({ forecast, horizon, required }) {
  const ready = forecast?.available === true;
  const points = ready ? forecast.predictions : [];
  const total = points.reduce((sum, p) => sum + p.kwh, 0);
  const metrics = ready ? forecast.model.metrics : null;
  const missing = `Needs ${required} monthly bills from this household and a validated model.`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile icon={Zap} label="Predicted consumption" value={fmt(total)} unit="kWh" unavailable={!ready}
        detail={ready ? `Total for ${horizonLabel(horizon).toLowerCase()}, about ${fmt(total / points.length)} kWh a month.` : missing} />
      <Tile icon={Banknote} label="Estimated electricity bill" unavailable
        detail="Not available. A bill depends on tariffs, taxes and fixed charges, not only on units." />
      <Tile icon={CalendarDays} label="Forecast period" value={horizonLabel(horizon)} unit=""
        detail={ready ? "Months covered by the forecast above." : "Selected period. No forecast can be made for it yet."} />
      <Tile icon={ShieldCheck} label={metrics ? `Validation error (${metrics.name})` : "Model reliability"}
        value={metrics ? metrics.value : ""} unit={metrics ? metrics.unit : ""} unavailable={!metrics}
        detail={metrics ? "Measured when the model was validated on held-out months." : "No validated model, so there is no reliability figure to show."} />
    </div>
  );
}
