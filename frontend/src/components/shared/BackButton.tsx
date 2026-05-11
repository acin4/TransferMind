import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../ui/design";

type BackButtonProps = {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
};

const backButtonClassName =
  "inline-flex h-11 w-auto items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-xs font-black uppercase tracking-[0.18em] text-white/90 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export default function BackButton({
  href,
  label = "BACK TO TEAMS",
  onClick,
  className,
}: BackButtonProps) {
  const content = (
    <>
      <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        onClick={onClick}
        className={cn(backButtonClassName, className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(backButtonClassName, className)}
    >
      {content}
    </button>
  );
}
