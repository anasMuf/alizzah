import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { CurrencyInput } from "#/components/ui";
import { formatCurrency } from "#/utils/format";

export interface CartItemPembelian {
	product_id: number;
	product_name: string;
	variant_id: number;
	variant_name: string;
	cost_price: number;
	quantity: number;
	stock: number; // Tampilkan stok saat ini untuk info
}

interface CartPembelianProps {
	items: CartItemPembelian[];
	onUpdateQty: (variantId: number, qty: number) => void;
	onUpdatePrice: (variantId: number, price: number) => void;
	onRemove: (variantId: number) => void;
}

export function CartPembelian({
	items,
	onUpdateQty,
	onUpdatePrice,
	onRemove,
}: CartPembelianProps) {
	const total = items.reduce(
		(sum, item) => sum + item.cost_price * item.quantity,
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
					Klik barang di sebelah kiri untuk menambahkan ke restok.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{/* Item list */}
			<div className="space-y-2">
				{items.map((item) => {
					const subtotal = item.cost_price * item.quantity;

					return (
						<div
							key={item.variant_id}
							className="rounded-lg border border-gray-100 bg-white p-3 transition-colors"
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
										Stok saat ini: {item.stock}
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

							<div className="mt-3 grid grid-cols-2 gap-2">
								{/* Qty */}
								<div>
									<label
										htmlFor={`qty-${item.variant_id}`}
										className="block text-xs text-gray-500 mb-1"
									>
										Kuantitas
									</label>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() =>
												onUpdateQty(item.variant_id, item.quantity - 1)
											}
											disabled={item.quantity <= 1}
											className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
										>
											<Minus className="h-3.5 w-3.5" />
										</button>
										<input
											id={`qty-${item.variant_id}`}
											type="number"
											min={1}
											value={item.quantity}
											onChange={(e) => {
												const val = Number.parseInt(e.target.value, 10) || 1;
												onUpdateQty(item.variant_id, Math.max(1, val));
											}}
											className="w-full rounded-md border border-gray-200 py-1.5 text-center text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										/>
										<button
											type="button"
											onClick={() =>
												onUpdateQty(item.variant_id, item.quantity + 1)
											}
											className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
										>
											<Plus className="h-3.5 w-3.5" />
										</button>
									</div>
								</div>

								{/* Harga Beli */}
								<div>
									<label
										htmlFor={`price-${item.variant_id}`}
										className="block text-xs text-gray-500 mb-1"
									>
										Harga Beli / pcs
									</label>
									<CurrencyInput
										id={`price-${item.variant_id}`}
										className="w-full rounded-md border border-gray-200 py-1.5 px-3 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
										value={item.cost_price}
										onChange={(val) =>
											onUpdatePrice(item.variant_id, Math.max(0, val))
										}
									/>
								</div>
							</div>

							<div className="mt-2 text-right">
								<span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
									{formatCurrency(subtotal)}
								</span>
							</div>
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
