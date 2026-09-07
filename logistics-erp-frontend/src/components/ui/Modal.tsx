import type { ReactNode } from "react";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  free: "max-w-none",
} as const;
export function Modal({
  open,
  title,
  onClose,
  size = "md",
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  size?: keyof typeof SIZE_CLASSES;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8">
      <div
        className={`flex w-full ${SIZE_CLASSES[size]} max-h-[85vh] flex-col rounded-xl border border-border bg-surface shadow-lg`}
      >
        <div className="flex items-center justify-between border-b-2 border-b-brand-700/15 px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-secondary hover:bg-surface-muted hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
