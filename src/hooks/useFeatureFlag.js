import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Returns { enabled: boolean, isLoading: boolean } for a given flag key.
 * Non-admins always get enabled=false since they cannot read FeatureFlag records.
 */
export function useFeatureFlag(key) {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flag", key],
    queryFn: async () => {
      const results = await base44.entities.FeatureFlag.filter({ key });
      return results[0] ?? null;
    },
    staleTime: 60_000,
    retry: false,
  });

  return {
    enabled: data?.is_enabled === true,
    isLoading,
  };
}