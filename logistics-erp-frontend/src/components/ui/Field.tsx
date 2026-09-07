import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      {children}
    </div>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${className}`}
    />
  );
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${className}`}
    />
  );
}
