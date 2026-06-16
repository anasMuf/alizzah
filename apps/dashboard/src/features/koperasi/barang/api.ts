import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGet, kopSend } from "../lib/client";

export interface ProductVariant {
	id: number;
	name: string;
	cost_price: number;
	sale_price: number;
	stock: number;
	is_active: boolean;
}

export interface Product {
	id: number;
	name: string;
	category?: string;
	unit?: string;
	is_active: boolean;
	variants: ProductVariant[];
	variant_count: number;
	// Agregat kompatibilitas dari backend: harga varian default, total stok.
	cost_price: number;
	sale_price: number;
	stock: number;
}

export interface VariantInput {
	id?: number; // >0 → perbarui varian yang ada; kosong → varian baru
	name: string;
	cost_price: number;
	sale_price: number;
	stock?: number; // stok awal varian baru; update diabaikan backend
	is_active?: boolean;
}

export interface ProductInput {
	name: string;
	category?: string;
	unit?: string;
	is_active?: boolean;
	// Kirim variants[] untuk barang ber-varian; atau field tunggal di bawah untuk
	// barang sederhana (backend membuat/memperbarui satu varian "Default").
	variants?: VariantInput[];
	cost_price?: number;
	sale_price?: number;
	stock?: number; // hanya dipakai saat create (stok awal); update diabaikan backend
}

export const productKeys = {
	all: ["koperasi", "products"] as const,
	list: (search: string) => ["koperasi", "products", { search }] as const,
};

export function useProducts(search = "") {
	return useQuery({
		queryKey: productKeys.list(search),
		queryFn: () =>
			kopGet<Product[]>("/products", search ? { search } : undefined),
	});
}

export function useCreateProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: ProductInput) =>
			kopSend<Product>("POST", "/products", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
	});
}

export function useUpdateProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: ProductInput }) =>
			kopSend<Product>("PUT", `/products/${id}`, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
	});
}

export function useDeleteProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => kopSend<null>("DELETE", `/products/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
	});
}
