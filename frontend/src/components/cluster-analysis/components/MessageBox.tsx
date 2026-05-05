import type { MessageBoxProps } from "../types";

export function MessageBox({
  tone,
  messages,
}: MessageBoxProps) {
  const toneClass =
    tone === "error"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
      : "border-yellow-500/20 bg-yellow-500/10 text-yellow-200";

  return (
    <div className={`mt-5 rounded-2xl border px-5 py-4 ${toneClass}`}>
      <ul className="space-y-2 text-xs font-bold uppercase tracking-widest">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
