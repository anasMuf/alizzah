import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getGetV1StudentsIdQueryKey,
	getGetV1StudentsQueryKey,
} from "#/api/endpoints/students/students";
import { customInstance } from "#/api/mutator/custom-instance";

export interface StudentDeleteItem {
	key: string;
	label: string;
	count: number;
	amount?: number;
	note?: string;
}

export interface StudentDeleteFinancial {
	total_payments: number;
	total_invoices: number;
	paid_invoices: number;
	outstanding: number;
	savings_balance: number;
	koperasi_sales: number;
	cash_transactions: number;
	vault_transactions: number;
	related_expenses: number;
}

export interface StudentDeletePreview {
	student_id: number;
	full_name: string;
	status: string;
	items: StudentDeleteItem[];
	financial: StudentDeleteFinancial;
	requires_force: boolean;
}

type SuccessEnvelope<T> = {
	status: number;
	message: string;
	data: T;
};

type ApiResponse<T> = {
	data: SuccessEnvelope<T>;
	status: number;
};

// useStudentDeletePreview mengambil ringkasan data terhubung. Query hanya
// dijalankan saat dialog dibuka agar tidak membebani halaman detail.
export function useStudentDeletePreview(studentId: number, enabled: boolean) {
	return useQuery({
		queryKey: ["students", studentId, "delete-preview"],
		queryFn: async () => {
			const res = await customInstance<ApiResponse<StudentDeletePreview>>(
				`/v1/students/${studentId}/delete-preview`,
			);
			return res.data.data;
		},
		enabled: enabled && Number.isFinite(studentId),
	});
}

// useDeleteStudentCascade menghapus siswa + data terhubung. Backend mewajibkan
// confirm_name dan force=true bila ada data finansial.
export function useDeleteStudentCascade() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			confirmName,
			force,
		}: {
			id: number;
			confirmName: string;
			force: boolean;
		}) =>
			customInstance<ApiResponse<unknown>>(`/v1/students/${id}`, {
				method: "DELETE",
				params: {
					confirm_name: confirmName,
					force: force ? "true" : undefined,
				},
			}),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: getGetV1StudentsQueryKey() });
			qc.invalidateQueries({ queryKey: getGetV1StudentsIdQueryKey(vars.id) });
			qc.invalidateQueries({
				queryKey: ["students", vars.id, "delete-preview"],
			});
		},
	});
}
