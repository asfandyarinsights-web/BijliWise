import { ArrowLeft } from "lucide-react";
import Card from "../components/ui/Card";

export default function PlaceholderPage({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <Card className="mx-auto mt-10 max-w-xl p-10 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"><Icon size={26} /></span>
      <h2 className="mt-5 text-xl font-bold">{item.title} arrives in a later stage</h2>
      <p className="mt-2 text-sm text-muted">This section needs the backend and real bill data, which are not part of Day 1.</p>
      <button onClick={() => onNavigate("dashboard")}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-base transition hover:brightness-110">
        <ArrowLeft size={16} /> Back to dashboard
      </button>
    </Card>
  );
}
