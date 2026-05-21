import {
  memo,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  BadgeAlert,
  BadgePercent,
  Ban,
  ChartPie,
  CircleDot,
  CircleHelp,
  Crosshair,
  Flag,
  Goal,
  Handshake,
  Percent,
  RectangleHorizontal,
  Send,
  Shield,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  filterAndRankSearchResults,
  type SearchFieldValue,
} from "../../utils/search";
import { SearchInput, standingsTheme } from "../ui/design";

type CheckboxItem = {
  value: string;
  label: string;
  helperText?: string;
  kind?: "team" | "team-season" | "stat";
  logoUrl?: string | null;
  seasonLabel?: string | null;
  statKey?: string;
  tagLabel?: string;
  tagHelperText?: string | null;
  searchFields?: SearchFieldValue[];
};

type SearchableCheckboxPanelProps = {
  title: string;
  subtitle: string;
  items: CheckboxItem[];
  selectionItems?: CheckboxItem[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onSelectAll?: () => void;
  onClear?: () => void;
  onSelectVisible?: (visibleValues: string[]) => void;
  onClearVisible?: (visibleValues: string[]) => void;
  controls?: ReactNode;
  searchPlaceholder: string;
  maxHeightClassName?: string;
};

const SearchableCheckboxPanel = memo(function SearchableCheckboxPanel({
  title,
  subtitle,
  items,
  selectionItems,
  selectedValues,
  onToggle,
  onSelectAll,
  onClear,
  onSelectVisible,
  onClearVisible,
  controls,
  searchPlaceholder,
  maxHeightClassName = "max-h-[340px]",
}: SearchableCheckboxPanelProps) {
  const [query, setQuery] = useState("");

  const selectedValueSet = useMemo(
    () => new Set(selectedValues),
    [selectedValues],
  );

  const filteredItems = useMemo(() => {
    return filterAndRankSearchResults(items, query, (item) =>
      item.searchFields ?? [item.label, item.helperText, item.statKey, item.value],
    );
  }, [items, query]);

  const visibleValues = useMemo(
    () => filteredItems.map((item) => item.value),
    [filteredItems],
  );

  const selectableItemsByValue = useMemo(
    () =>
      new Map(
        (selectionItems ?? items).map((item) => [item.value, item]),
      ),
    [items, selectionItems],
  );

  const selectedItems = useMemo(
    () =>
      selectedValues
        .map((selectedValue) => selectableItemsByValue.get(selectedValue))
        .filter((item): item is CheckboxItem => Boolean(item)),
    [selectableItemsByValue, selectedValues],
  );

  const handleSelectVisible = useCallback(() => {
    if (onSelectVisible) {
      onSelectVisible(visibleValues);
      return;
    }

    onSelectAll?.();
  }, [onSelectAll, onSelectVisible, visibleValues]);

  const handleClearVisible = useCallback(() => {
    if (onClearVisible) {
      onClearVisible(visibleValues);
      return;
    }

    onClear?.();
  }, [onClear, onClearVisible, visibleValues]);

  return (
    <section className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-xl">
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
          {onSelectAll || onSelectVisible ? (
            <button
              type="button"
              onClick={handleSelectVisible}
              className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              All
            </button>
          ) : null}
          {onClear || onClearVisible ? (
            <button
              type="button"
              onClick={handleClearVisible}
              className={standingsTheme.compactPill}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {controls ? <div className="mb-4">{controls}</div> : null}

      {selectedItems.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <SelectionTag
              key={item.value}
              item={item}
              onRemove={onToggle}
            />
          ))}
        </div>
      ) : null}

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={searchPlaceholder}
        className="!mb-4 !max-w-none"
      />

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
              const isSelected = selectedValueSet.has(item.value);

              if (item.kind === "stat" || item.statKey) {
                return (
                  <StatisticOptionRow
                    key={item.value}
                    item={item}
                    isSelected={isSelected}
                    onToggle={onToggle}
                  />
                );
              }

              return (
                <TeamSeasonOptionRow
                  key={item.value}
                  item={item}
                  isSelected={isSelected}
                  onToggle={onToggle}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
});

export default SearchableCheckboxPanel;

const SelectionTag = memo(function SelectionTag({
  item,
  onRemove,
}: {
  item: CheckboxItem;
  onRemove: (value: string) => void;
}) {
  const tagLabel = item.tagLabel ?? item.label;
  const tagHelperText =
    item.tagHelperText ?? (item.kind === "team-season" ? item.seasonLabel : null);
  const handleRemove = useCallback(() => {
    onRemove(item.value);
  }, [item.value, onRemove]);

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-bold text-blue-400">
      {item.kind === "stat" || item.statKey ? (
        <StatIcon statKey={item.statKey ?? item.value} sizeClassName="h-3.5 w-3.5" />
      ) : (
        <TeamLogoBadge
          logoUrl={item.logoUrl}
          teamName={tagLabel}
          className="h-5 w-5 text-[8px]"
        />
      )}
      <span className="min-w-0 truncate">
        <span className="truncate">{tagLabel}</span>
        {tagHelperText ? (
          <span className="ml-1 text-blue-400/80">{tagHelperText}</span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove ${tagLabel}`}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-blue-400 transition-colors hover:bg-blue-400/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <X size={12} />
      </button>
    </span>
  );
});

const TeamSeasonOptionRow = memo(function TeamSeasonOptionRow({
  item,
  isSelected,
  onToggle,
}: {
  item: CheckboxItem;
  isSelected: boolean;
  onToggle: (value: string) => void;
}) {
  const handleToggle = useCallback(() => {
    onToggle(item.value);
  }, [item.value, onToggle]);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={handleToggle}
      className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
        isSelected
          ? "bg-blue-500/10 hover:bg-blue-500/15"
          : "hover:bg-blue-500/[0.03]"
      }`}
    >
      <TeamLogoBadge logoUrl={item.logoUrl} teamName={item.label} />
      <OptionText item={item} isSelected={isSelected} />
    </button>
  );
});

const StatisticOptionRow = memo(function StatisticOptionRow({
  item,
  isSelected,
  onToggle,
}: {
  item: CheckboxItem;
  isSelected: boolean;
  onToggle: (value: string) => void;
}) {
  const handleToggle = useCallback(() => {
    onToggle(item.value);
  }, [item.value, onToggle]);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={handleToggle}
      className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
        isSelected
          ? "bg-blue-500/10 hover:bg-blue-500/15"
          : "hover:bg-blue-500/[0.03]"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          isSelected
            ? "border-blue-400/40 bg-blue-500/20 text-blue-400"
            : "border-slate-700 bg-slate-900/80 text-slate-400"
        }`}
      >
        <StatIcon statKey={item.statKey ?? item.value} />
      </span>
      <OptionText item={item} isSelected={isSelected} />
    </button>
  );
});

function OptionText({
  item,
  isSelected,
}: {
  item: CheckboxItem;
  isSelected: boolean;
}) {
  return (
    <span className="min-w-0">
      <span
        className={`block text-sm font-bold ${
          isSelected ? "text-white" : "text-slate-200"
        }`}
      >
        {item.label}
      </span>
      {item.helperText ? (
        <span className="mt-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {item.helperText}
        </span>
      ) : null}
    </span>
  );
}

function TeamLogoBadge({
  logoUrl,
  teamName,
  className = "mt-0.5 h-9 w-9 text-[11px]",
}: {
  logoUrl?: string | null;
  teamName: string;
  className?: string;
}) {
  const initials = getInitials(teamName);

  if (logoUrl) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 ${className}`}
      >
        <img
          src={logoUrl}
          alt=""
          className="h-4/5 w-4/5 object-contain"
          loading="lazy"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 font-black uppercase text-blue-400 ${className}`}
    >
      {initials}
    </span>
  );
}

function StatIcon({
  statKey,
  sizeClassName = "h-4 w-4",
}: {
  statKey: string;
  sizeClassName?: string;
}) {
  const Icon = getStatIcon(statKey);

  return <Icon className={sizeClassName} aria-hidden="true" />;
}

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "TM";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getStatIcon(statKey: string): LucideIcon {
  const normalizedKey = statKey.toLowerCase();

  if (normalizedKey.includes("goal")) {
    return Goal;
  }

  if (normalizedKey.includes("assist") || normalizedKey.includes("chance")) {
    return Sparkles;
  }

  if (normalizedKey.includes("shot") && normalizedKey.includes("ontarget")) {
    return Target;
  }

  if (normalizedKey.includes("shot")) {
    return Crosshair;
  }

  if (normalizedKey.includes("possession")) {
    return ChartPie;
  }

  if (
    normalizedKey.includes("pass") ||
    normalizedKey.includes("cross") ||
    normalizedKey.includes("longball")
  ) {
    return Send;
  }

  if (normalizedKey.includes("dribble")) {
    return Zap;
  }

  if (normalizedKey.includes("clean")) {
    return ShieldCheck;
  }

  if (
    normalizedKey.includes("conceded") ||
    normalizedKey.includes("against") ||
    normalizedKey.includes("own_goals")
  ) {
    return ShieldX;
  }

  if (
    normalizedKey.includes("tackle") ||
    normalizedKey.includes("interception") ||
    normalizedKey.includes("clearence") ||
    normalizedKey.includes("clearance") ||
    normalizedKey.includes("duel")
  ) {
    return Shield;
  }

  if (normalizedKey.includes("save")) {
    return Trophy;
  }

  if (normalizedKey.includes("foul")) {
    return Ban;
  }

  if (
    normalizedKey.includes("card") ||
    normalizedKey.includes("error") ||
    normalizedKey.includes("penalty_commited")
  ) {
    return BadgeAlert;
  }

  if (
    normalizedKey.includes("corner") ||
    normalizedKey.includes("freekick") ||
    normalizedKey.includes("penalty")
  ) {
    return Flag;
  }

  if (normalizedKey.includes("offside")) {
    return RectangleHorizontal;
  }

  if (
    normalizedKey.includes("ratio") ||
    normalizedKey.includes("perc") ||
    normalizedKey.includes("percentage")
  ) {
    return Percent;
  }

  if (normalizedKey.includes("xg")) {
    return BadgePercent;
  }

  if (normalizedKey.includes("total")) {
    return Activity;
  }

  if (normalizedKey.includes("team")) {
    return Users;
  }

  if (normalizedKey.includes("big")) {
    return CircleDot;
  }

  if (normalizedKey.includes("woodwork")) {
    return Handshake;
  }

  return CircleHelp;
}
