import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { STATUS_META } from "../../utils/predictions";

const TONES = {
  ready: "border-brand/30 bg-brand/10 text-brand",
  warn: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  muted: "border-line bg-raised/40 text-muted",
};

export function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.forecast_unavailable;
  const Icon = meta.tone === "ready" ? CheckCircle2 : AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${TONES[meta.tone]}`}>
      <Icon size={15} aria-hidden="true" /> {meta.label}
    </span>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-line py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

export default function ModelReadiness({ readiness }) {
  const r = readiness;
  const model = r.model;
  const trainingText = model.validated ? "Trained and validated" : model.trained ? "Loaded, not validated" : "No trained model";

  return (
    <Card>
      <CardHeader title="Model readiness" subtitle="Whether a forecast can be made for the selected household" />
      <div className="p-5">
        <div className="mb-3"><StatusPill status={r.status} /></div>
        <p className="text-sm text-muted">{r.message}</p>

        <dl className="mt-4">
          <Row label="Selected household">{r.reference}</Row>
          <Row label="Monthly bills available">{r.observations} of {r.required} required</Row>
          <Row label="Model training status">{trainingText}</Row>
          <Row label="Forecast availability">{r.available ? "Available" : "Not available"}</Row>
          {r.missingMonths > 0 && <Row label="Months with no bill between first and latest">{r.missingMonths}</Row>}
          {r.conflictingMonths.length > 0 && <Row label="Months saved twice with different values (left out)">{r.conflictingMonths.length}</Row>}
          {r.invalidRecords > 0 && <Row label="Invalid records (left out)">{r.invalidRecords}</Row>}
        </dl>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-raised/40 px-3 py-2.5 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <span>{r.required} monthly bills is a preliminary data target, not a guarantee of reliable forecasts. A model must still be trained and checked before forecasts are shown.</span>
        </p>
      </div>
    </Card>
  );
}
