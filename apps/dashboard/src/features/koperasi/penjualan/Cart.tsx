import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { formatCurrency } from "#/utils/format";

export interface CartItem {
	product_id: number;
	product_name: string;
	variant_id: number;
	variant_name: string;
	sale_price: number;
	quantity: number;
	stock: number;
}

interface CartProps {
	items: CartItem[];
	onUpdateQty: (variantId: number, qty: number) => void;
	onRemove: (variantId: number) => void;
}

export function Cart({ items, onUpdateQty, onRemove }: CartProps) {
	const total = items.reduce(
		(sum, item) => sum + item.sale_price * item.quantity,
		0,
	);

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center">
				<div className="rounded-full bg-gray-100 p-4">
					<ShoppingCart className="h-8 w-8 text-gray-300" />
				</div>
				<p className="mt-3 text-sm font-medium text-gray-500">
					Keranjang kosong
				</p>
				<p className="mt-1 text-xs text-gray-400">
					Klik barang di sebelah kiri untuk menambahkan.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{/* Item list */}
			<div className="space-y-2">
				{items.map((item) => {
					const subtotal = item.sale_price * item.quantity;
					const isOverStock = item.quantity > item.stock;

					return (
						<div
							key={item.variant_id}
							className={`rounded-lg border p-3 transition-colors ${
								isOverStock
									? "border-red-200 bg-red-50/50"
									: "border-gray-100 bg-white"
							}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium text-gray-900 truncate">
										{item.product_name}
									</p>
									{item.variant_name !== "Default" && (
										<p className="text-xs text-gray-500">{item.variant_name}</p>
									)}
									<p className="mt-0.5 text-xs text-gray-400">
										{formatCurrency(item.sale_price)} / pcs
									</p>
								</div>
								<button
									type="button"
									onClick={() => onRemove(item.variant_id)}
									className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
									title="Hapus item"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>

							<div className="mt-2 flex items-center justify-between">
								{/* Qty stepper */}
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() =>
											onUpdateQty(item.variant_id, item.quantity - 1)
										}
										disabled={item.quantity <= 1}
										className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									>
										<Minus className="h-3.5 w-3.5" />
									</button>
									<input
										type="number"
										min={1}
										max={item.stock}
										value={item.quantity}
										onChange={(e) => {
											const val = Number.parseInt(e.target.value, 10) || 1;
											onUpdateQty(item.variant_id, Math.max(1, val));
										}}
										className="w-12 rounded-md border border-gray-200 py-1 text-center text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
									<button
										type="button"
										onClick={() =>
											onUpdateQty(item.variant_id, item.quantity + 1)
										}
										disabled={item.quantity >= item.stock}
										className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									>
										<Plus className="h-3.5 w-3.5" />
									</button>
								</div>

								<span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
									{formatCurrency(subtotal)}
								</span>
							</div>

							{isOverStock && (
								<p className="mt-1.5 text-xs font-medium text-red-600">
									Melebihi stok tersedia ({item.stock})
								</p>
							)}
						</div>
					);
				})}
			</div>

			{/* Total */}
			<div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100/50 px-4 py-3">
				<span className="text-sm font-medium text-gray-600">Total</span>
				<span className="text-lg font-bold text-indigo-700">
					{formatCurrency(total)}
				</span>
			</div>
		</div>
	);
}
