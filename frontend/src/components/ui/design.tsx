import type { ReactNode } from "react";
import { Search, type LucideIcon } from "lucide-react";

export function cn(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export const standingsTheme = {
  pageShell:
    "min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans selection:bg-blue-500/30",
  pageContainer: "max-w-6xl mx-auto animate-in fade-in duration-500",
  header:
    "flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8",
  title:
    "text-5xl md:text-6xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-white via-blue-400 to-blue-600 bg-clip-text text-transparent leading-none",
  eyebrow:
    "text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4 flex items-center gap-2",
  searchWrap: "relative mb-6 max-w-xl",
  searchIcon:
    "absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500",
  searchInput:
    "w-full rounded-2xl border border-slate-800 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500",
  segmentedTabs:
    "flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto",
  compactSegmentedTabs:
    "flex flex-wrap gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-1.5",
  segmentedTabButton:
    "px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
  compactSegmentedTabButton:
    "shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
  panel:
    "bg-slate-900/40 border border-slate-800/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500",
  panelContent:
    "bg-slate-900/40 border border-slate-800/60 rounded-[3rem] p-6 md:p-8 shadow-2xl backdrop-blur-xl",
  nestedPanel:
    "rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-xl",
  emptyPanel:
    "text-center p-16 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500",
  loadingPanel:
    "text-center p-32 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] italic animate-pulse font-black uppercase tracking-widest text-blue-500 flex flex-col items-center gap-4",
  errorPanel:
    "text-center p-20 bg-rose-500/10 border border-rose-500/20 rounded-[3rem] text-rose-400 font-black uppercase tracking-widest",
  pill:
    "px-4 py-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-[11px] font-black uppercase tracking-widest text-slate-300",
  compactPill:
    "px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-300",
  select:
    "w-full appearance-none bg-slate-900 border-2 border-slate-800 text-white pl-12 pr-10 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl disabled:opacity-50 truncate",
  bareSelect:
    "w-full appearance-none bg-slate-900 border-2 border-slate-800 text-white px-4 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl disabled:opacity-50 truncate",
  selectIcon:
    "absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none group-hover:text-white transition-colors",
  selectChevron:
    "absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors",
  tableHead:
    "bg-slate-900/90 border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.25em]",
  rowHover: "hover:bg-blue-500/[0.03] transition-all group",
  teamName:
    "font-black tracking-tighter uppercase italic group-hover:text-blue-400 transition-colors",
};

type PageShellProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function PageShell({
  children,
  className,
  containerClassName,
}: PageShellProps) {
  return (
    <div className={cn(standingsTheme.pageShell, className)}>
      <div className={cn(standingsTheme.pageContainer, containerClassName)}>
        {children}
      </div>
    </div>
  );
}

type PageHeaderProps = {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(standingsTheme.header, className)}>
      <div>
        <h1 className={standingsTheme.title}>{title}</h1>
        <p className={standingsTheme.eyebrow}>
          {Icon ? <Icon size={14} className="text-blue-500" /> : null}
          {subtitle}
        </p>
      </div>
      {actions}
    </div>
  );
}

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: SearchInputProps) {
  return (
    <div className={cn(standingsTheme.searchWrap, className)}>
      <div className={standingsTheme.searchIcon}>
        <Search size={16} />
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={standingsTheme.searchInput}
      />
    </div>
  );
}

export function SurfacePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(standingsTheme.panel, className)}>{children}</div>;
}

export function ContentPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(standingsTheme.panelContent, className)}>
      {children}
    </section>
  );
}

export function SummaryPill({ children }: { children: ReactNode }) {
  return <span className={standingsTheme.pill}>{children}</span>;
}
