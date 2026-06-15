import { useQuery } from "@tanstack/react-query";
import { kopGet } from "../lib/client";

export interface CategoryLine {
	category: string;
	credit: number;
	debit: number;
	net: number;
}
export interface MonthlyReport {
	month: number;
	year: number;
	categories: CategoryLine[] | null;
	total_credit: number;
	total_debit: number;
	net: number;
}

export interface ProfitLoss {
	start_date?: string;
	end_date?: string;
	revenue: number;
	cost_of_goods: number;
	gross_profit: number;
	operating_expense: number;
	net_profit: number;
}

export interface OutstandingItem {
	id: number;
	party: string;
	date: string;
	total_amount: number;
	paid_amount: number;
	remaining: number;
	status: string;
}
export interface OutstandingReport {
	items: OutstandingItem[] | null;
	total_remaining: number;
}

export interface StockItem {
	product_id: number;
	name: string;
	stock: number;
	cost_price: number;
	sale_price: number;
	stock_value: number;
}
export interface StockReport {
	items: StockItem[] | null;
	total_stock_value: number;
}

export const reportKeys = {
	monthly: (ayId: number, month: number, year: number) =>
		["koperasi", "reports", "monthly", ayId, month, year] as const,
	profitLoss: (ayId: number, start: string, end: string) =>
		["koperasi", "reports", "profit-loss", ayId, start, end] as const,
	receivables: (ayId: number) =>
		["koperasi", "reports", "receivables", ayId] as const,
	payables: (ayId: number) =>
		["koperasi", "reports", "payables", ayId] as const,
	stock: (ayId: number) => ["koperasi", "reports", "stock", ayId] as const,
};

export function useMonthlyReport(ayId?: number, month?: number, year?: number) {
	return useQuery({
		queryKey: reportKeys.monthly(ayId ?? 0, month ?? 0, year ?? 0),
		queryFn: () =>
			kopGet<MonthlyReport>("/reports/monthly", {
				academic_year_id: ayId,
				...(month ? { month } : {}),
				...(year ? { year } : {}),
			}),
		enabled: !!ayId,
	});
}

export function useProfitLoss(ayId?: number, start = "", end = "") {
	return useQuery({
		queryKey: reportKeys.profitLoss(ayId ?? 0, start, end),
		queryFn: () =>
			kopGet<ProfitLoss>("/reports/profit-loss", {
				academic_year_id: ayId,
				...(start ? { start_date: start } : {}),
				...(end ? { end_date: end } : {}),
			}),
		enabled: !!ayId,
	});
}

export function useReceivables(ayId?: number) {
	return useQuery({
		queryKey: reportKeys.receivables(ayId ?? 0),
		queryFn: () =>
			kopGet<OutstandingReport>("/reports/receivables", {
				academic_year_id: ayId,
			}),
		enabled: !!ayId,
	});
}

export function usePayables(ayId?: number) {
	return useQuery({
		queryKey: reportKeys.payables(ayId ?? 0),
		queryFn: () =>
			kopGet<OutstandingReport>("/reports/payables", {
				academic_year_id: ayId,
			}),
		enabled: !!ayId,
	});
}

export function useStockReport(ayId?: number) {
	return useQuery({
		queryKey: reportKeys.stock(ayId ?? 0),
		queryFn: () =>
			kopGet<StockReport>("/reports/stock", { academic_year_id: ayId }),
		enabled: !!ayId,
	});
}
