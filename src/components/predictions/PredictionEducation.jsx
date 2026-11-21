import Card, { CardHeader } from "../ui/Card";

// A real sequence, so a numbered list is the right structure.
const STEPS = [
  ["Collect your bills", "Every electricity bill you save for a household becomes one data point for that month."],
  ["Clean and prepare the data", "Incomplete or duplicated records are left out, and the months are put in order."],
  ["Study the household's pattern", "The household's own history shows how its usage rises and falls through the year."],
  ["Train a model", "A forecasting model learns from that household's past months. Different households are never mixed."],
  ["Check how well it works", "The model is tested on months it has not seen. If it is not accurate enough, forecasts stay off."],
  ["Generate the forecast", "Only a model that passed the check is allowed to predict the next months."],
  ["Show the result with its uncertainty", "Forecasts are estimates. BijliWise shows how far off they have been in testing."],
];

export default function PredictionEducation() {
  return (
    <Card>
      <CardHeader title="How predictions will work" subtitle="Forecasts appear only after every step below is done for a household" />
      <ol className="grid gap-3 p-5 md:grid-cols-2">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="flex gap-3 rounded-xl border border-line bg-raised/40 p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand" aria-hidden="true">{i + 1}</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
