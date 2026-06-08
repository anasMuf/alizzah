import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useAtom } from "jotai";
import { User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useGetV1InvoicesBatch } from "../../../../api/endpoints/invoices/invoice-batch";
import { usePostV1Payments } from "../../../../api/endpoints/payments/payments";
import { useGetV1StudentsIdSavings } from "../../../../api/endpoints/savings/savings";
import { useGetV1StudentsId } from "../../../../api/endpoints/students/students";
import { Button } from "../../../../components/atoms/Button";
import { useToast } from "../../../../components/molecules/Toast";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency } from "../../../../utils/format";
import { IncidentalItems } from "./components/IncidentalItems";
import { InvoiceSelector } from "./components/InvoiceSelector";
import { PaymentSummary } from "./components/PaymentSummary";
import { StudentSearch } from "./components/StudentSearch";

type IncidentalItem = {
	id: number;
	name: string;
	amount: number;
	isSavings: boolean;
};

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
	const navigate = useNavigate();
	const searchParams = useSearch({
		from: "/_authenticated/keuangan/pembayaran/baru",
	});
	const initialStudentId = (searchParams as any).student_id
		? Number((searchParams as any).student_id)
		: null;
	const initialInvoiceId = (searchParams as any).invoice_id
		? Number((searchParams as any).invoice_id)
		: null;

	const [activeAy] = useAtom(academicYearAtom);
	const { addToast } = useToast();

	// Student
	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const { data: initialStudentResp } = useGetV1StudentsId(
		initialStudentId || 0,
		{ query: { enabled: !!initialStudentId } },
	);
	useEffect(() => {
		if (initialStudentResp && !selectedStudent) {
			setSelectedStudent((initialStudentResp.data as any)?.data);
		}
	}, [initialStudentResp]);

	// Invoices
	const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
	const [payAmounts, setPayAmounts] = useState<Record<number, number>>({});

	// Incidental items
	const [incidentalItems, setIncidentalItems] = useState<IncidentalItem[]>([]);

	// Payment form
	const [paymentSource, setPaymentSource] = useState<"cash" | "savings">(
		"cash",
	);
	const [cashReceived, setCashReceived] = useState("");
	const [depositChange, setDepositChange] = useState(false);
	const [notes, setNotes] = useState("");

	// Savings
	const { data: savingsResp } = useGetV1StudentsIdSavings(
		selectedStudent?.id || 0,
		{ query: { enabled: !!selectedStudent?.id } },
	);
	const savings = (savingsResp?.data as any)?.data;
	const savingsBalance = savings?.general_balance || 0;

	// Batch fetch invoice details for selected invoices (needed for PaymentSummary)
	const { data: invoiceDetails = [] } = useGetV1InvoicesBatch(
		selectedInvoices,
		{ enabled: selectedInvoices.length > 0 },
	);
	const invoiceItems = useMemo(() => {
		const items: any[] = [];
		invoiceDetails.forEach((detail: any) => {
			detail?.items?.forEach((item: any) => {
				const sisa = Number(item.amount || 0) - Number(item.paid_amount || 0);
				if (sisa > 0 || item.category === "dispensation") {
					items.push({
						id: item.id,
						invoice_id: detail.id,
						name: item.name,
						category: item.category,
						sisa_tagihan: sisa,
						is_dispensation: item.category === "dispensation",
					});
				}
			});
		});
		return items;
	}, [invoiceDetails]);

	// Derived
	const tabunganUmumTotal = incidentalItems
		.filter((i) => i.isSavings)
		.reduce((sum, i) => sum + i.amount, 0);
	const totalPay = useMemo(() => {
		const invoiceTotal = Object.values(payAmounts).reduce(
			(sum, amt) => sum + amt,
			0,
		);
		const incidentalTotal = incidentalItems.reduce(
			(sum, item) => sum + item.amount,
			0,
		);
		return invoiceTotal + incidentalTotal;
	}, [payAmounts, incidentalItems]);

	const canSubmit =
		selectedStudent &&
		totalPay > 0 &&
		((paymentSource === "cash" && Number(cashReceived) >= totalPay) ||
			(paymentSource === "savings" && savingsBalance >= totalPay));

	// Mutation
	const paymentMutation = usePostV1Payments({
		mutation: {
			onSuccess: (res: any) => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pembayaran berhasil dicatat.",
				});
				navigate({
					to: "/keuangan/pembayaran/$id",
					params: { id: String(res.data?.data?.id) },
				});
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menyimpan pembayaran.",
				});
			},
		},
	});

	const handleSubmit = () => {
		if (paymentSource === "savings" && totalPay > savingsBalance) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Saldo tabungan tidak mencukupi.",
			});
			return;
		}
		if (paymentSource === "cash" && Number(cashReceived) < totalPay) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Uang diterima kurang dari total pembayaran.",
			});
			return;
		}

		const totalSavingsDeposit =
			tabunganUmumTotal +
			(depositChange && Number(cashReceived) > totalPay
				? Number(cashReceived) - totalPay
				: 0);
		const customIncidentals = incidentalItems
			.filter((i) => !i.isSavings)
			.map((i) => ({ name: i.name, amount: i.amount }));

		paymentMutation.mutate({
			data: {
				academic_year_id: activeAy?.id || 1,
				student_id: selectedStudent.id,
				source: paymentSource,
				payment_date: new Date().toISOString().split("T")[0],
				items: Object.entries(payAmounts)
					.filter(([_, amt]) => amt > 0)
					.map(([itemId, amt]) => ({
						invoice_item_id: Number(itemId),
						amount: amt,
					})),
				incidental_items:
					customIncidentals.length > 0 ? customIncidentals : undefined,
				notes: notes || undefined,
				savings_deposit:
					totalSavingsDeposit > 0 ? totalSavingsDeposit : undefined,
			},
		} as any);
	};

	return (
		<div className="h-full flex flex-col">
			{/* Top bar: Student Search */}
			<div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
				<div className="flex items-center gap-4">
					<h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">
						Pembayaran
					</h2>
					<div className="flex-1 max-w-xl relative">
						<StudentSearch
							selectedStudent={selectedStudent}
							onSelect={setSelectedStudent}
							onClear={() => {
								setSelectedStudent(null);
								setSelectedInvoices([]);
								setPayAmounts({});
								setIncidentalItems([]);
								setCashReceived("");
								setDepositChange(false);
								setNotes("");
								setPaymentSource("cash");
							}}
						/>
					</div>
				</div>
			</div>

			{/* Body */}
			{!selectedStudent ? (
				<div className="flex-1 flex items-center justify-center bg-gray-50">
					<div className="text-center">
						<User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
						<p className="text-gray-500">
							Cari dan pilih siswa untuk memulai pembayaran
						</p>
					</div>
				</div>
			) : (
				<div className="flex-1 flex min-h-0">
					{/* Left panel */}
					<div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
						<div className="flex-1 overflow-y-auto p-4 space-y-3">
							<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Tagihan Belum Lunas
							</p>
							<InvoiceSelector
								studentId={selectedStudent.id}
								academicYearId={activeAy?.id}
								selectedInvoices={selectedInvoices}
								payAmounts={payAmounts}
								initialInvoiceId={initialInvoiceId}
								onToggleInvoice={(id) =>
									setSelectedInvoices((prev) =>
										prev.includes(id)
											? prev.filter((x) => x !== id)
											: [...prev, id],
									)
								}
								onAmountChange={(itemId, val) =>
									setPayAmounts((prev) => ({ ...prev, [itemId]: Number(val) }))
								}
							/>
						</div>
						<div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
							<IncidentalItems
								items={incidentalItems}
								onChange={setIncidentalItems}
							/>
						</div>
					</div>

					{/* Right panel */}
					<div className="w-1/2 flex flex-col bg-gray-50">
						<PaymentSummary
							invoiceItems={invoiceItems}
							incidentalItems={incidentalItems}
							payAmounts={payAmounts}
							savingsBalance={savingsBalance}
							totalPay={totalPay}
							source={paymentSource}
							cashReceived={cashReceived}
							depositChange={depositChange}
							notes={notes}
							onSourceChange={setPaymentSource}
							onCashReceivedChange={setCashReceived}
							onDepositChangeChange={setDepositChange}
							onNotesChange={setNotes}
						/>
						<div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
							<Button
								variant="primary"
								className="w-full justify-center py-3 text-base"
								onClick={handleSubmit}
								disabled={!canSubmit || paymentMutation.isPending}
							>
								{paymentMutation.isPending
									? "Memproses..."
									: `Proses & Cetak Struk — ${formatCurrency(totalPay)}`}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
