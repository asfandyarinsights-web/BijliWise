import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { buildInsights, UNUSUAL_THRESHOLD } from "../../utils/analytics";

export default function AnalyticsInsights({ rows }) {
  const insights = useMemo(() => buildInsights(rows), [rows]);

  return (
    <Card>
      <CardHeader
        title="Insights"
        subtitle="Plain-language observations from your recorded bills"
        action={<span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">Rule-based</span>}
      />
      <div className="space-y-4 p-5">
        {insights.length === 0 ? (
          <p className="text-sm text-muted">Not enough data yet. Insights appear once bills are recorded.</p>
        ) : (
          <ul className="space-y-2">
            {insights.map((i) => (
              <li key={i.id} className="flex gap-2 text-sm text-muted">
                <TrendingUp size={16} className="mt-0.5 shrink-0 text-brand" /> {i.text}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          How these are worked out: simple rules applied to the months shown, not machine learning or a forecast.
          "Previous recorded month" is the month before in your records; months without bills are skipped.
          A month is flagged only when it is more than {UNUSUAL_THRESHOLD * 100}% above the period average, which is a fixed threshold rather than a statistical test.
          No savings are estimated, and no efficiency judgement is made without a validated household benchmark.
        </p>
      </div>
    </Card>
  );
}