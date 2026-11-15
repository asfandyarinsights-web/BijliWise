import { Banknote, CalendarDays, FileText, TrendingDown, TrendingUp, Zap } from "lucide-react";
import KpiCard from "../ui/KpiCard";
import { fmtKwh } from "../../utils/format";

const kwhText = (n) => n.toLocaleString("en-PK", { maximumFractionDigits: 1 });
const pkrText = (n) => Math.round(n).toLocaleString("en-PK");

function Group({ title, className, children }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className={`grid gap-4 ${className}`}>{children}</div>
    </section>
  );
}

export default function AnalyticsSummary({ summary }) {
  const n = summary.monthCount;
  const months = `${n} recorded ${n === 1 ? "month" : "months"}`;
  const only = n === 1 ? "Only month in this period" : null;

  return (
    <div className="space-y-5">
      <Group title="Period totals" className="sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={Zap} label="Total consumption" value={kwhText(summary.totalKwh)} unit="kWh" hint={`Sum of ${months}`} />
        <KpiCard icon={Banknote} label="Total electricity expense" value={pkrText(summary.totalExpense)} unit="PKR" hint="Sum of recorded bill amounts" />
        <KpiCard icon={FileText} label="Bills recorded" value={summary.totalBills.toLocaleString("en-PK")} unit={summary.totalBills === 1 ? "bill" : "bills"} hint="All saved bills in these months" />
      </Group>

      <Group title="Averages" className="sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={Zap} label="Average monthly consumption" value={kwhText(summary.avgKwh)} unit="kWh/month" hint={`Total ÷ ${months}. Months without bills are not counted.`} />
        <KpiCard icon={Banknote} label="Average monthly expense" value={pkrText(summary.avgExpense)} unit="PKR/month" hint={`Total ÷ ${months}`} />
        <KpiCard icon={CalendarDays} label="Average daily consumption" value={summary.dailyKwh.toFixed(1)} unit="kWh/day" hint={`Total kWh ÷ ${summary.totalDays} calendar days. Not a meter reading.`} />
      </Group>

      <Group title="Highest and lowest consumption" className="sm:grid-cols-2">
        <KpiCard icon={TrendingUp} label="Highest consumption month" value={summary.highestKwh.label} hint={only ?? `${fmtKwh(summary.highestKwh.kwh)} recorded`} />
        <KpiCard icon={TrendingDown} label="Lowest consumption month" value={summary.lowestKwh.label} hint={only ?? `${fmtKwh(summary.lowestKwh.kwh)} recorded`} />
      </Group>
    </div>
  );
}