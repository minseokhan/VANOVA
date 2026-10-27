import { cn } from "@/lib/utils/cn";

const VARIANT = {
  primary: "rounded-md bg-navy-700 text-white font-medium hover:bg-navy-900",
  secondary: "rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "rounded-md bg-red-50 text-red-700 font-medium hover:bg-red-100",
  soft: "rounded-md bg-navy-50 text-navy-700 font-medium hover:bg-navy-100",
  text: "text-navy-500 hover:underline",
} as const;

const SIZE = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" } as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
};

/** 버튼처럼 보여야 하는 Link 등에 재사용 */
export function buttonClass({ variant = "primary", size = "md" }: Pick<ButtonProps, "variant" | "size"> = {}) {
  return cn(
    "inline-flex items-center gap-1.5 whitespace-nowrap transition-colors disabled:opacity-60",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500",
    VARIANT[variant],
    variant === "text" ? (size === "sm" ? "text-xs" : "text-sm") : SIZE[size],
  );
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClass({ variant, size }), className)} {...props} />;
}
