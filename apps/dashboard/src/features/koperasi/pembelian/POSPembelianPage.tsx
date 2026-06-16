import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useCallback, useState } from "react";
import type { Product } from "../barang/api";
import { type CartItemPembelian, CartPembelian } from "./CartPembelian";
import { CheckoutPanelPembelian } from "./CheckoutPanelPembelian";
import {
	type AddItemPayloadPembelian,
	ProductGridPembelian,
} from "./ProductGridPembelian";
import { VariantPickerPembelian } from "./VariantPickerPembelian";

export function POSPembelianPage() {
	const [cartItems, setCartItems] = useState<CartItemPembelian[]>([]);
	const [variantPickerProduct, setVariantPickerProduct] =
		useState<Product | null>(null);
	const [activeTab, setActiveTab] = useState<"catalog" | "cart">("catalog");

	const total = cartItems.reduce(
		(sum, item) => sum + item.cost_price * item.quantity,
		0,
	);
	const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

	const handleAddItem = useCallback((payload: AddItemPayloadPembelian) => {
		setCartItems((prev) => {
			const existing = prev.find(
				(item) => item.variant_id === payload.variant_id,
			);
			if (existing) {
				return prev.map((item) =>
					item.variant_id === payload.variant_id
						? { ...item, quantity: item.quantity + 1 }
						: item,
				);
			}
			return [
				...prev,
				{
					product_id: payload.product_id,
					product_name: payload.product_name,
					variant_id: payload.variant_id,
					variant_name: payload.variant_name,
					cost_price: payload.cost_price,
					quantity: 1,
					stock: payload.stock,
				},
			];
		});
		// On mobile, show a hint that item was added
		setActiveTab("catalog");
	}, []);

	const handleUpdateQty = useCallback((variantId: number, qty: number) => {
		if (qty < 1) return;
		setCartItems((prev) =>
			prev.map((item) =>
				item.variant_id === variantId ? { ...item, quantity: qty } : item,
			),
		);
	}, []);

	const handleUpdatePrice = useCallback((variantId: number, price: number) => {
		if (price < 0) return;
		setCartItems((prev) =>
			prev.map((item) =>
				item.variant_id === variantId ? { ...item, cost_price: price } : item,
			),
		);
	}, []);

	const handleRemoveItem = useCallback((variantId: number) => {
		setCartItems((prev) =>
			prev.filter((item) => item.variant_id !== variantId),
		);
	}, []);

	const handleSuccess = useCallback(() => {
		setCartItems([]);
	}, []);

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col">
			{/* Top bar */}
			<div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6 shrink-0">
				<div className="flex items-center gap-3">
					<Link
						to="/koperasi/pembelian"
						className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
						title="Kembali ke daftar"
					>
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<div>
						<h1 className="text-lg font-bold text-gray-900">Restok Pemasok</h1>
						<p className="text-xs text-gray-500 hidden sm:block">
							Catat pembelian restok barang koperasi
						</p>
					</div>
				</div>

				{/* Mobile cart toggle */}
				<button
					type="button"
					onClick={() =>
						setActiveTab((t) => (t === "catalog" ? "cart" : "catalog"))
					}
					className="relative rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 lg:hidden transition-colors"
				>
					<ShoppingBag className="h-5 w-5" />
					{itemCount > 0 && (
						<span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
							{itemCount}
						</span>
					)}
				</button>
			</div>

			{/* Main content */}
			<div className="flex flex-1 min-h-0 overflow-hidden">
				{/* Left: Product catalog */}
				<div
					className={`flex-1 overflow-hidden p-4 lg:p-6 lg:border-r lg:border-gray-200 ${
						activeTab === "catalog" ? "block" : "hidden lg:block"
					}`}
				>
					<ProductGridPembelian
						onAddItem={handleAddItem}
						onPickVariant={setVariantPickerProduct}
					/>
				</div>

				{/* Right: Cart + Checkout */}
				<div
					className={`w-full lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col overflow-hidden bg-gray-50/50 ${
						activeTab === "cart" ? "block" : "hidden lg:flex"
					}`}
				>
					<div className="flex-1 overflow-y-auto p-4 lg:p-5">
						{/* Cart header */}
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
								Keranjang Restok
							</h2>
							{itemCount > 0 && (
								<span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
									{itemCount} item
								</span>
							)}
						</div>

						<CartPembelian
							items={cartItems}
							onUpdateQty={handleUpdateQty}
							onUpdatePrice={handleUpdatePrice}
							onRemove={handleRemoveItem}
						/>

						{/* Checkout */}
						{cartItems.length > 0 && (
							<CheckoutPanelPembelian
								items={cartItems}
								total={total}
								onSuccess={handleSuccess}
							/>
						)}
					</div>
				</div>
			</div>

			{/* Variant picker modal */}
			{variantPickerProduct && (
				<VariantPickerPembelian
					product={variantPickerProduct}
					onSelect={handleAddItem}
					onClose={() => setVariantPickerProduct(null)}
				/>
			)}
		</div>
	);
}
