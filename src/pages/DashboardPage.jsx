import { useMemo, useState } from "react";
import { Banknote, CalendarDays, Zap } from "lucide-react";
import KpiCard from "../components/ui/KpiCard";
import EfficiencyCard from "../components/ui/EfficiencyCard";
import DemoBadge from "../components/ui/DemoBadge";
import ConsumptionChart from "../components/charts/ConsumptionChart";
import ExpenseChart from "../components/charts/ExpenseChart";
import InsightsPanel from "../components/dashboard/InsightsPanel";
import RecentBills from "../components/dashboard/RecentBills";
import FilterBar from "../components/dashboard/FilterBar";
import { monthlyData } from "../data/demoData";
import { exportCsv } from "../utils/exportCsv";
import { fmtPKR, pctChange } from "../utils/format";
import { filterBills } from "./BillsPage";

export default function DashboardPage({ search, onNavigate }) {
  const [range, setRange] = useState(6);
  const [monthIndex, setMonthIndex] = useState(monthlyData.length - 1);

  const chartData = useMemo(() => monthlyData.slice(-range), [range]);
  const cur = monthlyData[monthIndex];
  const prev = monthlyData[monthIndex - 1];
  const daily = cur.kwh / cur.days;
  const prevDaily = prev ? prev.kwh / prev.days : undefined;
  const score = Math.max(35, Math.min(98, Math.round(100 - (cur.kwh - 150) / 6)));
  const bills = filterBills([...monthlyData].reverse(), search).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-sm text-amber-200">
        <DemoBadge /> All figures are demonstration data. Bills use an illustrative tariff, not real meter readings.
      </div>

      <FilterBar range={range} onRange={setRange} months={monthlyData} monthIndex={monthIndex} onMonth={setMonthIndex}
        onExport={() => exportCsv(chartData)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Zap} label="Monthly consumption" value={cur.kwh.toLocaleString()} unit="kWh"
          change={prev && pctChange(cur.kwh, prev.kwh)} hint={`${cur.label} vs previous`} />
        <KpiCard icon={Banknote} label="Estimated monthly bill" value={cur.bill.toLocaleString("en-PK")} unit="PKR"
          change={prev && pctChange(cur.bill, prev.bill)} hint={`${cur.label} vs previous`} />
        <KpiCard icon={CalendarDays} label="Average daily use" value={daily.toFixed(1)} unit="kWh/day"
          change={prevDaily && pctChange(daily, prevDaily)} hint={`${cur.days} days in ${cur.short}`} />
        <EfficiencyCard score={score} hint="Score out of 100, based on monthly kWh" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ConsumptionChart data={chartData} />
        <ExpenseChart data={chartData} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InsightsPanel data={chartData} />
        <RecentBills bills={bills} action={
          <button onClick={() => onNavigate("bills")} className="rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-brand/10">View all</button>
        } />
      </div>
    </div>
  );
}
