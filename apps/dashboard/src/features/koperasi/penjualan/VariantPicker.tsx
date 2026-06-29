import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Product } from "../barang/api";
import type { AddItemPayload } from "./ProductGrid";

interface VariantPickerProps {
	product: Product;
	onSelect: (item: AddItemPayload) => void;
	onClose: () => void;
}

export function VariantPicker({
	product,
	onSelect,
	onClose,
}: VariantPickerProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const activeVariants = product.variants.filter((v) => v.is_active);

	return (
		<div
			ref={overlayRef}
			role="dialog"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === overlayRef.current) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div className="w-full max-w-sm mx-4 rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 animate-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
					<div>
						<h3 className="text-base font-semibold text-gray-900">
							Pilih Varian
						</h3>
						<p className="text-sm text-gray-500">{product.name}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Variant List */}
				<div className="max-h-72 overflow-y-auto p-2">
					{activeVariants.map((v) => {
						const outOfStock = v.stock <= 0;
						return (
							<button
								key={v.id}
								type="button"
								disabled={outOfStock}
								onClick={() => {
									onSelect({
										product_id: product.id,
										product_name: product.name,
										variant_id: v.id,
										variant_name: v.name,
										sale_price: v.sale_price,
										stock: v.stock,
									});
									onClose();
								}}
								className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-all duration-100 ${
									outOfStock
										? "cursor-not-allowed opacity-50"
										: "hover:bg-indigo-50 active:bg-indigo-100"
								}`}
							>
								<div>
									<span className="text-sm font-medium text-gray-900">
										{v.name}
									</span>
									<span
										className={`ml-2 text-xs ${outOfStock ? "text-red-500" : "text-gray-400"}`}
									>
										{outOfStock ? "Habis" : `Stok ${v.stock}`}
									</span>
								</div>
								<span className="text-sm font-semibold text-indigo-600 whitespace-nowrap">
									{new Intl.NumberFormat("id-ID", {
										style: "currency",
										currency: "IDR",
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}).format(v.sale_price)}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
