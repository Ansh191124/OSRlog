import { useCallback, useEffect, useState } from "react";

// Standard fetch-on-mount pattern used across every page: track loading/error
// state consistently and never leave the UI spinning silently on failure.
export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, reload: load, setData };
}
