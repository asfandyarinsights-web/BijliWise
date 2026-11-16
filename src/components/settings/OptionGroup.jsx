// A keyboard-friendly set of choices built on native radio inputs (arrow keys move between them).
export default function OptionGroup({ legend, name, value, onChange, options, hint }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-brand ${
                checked ? "border-brand bg-brand/10 text-brand" : "border-line bg-raised/40 text-muted hover:border-brand/40 hover:text-ink"
              }`}
            >
              <input type="radio" name={name} value={option.value} checked={checked} onChange={() => onChange(option.value)} className="sr-only" />
              {option.label}
              {option.hint && <span className="ml-2 text-xs font-normal opacity-80">{option.hint}</span>}
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}