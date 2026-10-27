import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "navy" | "green" | "amber" | "red" | "orange" | "yellow" | "sky" | "teal" | "solid";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  navy: "bg-navy-100 text-navy-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  sky: "bg-sky-100 text-sky-700",
  teal: "bg-teal-100 text-teal-700",
  solid: "bg-navy-700 text-white",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium", TONE[tone], className)}
      {...props}
    />
  );
}
