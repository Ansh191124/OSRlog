import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = "rounded-md px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-60";
  const styles: Record<Variant, string> = {
    primary: "bg-brand-700 text-white shadow-sm hover:bg-brand-800",
    secondary: "border border-border text-text-secondary hover:border-brand-300 hover:bg-surface-muted hover:text-text-primary",
  };
  return <button {...props} className={`${base} ${styles[variant]} ${className}`} />;
}
