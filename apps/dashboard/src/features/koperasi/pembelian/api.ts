import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGet, kopGetPaged, kopSend } from "../lib/client";

export type PurchaseStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "potong_gaji";

export interface PurchaseItem {
	product_id: number;
	product_name: string;
	quantity: number;
	unit_price: number;
	subtotal: number;
}

export interface Purchase {
	id: number;
	academic_year_id: number;
	supplier_id: number;
	supplier_name?: string;
	purchase_date: string;
	reference_number?: string;
	total_amount: number;
	paid_amount: number;
	remaining: number;
	status: PurchaseStatus;
	notes?: string;
	items: PurchaseItem[];
	created_by?: string;
	created_at: string;
}

export interface PurchaseItemInput {
	product_id: number;
	quantity: number;
	unit_price: number;
}

export interface PurchaseInput {
	academic_year_id: number;
	supplier_id: number;
	purchase_date: string;
	reference_number?: string;
	notes?: string;
	items: PurchaseItemInput[];
	initial_payment?: number;
	payment_method?: PaymentMethod;
}

export interface PaymentInput {
	amount: number;
	payment_date: string;
	method?: PaymentMethod;
	notes?: string;
}

export const purchaseKeys = {
	all: ["koperasi", "purchases"] as const,
	list: (ayId: number, page: number, status: string) =>
		["koperasi", "purchases", ayId, page, status] as const,
	detail: (id: number) => ["koperasi", "purchases", "detail", id] as const,
};

// Pembelian mengubah stok & kas → invalidate ketiga area terkait.
function invalidatePurchaseEffects(qc: ReturnType<typeof useQueryClient>) {
	qc.invalidateQueries({ queryKey: purchaseKeys.all });
	qc.invalidateQueries({ queryKey: ["koperasi", "cash"] });
	qc.invalidateQueries({ queryKey: ["koperasi", "products"] });
}

export function usePurchases(ayId?: number, page = 1, status = "", limit = 20) {
	return useQuery({
		queryKey: purchaseKeys.list(ayId ?? 0, page, status),
		queryFn: () =>
			kopGetPaged<Purchase[]>("/purchases", {
				academic_year_id: ayId,
				page,
				limit,
				...(status ? { status } : {}),
			}),
		enabled: !!ayId,
	});
}

export function usePurchase(id?: number) {
	return useQuery({
		queryKey: purchaseKeys.detail(id ?? 0),
		queryFn: () => kopGet<Purchase>(`/purchases/${id}`),
		enabled: !!id,
	});
}

export function useCreatePurchase() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: PurchaseInput) =>
			kopSend<Purchase>("POST", "/purchases", data),
		onSuccess: () => invalidatePurchaseEffects(qc),
	});
}

export function usePayPurchase(id: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: PaymentInput) =>
			kopSend<Purchase>("POST", `/purchases/${id}/payments`, data),
		onSuccess: () => {
			invalidatePurchaseEffects(qc);
			qc.invalidateQueries({ queryKey: purchaseKeys.detail(id) });
		},
	});
}
