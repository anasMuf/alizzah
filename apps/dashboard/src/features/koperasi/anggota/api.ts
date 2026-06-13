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
}

export interface MemberInput {
	full_name: string;
	member_type: MemberType;
	phone?: string;
	address?: string;
	is_active?: boolean;
}

export const memberKeys = {
	all: ["koperasi", "members"] as const,
	list: (search: string) => ["koperasi", "members", { search }] as const,
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
