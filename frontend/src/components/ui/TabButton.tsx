import type { ReactNode } from "react";

const DEFAULT_ACTIVE_CLASS_NAME =
  "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-b-2 border-blue-400";
const DEFAULT_INACTIVE_CLASS_NAME =
  "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-b-2 border-transparent";

type TabButtonProps = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  type?: "button" | "submit" | "reset";
};

export default function TabButton({
  active,
  children,
  onClick,
  disabled,
  className = "",
  activeClassName = DEFAULT_ACTIVE_CLASS_NAME,
  inactiveClassName = DEFAULT_INACTIVE_CLASS_NAME,
  type = "button",
}: TabButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`${className} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
    </button>
  );
}
