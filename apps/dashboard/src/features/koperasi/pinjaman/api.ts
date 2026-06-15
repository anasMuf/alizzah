import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGet, kopGetPaged, kopSend } from "../lib/client";

export type LoanStatus = "unpaid" | "partial" | "paid";
export type RepaymentMethod = "potong_gaji" | "manual";
export type PaymentMethod = "cash" | "potong_gaji";

export interface Installment {
	sequence: number;
	amount_due: number;
	amount_paid: number;
	status: LoanStatus;
}

export interface Loan {
	id: number;
	academic_year_id: number;
	member_id: number;
	member_name?: string;
	purpose: string;
	principal: number;
	tenor: number;
	repayment_method: RepaymentMethod;
	loan_date: string;
	paid_amount: number;
	remaining: number;
	status: LoanStatus;
	notes?: string;
	installments?: Installment[];
	created_by?: string;
	created_at: string;
}

export interface LoanInput {
	academic_year_id: number;
	member_id: number;
	purpose: string;
	principal: number;
	tenor: number;
	repayment_method: RepaymentMethod;
	loan_date: string;
	notes?: string;
}

export interface PaymentInput {
	amount: number;
	payment_date: string;
	method?: PaymentMethod;
	notes?: string;
}

export interface LoanSummaryItem {
	member_id: number;
	member_name: string;
	loan_count: number;
	total_principal: number;
	total_paid: number;
	remaining: number;
}

export const loanKeys = {
	all: ["koperasi", "loans"] as const,
	list: (ayId: number, page: number, status: string) =>
		["koperasi", "loans", ayId, page, status] as const,
	detail: (id: number) => ["koperasi", "loans", "detail", id] as const,
	summary: (ayId: number) => ["koperasi", "loans", "summary", ayId] as const,
};

// Pinjaman menggerakkan kas (pencairan = keluar, angsuran = masuk) → invalidate
// loans + summary + cash.
function invalidateLoanEffects(qc: ReturnType<typeof useQueryClient>) {
	qc.invalidateQueries({ queryKey: loanKeys.all });
	qc.invalidateQueries({ queryKey: ["koperasi", "cash"] });
}

export function useLoans(ayId?: number, page = 1, status = "", limit = 20) {
	return useQuery({
		queryKey: loanKeys.list(ayId ?? 0, page, status),
		queryFn: () =>
			kopGetPaged<Loan[]>("/loans", {
				academic_year_id: ayId,
				page,
				limit,
				...(status ? { status } : {}),
			}),
		enabled: !!ayId,
	});
}

export function useLoan(id?: number) {
	return useQuery({
		queryKey: loanKeys.detail(id ?? 0),
		queryFn: () => kopGet<Loan>(`/loans/${id}`),
		enabled: !!id,
	});
}

export function useLoanSummary(ayId?: number) {
	return useQuery({
		queryKey: loanKeys.summary(ayId ?? 0),
		queryFn: () =>
			kopGet<LoanSummaryItem[]>("/loans/summary", {
				academic_year_id: ayId,
			}),
		enabled: !!ayId,
	});
}

export function useCreateLoan() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: LoanInput) => kopSend<Loan>("POST", "/loans", data),
		onSuccess: () => invalidateLoanEffects(qc),
	});
}

export function usePayLoan(id: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: PaymentInput) =>
			kopSend<Loan>("POST", `/loans/${id}/payments`, data),
		onSuccess: () => {
			invalidateLoanEffects(qc);
			qc.invalidateQueries({ queryKey: loanKeys.detail(id) });
		},
	});
}
