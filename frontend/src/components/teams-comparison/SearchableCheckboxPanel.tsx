import { useMemo, useState } from "react";
import { Search } from "lucide-react";

type CheckboxItem = {
  value: string;
  label: string;
  helperText?: string;
};

type SearchableCheckboxPanelProps = {
  title: string;
  subtitle: string;
  items: CheckboxItem[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onSelectAll?: () => void;
  onClear?: () => void;
  searchPlaceholder: string;
  maxHeightClassName?: string;
};

export default function SearchableCheckboxPanel({
  title,
  subtitle,
  items,
  selectedValues,
  onToggle,
  onSelectAll,
  onClear,
  searchPlaceholder,
  maxHeightClassName = "max-h-[340px]",
}: SearchableCheckboxPanelProps) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      [item.label, item.helperText]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [items, query]);

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">
            {title}
          </h3>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">
            {subtitle}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {onSelectAll ? (
            <button
              type="button"
              onClick={onSelectAll}
              className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              All
            </button>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-colors"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
          <Search size={16} />
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div
        className={`overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/40 ${maxHeightClassName}`}
      >
        {filteredItems.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs font-black uppercase tracking-widest text-slate-500">
            No matching options.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {filteredItems.map((item) => {
              const isSelected = selectedValues.includes(item.value);

              return (
                <label
                  key={item.value}
                  className="flex items-start gap-3 px-4 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(item.value)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-200">
                      {item.label}
                    </span>
                    {item.helperText ? (
                      <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                        {item.helperText}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
