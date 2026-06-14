import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGet, kopSend } from "../lib/client";

export interface Supplier {
	id: number;
	name: string;
	contact_person?: string;
	phone?: string;
	address?: string;
}

export interface SupplierInput {
	name: string;
	contact_person?: string;
	phone?: string;
	address?: string;
}

export const supplierKeys = {
	all: ["koperasi", "suppliers"] as const,
	list: (search: string) => ["koperasi", "suppliers", { search }] as const,
};

export function useSuppliers(search = "") {
	return useQuery({
		queryKey: supplierKeys.list(search),
		queryFn: () =>
			kopGet<Supplier[]>("/suppliers", search ? { search } : undefined),
	});
}

export function useCreateSupplier() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: SupplierInput) =>
			kopSend<Supplier>("POST", "/suppliers", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: supplierKeys.all }),
	});
}

export function useUpdateSupplier() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: SupplierInput }) =>
			kopSend<Supplier>("PUT", `/suppliers/${id}`, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: supplierKeys.all }),
	});
}

export function useDeleteSupplier() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => kopSend<null>("DELETE", `/suppliers/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: supplierKeys.all }),
	});
}
