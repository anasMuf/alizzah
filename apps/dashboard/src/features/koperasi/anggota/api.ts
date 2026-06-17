import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGet, kopSend } from "../lib/client";

export type MemberType = "pegawai" | "pengurus_yayasan" | "pihak_luar";

export interface Member {
	id: number;
	full_name: string;
	member_type: MemberType;
	phone?: string;
	address?: string;
	is_active: boolean;
	employee_id?: number;
	employee_name?: string;
}

export interface MemberInput {
	full_name: string;
	member_type: MemberType;
	phone?: string;
	address?: string;
	is_active?: boolean;
	employee_id?: number;
}

export interface BulkCreateRequest {
	members: MemberInput[];
}

export interface LoanSummary {
	active_loan_count: number;
	total_principal: number;
	total_paid: number;
	total_remaining: number;
}

export interface MemberDetail extends Member {
	loan_summary: LoanSummary;
}

export interface Employee {
	id: number;
	legacy_id: number;
	full_name: string;
	join_date?: string;
	is_active: boolean;
}

export const memberKeys = {
	all: ["koperasi", "members"] as const,
	list: (search: string) => ["koperasi", "members", { search }] as const,
	detail: (id: number) => ["koperasi", "members", id] as const,
};

export const employeeKeys = {
	all: ["koperasi", "employees"] as const,
	available: ["koperasi", "employees", "available"] as const,
};

export function useMembers(search = "") {
	return useQuery({
		queryKey: memberKeys.list(search),
		queryFn: () =>
			kopGet<Member[]>("/members", search ? { search } : undefined),
	});
}

export function useCreateMember() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: MemberInput) =>
			kopSend<Member>("POST", "/members", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
	});
}

export function useUpdateMember() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: MemberInput }) =>
			kopSend<Member>("PUT", `/members/${id}`, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
	});
}

export function useDeleteMember() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => kopSend<null>("DELETE", `/members/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
	});
}

export function useMemberDetail(id: number) {
	return useQuery({
		queryKey: memberKeys.detail(id),
		queryFn: () => kopGet<MemberDetail>(`/members/${id}/detail`),
		enabled: !!id,
	});
}

export function useBulkCreateMembers() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: BulkCreateRequest) =>
			kopSend<Member[]>("POST", "/members/bulk", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
	});
}

export function useEmployees(search = "") {
	return useQuery({
		queryKey: [...employeeKeys.all, { search }],
		queryFn: () =>
			kopGet<Employee[]>("/employees", search ? { search } : undefined),
	});
}

export function useAvailableEmployees(search = "") {
	return useQuery({
		queryKey: [...employeeKeys.available, { search }],
		queryFn: () =>
			kopGet<Employee[]>("/employees/available", search ? { search } : undefined),
	});
}
