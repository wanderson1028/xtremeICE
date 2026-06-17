import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Fetches ALL feature flags at once and returns a map of { key: is_enabled }.
 * Admins bypass flag checks entirely (always true).
 */
export function useFeatureFlags(isAdmin = false) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["feature-flags-all"],
    queryFn: () => base44.entities.FeatureFlag.list(),
    staleTime: 60_000,
    retry: false,
    enabled: !isAdmin,
  });

  if (isAdmin) {
    return { flags: null, isLoading: false }; // null = bypass all checks
  }

  const flags = {};
  data.forEach((f) => { flags[f.key] = f.is_enabled === true; });
  return { flags, isLoading };
}

/** Returns true if the flag is enabled (or if admin bypass). */
export function isFlagOn(flags, key) {
  if (flags === null) return true; // admin bypass
  return flags[key] === true;
}