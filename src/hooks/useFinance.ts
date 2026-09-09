import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getFinanceProvider } from "@/lib/finance/provider";
import { buildOverview } from "@/lib/finance/analysis";
import type { FinancialSnapshot } from "@/lib/finance/types";

export const snapshotQueryOptions = queryOptions({
  queryKey: ["finance", "snapshot"],
  queryFn: (): Promise<FinancialSnapshot> => getFinanceProvider().getSnapshot(),
  staleTime: 60_000,
});

export function useSnapshot() {
  const { data } = useSuspenseQuery(snapshotQueryOptions);
  return data;
}

export function useOverview() {
  const snapshot = useSnapshot();
  return { snapshot, overview: buildOverview(snapshot) };
}
