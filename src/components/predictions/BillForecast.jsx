import { Banknote } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";

export default function BillForecast({ message }) {
  return (
    <Card>
      <CardHeader title="Electricity bill forecast" subtitle="Estimated future bills for the selected household" />
      <div className="flex gap-3 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Banknote size={20} aria-hidden="true" /></span>
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-semibold">Not available yet</p>
          <p className="text-muted">{message || "Bill forecasting is not available yet."}</p>
          <p className="text-muted">
            It will be switched on only when BijliWise has a forecasting approach and billing assumptions that can be defended.
            Until then no bill amount is estimated, and no tariff is assumed.
          </p>
        </div>
      </div>
    </Card>
  );
}
