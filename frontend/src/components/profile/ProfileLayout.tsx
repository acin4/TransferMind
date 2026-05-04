import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type ProfileLayoutProps = {
  backTo: string;
  backLabel: string;
  backState?: unknown;
  children: ReactNode;
};

export default function ProfileLayout({
  backTo,
  backLabel,
  backState,
  children,
}: ProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link
          to={backTo}
          state={backState}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors font-bold uppercase text-xs tracking-widest"
        >
          <ArrowLeft size={16} /> {backLabel}
        </Link>

        {children}
      </div>
    </div>
  );
}
