import { AlertCircle, FileText, Wallet } from "lucide-react";
import { useMemo } from "react";
import { CurrencyInput } from "#/components/ui";
import { formatCurrency } from "../../../../../utils/format";

interface PaymentSummaryProps {
	invoiceItems: any[];
	incidentalItems: any[];
	payAmounts: Record<number, number>;
	excludedItems: number[];
	savingsBalance: number;
	totalPay: number;
	source: "cash" | "savings";
	cashReceived: number;
	depositChange: boolean;
	notes: string;
	savingsUsage: number;
	onSourceChange: (s: "cash" | "savings") => void;
	onCashReceivedChange: (v: number) => void;
	onDepositChangeChange: (v: boolean) => void;
	onNotesChange: (v: string) => void;
	onSavingsUsageChange: (v: number) => void;
}

export function PaymentSummary({
	invoiceItems,
	incidentalItems,
	payAmounts,
	excludedItems,
	savingsBalance,
	totalPay,
	source,
	cashReceived,
	depositChange,
	notes,
	savingsUsage,
	onSourceChange,
	onCashReceivedChange,
	onDepositChangeChange,
	onNotesChange,
	onSavingsUsageChange,
}: PaymentSummaryProps) {
	const changeAmount = useMemo(() => {
		return cashReceived > totalPay ? cashReceived - totalPay : 0;
	}, [cashReceived, totalPay]);

	return (
		<div className="flex-1 overflow-y-auto p-4 space-y-4">
			<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
				Ringkasan Pembayaran
			</p>

			{/* Item summary */}
			<div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
				{invoiceItems
					.filter(
						(i: any) => payAmounts[i.id] !== 0 && !excludedItems.includes(i.id),
					)
					// Sembunyikan dispensasi jika item target (is_locked) tidak ikut dibayar
					.filter((item: any, _: number, arr: any[]) => {
						if (!item.is_dispensation) return true;
						const hasLockedPaid = arr.some(
							(i: any) => i.invoice_id === item.invoice_id && i.is_locked,
						);
						return hasLockedPaid;
					})
					.sort(
						(a: any, b: any) =>
							(a.is_dispensation ? 1 : 0) - (b.is_dispensation ? 1 : 0),
					)
					.map((item: any) => (
						<div
							key={item.id}
							className={`flex justify-between px-3 py-2 text-sm ${item.is_dispensation ? "bg-green-50" : ""}`}
						>
							<span
								className={`${item.is_dispensation ? "text-green-700 italic" : "text-gray-700"} truncate flex-1 pr-2`}
							>
								{item.name}
							</span>
							<span
								className={`font-medium tabular-nums whitespace-nowrap ${item.is_dispensation ? "text-green-600" : "text-gray-900"}`}
							>
								{formatCurrency(payAmounts[item.id] ?? item.sisa_tagihan)}
							</span>
						</div>
					))}
				{incidentalItems.map((item: any) => (
					<div
						key={`inc-${item.id}`}
						className="flex justify-between px-3 py-2 text-sm"
					>
						<span
							className={`${item.isSavings ? "text-green-700" : "text-gray-700"} truncate flex-1 pr-2`}
						>
							{item.name}
						</span>
						<span className="font-medium tabular-nums text-gray-900">
							{formatCurrency(item.amount)}
						</span>
					</div>
				))}
				{(invoiceItems.length > 0 || incidentalItems.length > 0) && (
					<div className="flex justify-between px-3 py-3 bg-indigo-50">
						<span className="font-bold text-indigo-900">TOTAL</span>
						<span className="text-xl font-bold text-indigo-700 tabular-nums">
							{formatCurrency(totalPay)}
						</span>
					</div>
				)}
			</div>

			{/* Sumber Pembayaran */}
			<div>
				<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
					Sumber Pembayaran
				</p>
				<div className="grid grid-cols-2 gap-2">
					<label
						className={`border rounded-lg p-3 cursor-pointer flex items-center gap-2 text-sm ${source === "cash" ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-gray-200 bg-white hover:bg-gray-50"}`}
					>
						<input
							type="radio"
							className="sr-only"
							checked={source === "cash"}
							onChange={() => onSourceChange("cash")}
						/>
						<Wallet
							className={`w-5 h-5 ${source === "cash" ? "text-indigo-600" : "text-gray-400"}`}
						/>
						<span className="font-medium">Tunai</span>
					</label>
					<label
						className={`border rounded-lg p-3 cursor-pointer flex items-center gap-2 text-sm ${source === "savings" ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-gray-200 bg-white hover:bg-gray-50"}`}
					>
						<input
							type="radio"
							className="sr-only"
							checked={source === "savings"}
							onChange={() => onSourceChange("savings")}
						/>
						<FileText
							className={`w-5 h-5 ${source === "savings" ? "text-indigo-600" : "text-gray-400"}`}
						/>
						<div>
							<span className="font-medium">Tabungan</span>
							<span className="block text-xs text-gray-500">
								{formatCurrency(savingsBalance)}
							</span>
						</div>
					</label>
				</div>
			</div>

			{source === "savings" && totalPay > 0 && (
				<div className="space-y-3">
					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Nominal dari Tabungan (Rp)
						</label>
						<CurrencyInput
							className="block w-full rounded-lg border-0 py-2.5 px-4 text-lg font-bold text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 tabular-nums"
							value={savingsUsage}
							onChange={onSavingsUsageChange}
							placeholder="0"
						/>
						<p className="mt-1 text-xs text-gray-500">
							Saldo tersedia: {formatCurrency(savingsBalance)}
						</p>
					</div>

					{/* Sisa dibayar tunai */}
					{savingsUsage < totalPay && (
						<div className="bg-white rounded-lg border border-gray-200 p-3 flex justify-between text-sm">
							<span className="text-gray-500">Sisa dibayar tunai</span>
							<span className="font-bold text-gray-900 tabular-nums">
								{formatCurrency(totalPay - savingsUsage)}
							</span>
						</div>
					)}

					{savingsUsage > savingsBalance && (
						<div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
							<AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
							<p className="text-xs text-red-700">
								Nominal melebihi saldo tabungan (
								{formatCurrency(savingsBalance)}).
							</p>
						</div>
					)}
					{savingsUsage > totalPay && (
						<div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
							<AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
							<p className="text-xs text-amber-700">
								Nominal melebihi total pembayaran ({formatCurrency(totalPay)}).
								Kurangi nominal tabungan.
							</p>
						</div>
					)}
				</div>
			)}

			{source === "cash" && totalPay > 0 && (
				<div className="space-y-3">
					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Uang Diterima (Rp)
						</label>
						<CurrencyInput
							className="block w-full rounded-lg border-0 py-2.5 px-4 text-lg font-bold text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 tabular-nums"
							value={cashReceived}
							onChange={onCashReceivedChange}
							placeholder="0"
						/>
					</div>
					{cashReceived > 0 && cashReceived < totalPay && (
						<div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
							<AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
							<p className="text-xs text-amber-700">
								Uang diterima kurang {formatCurrency(totalPay - cashReceived)}{" "}
								dari total. Kurangi item atau tambah uang.
							</p>
						</div>
					)}
					{cashReceived >= totalPay && (
						<div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-gray-500">Kembalian</span>
								<span className="font-bold text-gray-900 tabular-nums">
									{formatCurrency(changeAmount)}
								</span>
							</div>
							{changeAmount > 0 && (
								<label className="flex items-center pt-2 border-t border-gray-100">
									<input
										type="checkbox"
										className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
										checked={depositChange}
										onChange={(e) => onDepositChangeChange(e.target.checked)}
									/>
									<span className="ml-2 text-xs text-gray-700">
										Kembalian ({formatCurrency(changeAmount)}) → Tabungan Umum
									</span>
								</label>
							)}
						</div>
					)}
				</div>
			)}

			{totalPay > 0 && (
				<div>
					<label className="block text-xs font-medium text-gray-700 mb-1">
						Catatan (Opsional)
					</label>
					<input
						type="text"
						className="block w-full rounded-lg border-0 py-1.5 px-3 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
						placeholder="Catatan tambahan..."
						value={notes}
						onChange={(e) => onNotesChange(e.target.value)}
					/>
				</div>
			)}
		</div>
	);
}
