import { Banknote, Gauge, Info, TrendingDown, TrendingUp, Zap } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { fmtKwh, fmtPKR } from "../../utils/format";
import { monthLabel } from "../../utils/insights";

function Stat({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-xl border border-line bg-raised/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon size={14} className="text-brand" aria-hidden="true" /> {label}
      </div>
      <p className="mt-2 text-lg font-bold">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </div>
  );
}

const where = (bill) => `${bill.reference}, ${monthLabel(bill.month)}`;

export default function UsagePatterns({ patterns, quality, billCount }) {
  const { highestConsumption, lowestConsumption, highestBill, lowestBill, avgUnits, avgExpense, avgCostPerKwh, payment } = patterns;
  const comparable = billCount >= 2;
  const paymentRows = [
    ["Paid", payment.paid],
    ["Unpaid", payment.unpaid],
    ["Overdue", payment.overdue],
  ];

  return (
    <Card>
      <CardHeader title="Usage patterns" subtitle="Single-bill comparisons from your saved bills. These are not trends over time." />
      <div className="space-y-5 p-5">
        {comparable ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {highestConsumption && <Stat icon={TrendingUp} label="Highest consumption" value={fmtKwh(highestConsumption.units)} detail={where(highestConsumption)} />}
            {lowestConsumption && <Stat icon={TrendingDown} label="Lowest consumption" value={fmtKwh(lowestConsumption.units)} detail={where(lowestConsumption)} />}
            {highestBill && <Stat icon={Banknote} label="Highest bill" value={fmtPKR(highestBill.amount)} detail={where(highestBill)} />}
            {lowestBill && <Stat icon={Banknote} label="Lowest bill" value={fmtPKR(lowestBill.amount)} detail={where(lowestBill)} />}
            {avgUnits !== null && <Stat icon={Zap} label="Average consumption per bill" value={fmtKwh(avgUnits)} />}
            {avgExpense !== null && <Stat icon={Banknote} label="Average expense per bill" value={fmtPKR(avgExpense)} />}
          </div>
        ) : (
          <p className="rounded-xl border border-line bg-raised/40 px-4 py-3 text-sm text-muted">
            Highest, lowest and average values need at least 2 saved bills. Save another bill to compare.
          </p>
        )}

        {avgCostPerKwh !== null && (
          <Stat icon={Gauge} label="Average cost per unit" value={`PKR ${avgCostPerKwh.toLocaleString("en-PK", { maximumFractionDigits: 2 })} per kWh`}
            detail="Total amount paid divided by total units billed. Not a tariff rate." />
        )}

        <div>
          <p className="mb-2 text-sm font-semibold">Payment status of saved bills</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {paymentRows.map(([name, row]) => (
              <li key={name} className="rounded-xl border border-line bg-raised/40 px-4 py-3 text-sm">
                <span className="text-xs text-muted">{name}</span>
                <p className="font-semibold">{row.count} {row.count === 1 ? "bill" : "bills"} <span className="font-normal text-muted">({fmtPKR(row.amount)})</span></p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-line bg-raised/40 px-4 py-3 text-sm text-muted">
          <Info size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div className="space-y-1">
            <p><span className="font-semibold text-ink">Household trends: </span>{quality.householdTrends ? "available for households with 2 or more bills." : "not available yet."} {quality.message}</p>
            <p><span className="font-semibold text-ink">Unusual-usage check: </span>{quality.unusualCheck ? "run for households with enough bills." : "not available yet."} {quality.unusualCheckMessage}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
