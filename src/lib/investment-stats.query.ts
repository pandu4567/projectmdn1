import { queryOptions } from "@tanstack/react-query";
import { getInvestmentStats } from "@/lib/investment-stats.functions";
import { refreshInterval, type InvestmentCategory } from "@/lib/investment-stats";

export const investmentStatsOptions = (category: InvestmentCategory) => queryOptions({
  queryKey: ["investment-statistics", category],
  queryFn: () => getInvestmentStats({ data: { category } }),
  staleTime: 60_000,
  refetchInterval: () => refreshInterval(category, new Date()),
  refetchIntervalInBackground: false,
  retry: 1,
});