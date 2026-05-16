import { Info } from "lucide-react";

export function CapLimitNotice({ cap }: { cap: number }) {
  const message =
    cap === 1
      ? "Your active practice list is full. Pause it to start this one."
      : `You already have ${cap} active practices. Pause one to start this one.`;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
      <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
      <p className="text-sm text-amber-900 dark:text-amber-200">{message}</p>
    </div>
  );
}
