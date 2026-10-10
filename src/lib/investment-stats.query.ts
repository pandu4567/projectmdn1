import { queryOptions } from "@tanstack/react-query";
import { getInvestmentStats } from "@/lib/investment-stats.functions";
import { educationStats, isEducationCategory, refreshInterval, type InvestmentCategory } from "@/lib/investment-stats";

export const investmentStatsOptions = (category: InvestmentCategory) => queryOptions({
  queryKey: ["investment-statistics", category, isEducationCategory(category) ? "education-v1" : "market"],
  queryFn: () => isEducationCategory(category) ? educationStats(category) : getInvestmentStats({ data: { category } }),
  staleTime: 60_000,
  refetchInterval: () => refreshInterval(category, new Date()),
  refetchIntervalInBackground: false,
  retry: 1,
});