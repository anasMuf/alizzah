import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { Button } from "#/components/ui";
import { useKasirPembayaran } from "#/features/keuangan/pembayaran/hooks/useKasirPembayaran";
import { IncidentalItems } from "./components/IncidentalItems";
import { InvoiceSelector } from "./components/InvoiceSelector";
import { PaymentSummary } from "./components/PaymentSummary";
import { StudentSearch } from "./components/StudentSearch";

export const Route = createFileRoute(
	"/_authenticated/keuangan/pembayaran/baru",
)({
	component: KasirPembayaranPage,
	validateSearch: (search: Record<string, unknown>) => ({
		student_id: search.student_id ? Number(search.student_id) : undefined,
		invoice_id: search.invoice_id ? Number(search.invoice_id) : undefined,
	}),
});

function KasirPembayaranPage() {
	const k = useKasirPembayaran();

	return (
		<div className="h-full flex flex-col">
			<div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
				<div className="flex items-center gap-4">
					<h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">
						Pembayaran
					</h2>
					<div className="flex-1 max-w-xl relative">
						<StudentSearch
							selectedStudent={k.selectedStudent}
							onSelect={k.setSelectedStudent}
							onClear={k.handleClear}
						/>
					</div>
				</div>
			</div>

			{!k.selectedStudent ? (
				<div className="flex-1 flex items-center justify-center bg-gray-50">
					<div className="text-center">
						<User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
						<p className="text-gray-500">
							Cari dan pilih siswa untuk memulai pembayaran
						</p>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-auto">
					<div className="lg:col-span-2 space-y-6">
						<InvoiceSelector
							studentId={k.selectedStudent.id}
							academicYearId={k.activeAy?.id}
							selectedInvoices={k.selectedInvoices}
							payAmounts={k.payAmounts}
							excludedItems={k.excludedItems}
							initialInvoiceId={k.initialInvoiceId}
							onToggleInvoice={(id) =>
								k.setSelectedInvoices((prev) =>
									prev.includes(id)
										? prev.filter((x) => x !== id)
										: [...prev, id],
								)
							}
							onToggleItem={k.toggleItem}
							onAmountChange={(itemId, val) =>
								k.setPayAmounts((prev) => ({ ...prev, [itemId]: Number(val) }))
							}
						/>
						<IncidentalItems
							items={k.incidentalItems}
							onChange={k.setIncidentalItems}
						/>
					</div>
					<div className="lg:col-span-1">
						<PaymentSummary
							invoiceItems={k.invoiceItems}
							incidentalItems={k.incidentalItems}
							payAmounts={k.payAmounts}
							excludedItems={k.excludedItems}
							savingsBalance={k.savingsBalance}
							totalPay={k.totalPay}
							source={k.paymentSource}
							cashReceived={k.cashReceived}
							depositChange={k.depositChange}
							notes={k.notes}
							onSourceChange={k.setPaymentSource}
							onCashReceivedChange={k.setCashReceived}
							onDepositChangeChange={k.setDepositChange}
							onNotesChange={k.setNotes}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
