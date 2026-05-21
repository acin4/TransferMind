import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import BackButton from "../shared/BackButton";

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
  const navigate = useNavigate();
  const shouldUseStatefulBack = backState !== undefined;

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <BackButton
            href={shouldUseStatefulBack ? undefined : backTo}
            label={backLabel}
            onClick={
              shouldUseStatefulBack
                ? () => navigate(backTo, { state: backState })
                : undefined
            }
          />
        </div>

        {children}
      </div>
    </div>
  );
}
