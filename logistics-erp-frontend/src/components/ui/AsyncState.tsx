import type { ReactNode } from "react";

// Consistent loading/error presentation for every data-driven page.
export function AsyncState({
  isLoading,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return <p className="text-sm text-text-secondary">Loading...</p>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-danger-300 bg-danger-50 px-4 py-3 text-sm text-danger-600">
        <span>{error}</span>
        {onRetry && (
          <button onClick={onRetry} className="font-medium underline hover:no-underline">
            Retry
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
