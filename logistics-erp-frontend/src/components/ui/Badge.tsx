import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-secondary",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600",
  brand: "bg-brand-50 text-brand-700",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${toneStyles[tone]}`}>
      {children}
    </span>
  );
}
