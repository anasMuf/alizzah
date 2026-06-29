import { Package, Search } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { Badge } from "#/components/ui";
import { type Product, useProducts } from "../barang/api";

export interface AddItemPayloadPembelian {
	product_id: number;
	product_name: string;
	variant_id: number;
	variant_name: string;
	cost_price: number;
	stock: number;
}

interface ProductGridPembelianProps {
	onAddItem: (item: AddItemPayloadPembelian) => void;
	onPickVariant: (product: Product) => void;
}

export function ProductGridPembelian({
	onAddItem,
	onPickVariant,
}: ProductGridPembelianProps) {
	const [query, setQuery] = useState("");
	const [debounced] = useDebounce(query, 300);
	const { data: products = [], isLoading } = useProducts(debounced);

	const handleClick = (product: Product) => {
		const activeVariants = product.variants.filter((v) => v.is_active);
		if (activeVariants.length === 0) return;

		if (activeVariants.length === 1) {
			const v = activeVariants[0];
			onAddItem({
				product_id: product.id,
				product_name: product.name,
				variant_id: v.id,
				variant_name: v.name,
				cost_price: v.cost_price,
				stock: v.stock,
			});
		} else {
			onPickVariant(product);
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Search */}
			<div className="relative mb-4 shrink-0">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input
					id="pos-search"
					type="text"
					placeholder="Cari barang untuk di-restok…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
				/>
			</div>

			{/* Grid */}
			<div className="flex-1 min-h-0 overflow-y-auto">
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
						<span className="ml-2 text-sm text-gray-500">Memuat barang…</span>
					</div>
				) : products.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Package className="h-10 w-10 text-gray-300" />
						<p className="mt-2 text-sm text-gray-500">
							{debounced ? "Tidak ada barang cocok." : "Belum ada barang."}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-3 xl:grid-cols-3 pb-2">
						{products.map((p) => (
							<ProductCard
								key={p.id}
								product={p}
								onClick={() => handleClick(p)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function ProductCard({
	product,
	onClick,
}: {
	product: Product;
	onClick: () => void;
}) {
	const totalStock = product.stock;
	const activeVariants = product.variants.filter((v) => v.is_active);
	const hasMultiVariants = activeVariants.length > 1;
	const displayPrice = product.cost_price; // Harga beli (modal)

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={activeVariants.length === 0}
			className={`group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all duration-150 ${
				activeVariants.length === 0
					? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
					: "cursor-pointer border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/50 active:scale-[0.98]"
			}`}
		>
			{/* Header */}
			<div className="flex w-full items-start justify-between gap-2">
				<h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
					{product.name}
				</h3>
				{hasMultiVariants && (
					<Badge variant="info">{activeVariants.length} varian</Badge>
				)}
			</div>

			{/* Category */}
			{product.category && (
				<span className="mt-1 text-xs text-gray-400">{product.category}</span>
			)}

			{/* Price & Stock */}
			<div className="mt-auto pt-3 flex w-full items-end justify-between">
				<span className="text-sm font-bold text-indigo-600">
					{new Intl.NumberFormat("id-ID", {
						style: "currency",
						currency: "IDR",
						minimumFractionDigits: 0,
						maximumFractionDigits: 0,
					}).format(displayPrice)}
				</span>
				<span
					className={`text-xs font-medium ${
						totalStock <= 0 ? "text-amber-500" : "text-gray-500"
					}`}
				>
					{totalStock <= 0 ? "Habis" : `Stok ${totalStock}`}
				</span>
			</div>

			{/* Hover indicator */}
			{activeVariants.length > 0 && (
				<div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-xl bg-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
			)}
		</button>
	);
}
