import Card from "../ui/Card";
import OptionGroup from "../settings/OptionGroup";
import { HORIZONS } from "../../utils/predictions";

// Household picker (real consumer references from the database) and forecast period.
export default function PredictionControls({ households, reference, onReference, horizon, onHorizon, required }) {
  return (
    <Card className="grid gap-5 p-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <div>
        <label htmlFor="prediction-household" className="mb-2 block text-sm font-semibold">Household</label>
        <select id="prediction-household" value={reference} onChange={(e) => onReference(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold focus:border-brand/50 focus:outline-none">
          {households.map((h) => (
            <option key={h.reference} value={h.reference}>
              {h.reference} ({h.observations} {h.observations === 1 ? "month" : "months"} of bills)
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted">Each household is forecast on its own. Forecasting needs at least {required} monthly bills from the same household.</p>
      </div>

      <OptionGroup
        legend="Forecast period"
        name="forecastHorizon"
        value={horizon}
        onChange={onHorizon}
        options={HORIZONS.map(({ value, label }) => ({ value, label }))}
        hint="This choice is sent to the server with every forecast request."
      />
    </Card>
  );
}
