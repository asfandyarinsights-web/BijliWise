import { Gauge, Lightbulb, Plug, Power, Snowflake, Wrench } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";

// General guidance. None of this is calculated from the person's bills.
const TIPS = [
  { icon: Power, title: "Switch off what you are not using", text: "Turn off lights, fans and other appliances when you leave a room." },
  { icon: Lightbulb, title: "Prefer LED lighting", text: "LED bulbs use much less electricity than older incandescent bulbs for the same light." },
  { icon: Plug, title: "Avoid standby power", text: "Many devices keep drawing power when switched off with the remote. Unplug them or use a switched power strip." },
  { icon: Snowflake, title: "Use air conditioners efficiently", text: "Keep doors and windows closed while cooling, avoid setting the temperature very low, and clean the filters." },
  { icon: Gauge, title: "Watch high-consumption appliances", text: "Air conditioners, water heaters, irons and refrigerators usually use the most. Check their labels and how long they run." },
  { icon: Wrench, title: "Maintain your appliances", text: "Dusty coils, worn door seals and old filters make appliances work harder and use more electricity." },
];

export default function EnergyTips() {
  return (
    <Card>
      <CardHeader
        title="Energy-saving recommendations"
        subtitle="General guidance for any household. These tips are not based on your bills and do not promise a specific saving."
      />
      <ul className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {TIPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-xl border border-line bg-raised/40 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Icon size={17} aria-hidden="true" /></span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
