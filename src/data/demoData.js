// DEMO DATA ONLY. Illustrative values; not real meter readings or a real tariff.
const RAW = [
  [2025, 10, 285], [2025, 11, 240], [2026, 0, 225], [2026, 1, 210],
  [2026, 2, 250], [2026, 3, 330], [2026, 4, 450], [2026, 5, 590],
  [2026, 6, 660], [2026, 7, 630], [2026, 8, 540], [2026, 9, 390],
];

// Illustrative slab tariff (PKR/kWh) + fixed charge + 18% taxes.
export function estimateBill(kwh) {
  const slabs = [[100, 22], [100, 30], [200, 38], [Infinity, 50]];
  let left = kwh;
  let total = 0;
  for (const [size, rate] of slabs) {
    const used = Math.min(left, size);
    total += used * rate;
    left -= used;
    if (left <= 0) break;
  }
  return Math.round((total + 250) * 1.18);
}

const fmtDate = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const monthlyData = RAW.map(([y, m, kwh], i) => ({
  id: `BW-${y}${String(m + 1).padStart(2, "0")}`,
  label: new Date(y, m, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
  short: new Date(y, m, 1).toLocaleDateString("en-GB", { month: "short" }),
  kwh,
  bill: estimateBill(kwh),
  days: new Date(y, m + 1, 0).getDate(),
  issued: fmtDate(new Date(y, m + 1, 5)),
  status: i === RAW.length - 1 ? "Due" : "Paid",
}));

export const recommendations = [
  { id: "ac", title: "Set AC to 26°C", detail: "Each degree higher can cut cooling use by roughly 6%.", saving: 2400 },
  { id: "peak", title: "Shift heavy appliances off 6–10 pm", detail: "Run the washing machine and iron earlier in the day.", saving: 900 },
  { id: "led", title: "Replace remaining bulbs with LEDs", detail: "LEDs use about 80% less power than incandescent bulbs.", saving: 650 },
  { id: "standby", title: "Switch off standby devices", detail: "TVs, chargers and routers draw power around the clock.", saving: 500 },
];

export const notifications = [
  { id: 1, text: "October bill is ready to review.", time: "2 h ago" },
  { id: 2, text: "Usage is 12% above your 6-month average.", time: "Yesterday" },
  { id: 3, text: "Tip: Summer tariffs apply from May.", time: "3 days ago" },
];
