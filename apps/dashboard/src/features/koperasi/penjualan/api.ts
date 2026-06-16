import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGet, kopGetPaged, kopSend } from "../lib/client";

export type SaleStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash";

export interface SaleItem {
	product_id: number;
	product_name: string;
	quantity: number;
	unit_price: number;
	unit_cost: number;
	subtotal: number;
}

export interface Sale {
	id: number;
	academic_year_id: number;
	student_id?: number;
	student_name?: string;
	buyer_name?: string;
	sale_date: string;
	total_amount: number;
	paid_amount: number;
	remaining: number;
	status: SaleStatus;
	profit: number;
	notes?: string;
	items: SaleItem[];
	created_by?: string;
	created_at: string;
}

export interface SaleItemInput {
	product_id: number;
	quantity: number;
	unit_price?: number;
}

export interface SaleInput {
	academic_year_id: number;
	student_id?: number;
	buyer_name?: string;
	sale_date: string;
	notes?: string;
	items: SaleItemInput[];
	initial_payment?: number;
	payment_method?: PaymentMethod;
}

export interface PaymentInput {
	amount: number;
	payment_date: string;
	method?: PaymentMethod;
	notes?: string;
}

export const saleKeys = {
	all: ["koperasi", "sales"] as const,
	list: (ayId: number, page: number, status: string) =>
		["koperasi", "sales", ayId, page, status] as const,
	detail: (id: number) => ["koperasi", "sales", "detail", id] as const,
};

// Penjualan mengubah stok & kas → invalidate ketiga area terkait.
function invalidateSaleEffects(qc: ReturnType<typeof useQueryClient>) {
	qc.invalidateQueries({ queryKey: saleKeys.all });
	qc.invalidateQueries({ queryKey: ["koperasi", "cash"] });
	qc.invalidateQueries({ queryKey: ["koperasi", "products"] });
}

export function useSales(ayId?: number, page = 1, status = "", limit = 20) {
	return useQuery({
		queryKey: saleKeys.list(ayId ?? 0, page, status),
		queryFn: () =>
			kopGetPaged<Sale[]>("/sales", {
				academic_year_id: ayId,
				page,
				limit,
				...(status ? { status } : {}),
			}),
		enabled: !!ayId,
	});
}

export function useSale(id?: number) {
	return useQuery({
		queryKey: saleKeys.detail(id ?? 0),
		queryFn: () => kopGet<Sale>(`/sales/${id}`),
		enabled: !!id,
	});
}

export function useCreateSale() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: SaleInput) => kopSend<Sale>("POST", "/sales", data),
		onSuccess: () => invalidateSaleEffects(qc),
	});
}

export function usePaySale(id: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: PaymentInput) =>
			kopSend<Sale>("POST", `/sales/${id}/payments`, data),
		onSuccess: () => {
			invalidateSaleEffects(qc);
			qc.invalidateQueries({ queryKey: saleKeys.detail(id) });
		},
	});
}
