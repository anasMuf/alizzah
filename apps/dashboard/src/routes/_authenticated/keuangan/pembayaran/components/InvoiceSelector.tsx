import { useEffect, useMemo } from "react";
import { useGetV1InvoicesBatch } from "#/api/endpoints/invoices/invoice-batch";
import { useGetV1StudentsIdInvoices } from "#/api/endpoints/invoices/invoices";
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
	onAmountChange: (itemId: number, val: string) => void;
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
}: InvoiceSelectorProps) {
	// Fetch invoice list
	const { data: invoicesResp, isLoading } = useGetV1StudentsIdInvoices(
		studentId,
		{ academic_year_id: academicYearId },
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

	// Auto-fill pay amounts
	useEffect(() => {
		if (invoiceItems.length > 0) {
			invoiceItems.forEach((item) => {
				onAmountChange(item.id, String(item.sisa_tagihan));
			});
		}
	}, [invoiceItems, onAmountChange]);

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
			{invoiceItems.length > 0 && (
				<div className="mt-3 border-t border-gray-200 pt-3">
					<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
						Detail Item
					</p>
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
									<span
										className={`text-xs tabular-nums ${item.is_dispensation ? "text-green-600" : "text-gray-500"}`}
									>
										{formatCurrency(item.sisa_tagihan)}
									</span>
									<div className="w-24">
										{item.is_dispensation || item.is_locked ? (
											<span
												className={`block text-right text-xs font-medium tabular-nums ${item.is_dispensation ? "text-green-600" : "text-gray-900"}`}
											>
												{formatCurrency(
													payAmounts[item.id] ?? item.sisa_tagihan,
												)}
											</span>
										) : (
											<input
												type="number"
												className="block w-full rounded border-0 py-1 px-2 text-xs text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 text-right tabular-nums disabled:bg-gray-100 disabled:text-gray-400"
												value={payAmounts[item.id] ?? ""}
												onChange={(e) =>
													onAmountChange(item.id, e.target.value)
												}
												disabled={isExcluded}
												max={item.sisa_tagihan}
												min={0}
											/>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</>
	);
}
