import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGetV1InvoicesBatch } from "#/api/endpoints/invoices/invoice-batch";
import { usePutV1InvoicesIdItemsItemIdQuantity } from "#/api/endpoints/invoices/invoice-quantity";
import { useGetV1StudentsIdInvoices } from "#/api/endpoints/invoices/invoices";
import { Button, CurrencyInput, SlideOver, useToast } from "#/components/ui";
import { formatCurrency } from "../../../../../utils/format";

interface InvoiceSelectorProps {
	studentId: number;
	academicYearId: number | undefined;
	selectedInvoices: number[];
	payAmounts: Record<number, number>;
	excludedItems: number[];
	initialInvoiceId: number | null;
	onToggleInvoice: (id: number) => void;
	onToggleItem: (itemId: number) => void;
	onAmountChange: (itemId: number, val: number) => void;
	onExcludeItems: (ids: number[]) => void;
	onIncludeItems: (ids: number[]) => void;
}

export function InvoiceSelector({
	studentId,
	academicYearId,
	selectedInvoices,
	payAmounts,
	excludedItems,
	initialInvoiceId,
	onToggleInvoice,
	onToggleItem,
	onAmountChange,
	onExcludeItems,
	onIncludeItems,
}: InvoiceSelectorProps) {
	// Toggle untuk menampilkan semua tagihan bulanan (termasuk bulan depan)
	const [showAllMonths, setShowAllMonths] = useState(false);

	// SlideOver untuk edit quantity item harian
	const { addToast } = useToast();
	const [qtyEditingItem, setQtyEditingItem] = useState<any>(null);
	const [qtyValue, setQtyValue] = useState("");

	// Fetch invoice list
	const { data: invoicesResp, isLoading } = useGetV1StudentsIdInvoices(
		studentId,
		{
			academic_year_id: academicYearId,
			...(showAllMonths ? ({ show_all: true } as any) : {}),
		},
		{ query: { enabled: !!studentId } },
	);
	const allInvoices = (invoicesResp?.data as any)?.data || [];
	const unpaidInvoices = allInvoices.filter(
		(inv: any) => inv.status !== "paid",
	);

	// Auto-select initial invoice
	useEffect(() => {
		if (
			unpaidInvoices.length > 0 &&
			initialInvoiceId &&
			selectedInvoices.length === 0
		) {
			const matched = unpaidInvoices.find(
				(inv: any) => inv.id === initialInvoiceId,
			);
			if (matched) onToggleInvoice(matched.id);
		}
	}, [
		unpaidInvoices,
		initialInvoiceId,
		onToggleInvoice,
		selectedInvoices.length,
	]);

	// Batch fetch detail for selected invoices
	const { data: invoiceDetails = [] } = useGetV1InvoicesBatch(
		selectedInvoices,
		{
			enabled: selectedInvoices.length > 0,
		},
	);

	// Derive payable items
	const invoiceItems = useMemo(() => {
		const items: any[] = [];
		const hasDispensation = new Set<number>();

		invoiceDetails.forEach((detail: any) => {
			detail?.items?.forEach((item: any) => {
				if (item.category === "dispensation") hasDispensation.add(detail.id);
			});
		});

		invoiceDetails.forEach((detail: any) => {
			detail?.items?.forEach((item: any) => {
				const sisa = Number(item.amount || 0) - Number(item.paid_amount || 0);
				if (sisa > 0 || item.category === "dispensation") {
					const isLockedBySpp =
						item.category === "monthly_spp" && hasDispensation.has(detail.id);
					items.push({
						id: item.id,
						invoice_id: detail.id,
						name: item.name,
						category: item.category,
						sisa_tagihan: sisa,
						quantity: item.quantity ?? 0,
						unit_price: item.unit_price ?? 0,
						is_dispensation: item.category === "dispensation",
						is_locked: isLockedBySpp,
					});
				}
			});
		});

		items.sort(
			(a, b) => (a.is_dispensation ? 1 : 0) - (b.is_dispensation ? 1 : 0),
		);
		return items;
	}, [invoiceDetails]);

	// Quantity mutation untuk item harian/per-Senin
	const queryClient = useQueryClient();
	const qtyMutation = usePutV1InvoicesIdItemsItemIdQuantity({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Jumlah hari/Senin berhasil diubah.",
				});
				setQtyEditingItem(null);
				if (selectedInvoices.length > 0) {
					queryClient.invalidateQueries({
						queryKey: ["invoices-batch", selectedInvoices.join(",")],
					});
				}
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal mengubah jumlah.",
				});
			},
		},
	});

	const handleQtySave = () => {
		if (!qtyEditingItem || !qtyValue || Number(qtyValue) < 1) return;
		qtyMutation.mutate({
			invoiceId: qtyEditingItem.invoice_id,
			itemId: qtyEditingItem.id,
			data: { quantity: Number(qtyValue) },
		});
	};

	// Track seen item IDs so new items are excluded by default
	const prevIdsRef = useRef<Set<number>>(new Set());

	// Stabilize callbacks in refs agar tidak trigger effect re-run
	const onAmountChangeRef = useRef(onAmountChange);
	onAmountChangeRef.current = onAmountChange;
	const onExcludeItemsRef = useRef(onExcludeItems);
	onExcludeItemsRef.current = onExcludeItems;

	// Auto-fill pay amounts + exclude new items by default
	useEffect(() => {
		if (invoiceItems.length > 0) {
			// Auto-fill pay amounts for all items
			invoiceItems.forEach((item) => {
				onAmountChangeRef.current(item.id, item.sisa_tagihan);
			});

			// Exclude items that just appeared (not seen before)
			const currentIds = new Set(invoiceItems.map((i) => i.id));
			const newItems = invoiceItems.filter(
				(item) => !prevIdsRef.current.has(item.id),
			);
			if (newItems.length > 0) {
				onExcludeItemsRef.current(newItems.map((item) => item.id));
			}
			prevIdsRef.current = currentIds;
		} else {
			prevIdsRef.current.clear();
		}
	}, [invoiceItems]);

	if (isLoading) {
		return (
			<div className="animate-pulse space-y-2">
				{[1, 2, 3].map((n) => (
					<div key={n} className="h-12 bg-gray-100 rounded" />
				))}
			</div>
		);
	}

	if (unpaidInvoices.length === 0) {
		return (
			<div className="bg-green-50 p-3 rounded-md text-sm text-green-700">
				Tidak ada tagihan tertunggak.
			</div>
		);
	}

	return (
		<>
			{/* Toggle: tampilkan semua bulan */}
			<label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none mb-2">
				<input
					type="checkbox"
					className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
					checked={showAllMonths}
					onChange={(e) => setShowAllMonths(e.target.checked)}
				/>
				Tampilkan semua bulan (termasuk bulan depan)
			</label>

			{/* Invoice checkboxes */}
			<div className="space-y-2">
				{unpaidInvoices.map((inv: any) => {
					const sisa = Number(inv.total_amount) - Number(inv.paid_amount);
					const isSelected = selectedInvoices.includes(inv.id);
					return (
						<label
							key={inv.id}
							className={`flex items-center p-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${isSelected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}
						>
							<input
								type="checkbox"
								className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
								checked={isSelected}
								onChange={() => onToggleInvoice(inv.id)}
							/>
							<span className="ml-2.5 flex-1 font-medium text-gray-900">
								{inv.type === "monthly"
									? `Bulanan ${inv.month}/${inv.year}`
									: inv.type === "registration"
										? "Registrasi"
										: inv.type === "initial"
											? "Biaya Awal"
											: inv.type === "daycare_initial"
												? "Biaya Awal Daycare"
												: "Lainnya"}
							</span>
							<span className="font-semibold text-rose-600 tabular-nums">
								{formatCurrency(sisa)}
							</span>
						</label>
					);
				})}
			</div>

			{/* Item detail table */}
			{invoiceItems.length > 0 &&
				(() => {
					const allExcluded =
						invoiceItems.length > 0 &&
						invoiceItems.every((item) => excludedItems.includes(item.id));
					return (
						<div className="mt-3 border-t border-gray-200 pt-3">
							<div className="flex items-center justify-between mb-2">
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
									Detail Item
								</p>
								<label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
									<input
										type="checkbox"
										className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
										checked={!allExcluded}
										onChange={() => {
											const ids = invoiceItems.map((i) => i.id);
											if (allExcluded) {
												onIncludeItems(ids);
											} else {
												onExcludeItems(ids);
											}
										}}
									/>
									{allExcluded ? "Pilih Semua" : "Hapus Semua"}
								</label>
							</div>
							<div className="space-y-1">
								{invoiceItems.map((item: any) => {
									const checkable = !item.is_dispensation && !item.is_locked;
									const isExcluded = excludedItems.includes(item.id);
									return (
										<div
											key={item.id}
											className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm ${item.is_dispensation ? "bg-green-50" : ""} ${isExcluded ? "opacity-50" : ""}`}
										>
											{checkable ? (
												<input
													type="checkbox"
													className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
													checked={!isExcluded}
													onChange={() => onToggleItem(item.id)}
													title={
														isExcluded
															? "Sertakan item ini"
															: "Kecualikan dari pembayaran"
													}
												/>
											) : (
												<span className="w-3.5" />
											)}
											<span
												className={`flex-1 ${item.is_dispensation ? "text-green-700 italic text-xs" : "text-gray-800"} ${isExcluded ? "line-through" : ""}`}
											>
												{item.name}
												{item.is_locked && (
													<span className="ml-1 text-xs text-indigo-500">
														(dispensasi)
													</span>
												)}
											</span>

											{/* Icon edit untuk item harian/per-Senin */}
											{item.unit_price > 0 && item.quantity > 0 && (
												<button
													type="button"
													onClick={() => {
														setQtyEditingItem(item);
														setQtyValue(String(item.quantity));
													}}
													className="text-gray-400 hover:text-indigo-600 transition-colors"
													title={`${item.quantity} hari × ${formatCurrency(item.unit_price)} — klik untuk ubah`}
												>
													<Pencil className="w-3.5 h-3.5" />
												</button>
											)}

											<span
												className={`text-xs tabular-nums ${item.is_dispensation ? "text-green-600" : "text-gray-500"}`}
											>
												{formatCurrency(item.sisa_tagihan)}
											</span>
											<div className="w-36">
												{item.is_dispensation || item.is_locked ? (
													<span
														className={`block text-right text-xs font-medium tabular-nums ${item.is_dispensation ? "text-green-600" : "text-gray-900"}`}
													>
														{formatCurrency(
															payAmounts[item.id] ?? item.sisa_tagihan,
														)}
													</span>
												) : (
													<div className="flex items-center gap-1">
														<CurrencyInput
															className="flex-1 rounded border-0 py-1 px-2 text-xs text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 text-right tabular-nums disabled:bg-gray-100 disabled:text-gray-400"
															value={payAmounts[item.id] ?? 0}
															onChange={(val) => onAmountChange(item.id, val)}
															disabled={isExcluded}
														/>
														{/* Quick button: isi 1 hari */}
														{item.unit_price > 0 && !isExcluded && (
															<button
																type="button"
																onClick={() =>
																	onAmountChange(item.id, item.unit_price)
																}
																className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1 py-0.5 rounded font-medium transition-colors whitespace-nowrap"
																title={`Isi 1 hari (${formatCurrency(item.unit_price)})`}
															>
																+1
															</button>
														)}
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})()}

			{/* SlideOver: Edit jumlah hari/Senin */}
			<SlideOver
				isOpen={!!qtyEditingItem}
				onClose={() => setQtyEditingItem(null)}
				title={`Ubah Jumlah — ${qtyEditingItem?.name || ""}`}
			>
				<div className="space-y-4">
					{qtyEditingItem && (
						<>
							<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
								<div className="text-xs text-gray-500 mb-1">Tarif per hari</div>
								<div className="text-sm font-semibold text-gray-900">
									{formatCurrency(qtyEditingItem.unit_price)} / hari
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jumlah Hari
								</label>
								<input
									type="number"
									min={1}
									value={qtyValue}
									onChange={(e) => setQtyValue(e.target.value)}
									className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
									placeholder="Masukkan jumlah hari"
								/>
							</div>

							{Number(qtyValue) > 0 && (
								<div className="bg-indigo-50 rounded-md p-3 border border-indigo-200">
									<div className="text-xs text-indigo-600 mb-1">
										Total Tagihan
									</div>
									<div className="text-lg font-bold text-indigo-700">
										{formatCurrency(
											Number(qtyValue) * qtyEditingItem.unit_price,
										)}
									</div>
									<div className="text-xs text-indigo-500 mt-0.5">
										{formatCurrency(qtyEditingItem.unit_price)} &times;{" "}
										{qtyValue} hari
									</div>
								</div>
							)}

							<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
								<Button
									variant="secondary"
									onClick={() => setQtyEditingItem(null)}
									disabled={qtyMutation.isPending}
								>
									Batal
								</Button>
								<Button
									variant="primary"
									onClick={handleQtySave}
									disabled={
										qtyMutation.isPending || !qtyValue || Number(qtyValue) < 1
									}
								>
									{qtyMutation.isPending ? "Menyimpan..." : "Simpan"}
								</Button>
							</div>
						</>
					)}
				</div>
			</SlideOver>
		</>
	);
}
