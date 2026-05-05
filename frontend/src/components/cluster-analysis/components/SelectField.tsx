import type { SelectFieldProps } from "../types";

export function SelectField({
  label,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-black uppercase tracking-widest text-white focus:border-blue-500 focus:outline-none"
      >
        {options.length === 0 ? (
          <option value="">No options</option>
        ) : (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
