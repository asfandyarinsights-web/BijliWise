import { Check, Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { THEME_PALETTES } from "../../utils/themePalettes";

const BARS = [40, 70, 55, 85, 60];

// A tiny drawing of the app (sidebar, header, two cards and a chart) in one theme's colours.
function MiniApp({ palette: p }) {
  return (
    <div className="absolute inset-0 flex" style={{ background: p.base }}>
      <div className="flex flex-col gap-1.5 p-1.5" style={{ width: "22%", background: p.surface, borderRight: `1px solid ${p.line}` }}>
        <span className="h-2 w-full rounded-sm" style={{ background: p.brand }} />
        <span className="h-1.5 w-3/4 rounded-sm" style={{ background: p.raised }} />
        <span className="h-1.5 w-2/3 rounded-sm" style={{ background: p.raised }} />
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <span className="block h-1.5 w-1/3 rounded-sm" style={{ background: p.ink, opacity: 0.85 }} />
        <div className="grid grid-cols-2 gap-1.5">
          <span className="h-5 rounded-md" style={{ background: p.surface, border: `1px solid ${p.line}` }} />
          <span className="h-5 rounded-md" style={{ background: p.surface, border: `1px solid ${p.line}` }} />
        </div>
        <div className="flex h-8 items-end gap-1 rounded-md px-1.5 pb-1" style={{ background: p.surface, border: `1px solid ${p.line}` }}>
          {BARS.map((h, i) => (
            <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: p.brand }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Preview({ kind }) {
  return (
    <div aria-hidden="true" className="relative h-24 overflow-hidden rounded-lg border border-line">
      {kind === "system" ? (
        <>
          <MiniApp palette={THEME_PALETTES.dark} />
          <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 58% 0, 42% 100%, 0 100%)" }}>
            <MiniApp palette={THEME_PALETTES.light} />
          </div>
        </>
      ) : (
        <MiniApp palette={THEME_PALETTES[kind]} />
      )}
    </div>
  );
}

const RESOLVED_NAMES = { light: "Light", dark: "Dark", oled: "Black / OLED" };

export default function ThemeSelector({ value, resolvedTheme, onChange }) {
  const options = [
    { value: "light", label: "Light", icon: Sun, description: "Clean, bright interface." },
    { value: "dark", label: "Dark", icon: Moon, description: "Dark charcoal, easy on the eyes." },
    { value: "oled", label: "Black / OLED", icon: Smartphone, description: "True black background for OLED screens." },
    { value: "system", label: "System", icon: Monitor, description: `Follows your device. Currently ${RESOLVED_NAMES[resolvedTheme] ?? "Dark"}.` },
  ];

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">Theme</legend>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {options.map(({ value: optionValue, label, icon: Icon, description }) => {
          const checked = value === optionValue;
          return (
            <label
              key={optionValue}
              className={`block cursor-pointer rounded-2xl border p-3 transition focus-within:ring-2 focus-within:ring-brand ${
                checked ? "border-brand bg-brand/10 ring-1 ring-brand/40" : "border-line bg-raised/40 hover:border-brand/40"
              }`}
            >
              <input type="radio" name="theme" value={optionValue} checked={checked} onChange={() => onChange(optionValue)} className="sr-only" />
              <Preview kind={optionValue} />
              <span className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <Icon size={16} /> {label}
                {checked && <Check size={15} className="ml-auto text-brand" aria-hidden="true" />}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}