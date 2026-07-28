import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useAtom } from "jotai";
import { User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGetV1InvoicesBatch } from "#/api/endpoints/invoices/invoice-batch";
import {
	useGetV1PaymentsId,
	usePostV1Payments,
} from "#/api/endpoints/payments/payments";
import { usePutV1PaymentsId } from "#/api/endpoints/payments/payments-manual";
import { useGetV1StudentsIdSavings } from "#/api/endpoints/savings/savings";
import { useGetV1StudentsId } from "#/api/endpoints/students/students";
import { Button, useToast } from "#/components/ui";
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
		...(search.edit_id ? { edit_id: Number(search.edit_id) } : {}),
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
	const editId = (searchParams as any).edit_id
		? Number((searchParams as any).edit_id)
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
	}, [initialStudentResp, selectedStudent]);

	// Edit mode: fetch old payment for pre-fill
	const { data: editPaymentResp } = useGetV1PaymentsId(editId || 0, {
		query: { enabled: !!editId },
	});
	const editPayment = (editPaymentResp?.data as any)?.data;

	// Invoices — state MUST be declared before useEffect that uses them
	const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
	const [payAmounts, setPayAmounts] = useState<Record<number, number>>({});
	const [excludedItems, setExcludedItems] = useState<number[]>([]);
	const toggleItem = (itemId: number) =>
		setExcludedItems((prev) =>
			prev.includes(itemId)
				? prev.filter((x) => x !== itemId)
				: [...prev, itemId],
		);
	const excludeItems = (ids: number[]) =>
		setExcludedItems((prev) => {
			const newIds = ids.filter((id) => !prev.includes(id));
			return newIds.length > 0 ? [...prev, ...newIds] : prev;
		});
	const includeItems = (ids: number[]) =>
		setExcludedItems((prev) => prev.filter((id) => !ids.includes(id)));

	// Incidental items
	const [incidentalItems, setIncidentalItems] = useState<IncidentalItem[]>([]);

	// Payment form
	const [paymentSource, setPaymentSource] = useState<"cash" | "savings">(
		"cash",
	);
	const [paymentDate, setPaymentDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [notes, setNotes] = useState("");

	// Pre-fill from edit payment
	const [editPreFilled, setEditPreFilled] = useState(false);
	useEffect(() => {
		if (!editPayment || editPreFilled) return;

		// Pre-fill student
		if (editPayment.student) {
			setSelectedStudent(editPayment.student);
		}

		// Pre-fill invoice items: separate regular vs incidental
		const amounts: Record<number, number> = {};
		const invIds = new Set<number>();
		const incidentals: IncidentalItem[] = [];
		let incidentalCounter = Date.now();

		editPayment.items?.forEach((item: any) => {
			if (item.category === "incidental") {
				incidentals.push({
					id: ++incidentalCounter,
					name: item.invoice_item_name || "Item Insidental",
					amount: Number(item.amount),
					isSavings: false,
				});
			} else {
				amounts[item.invoice_item_id] = Number(item.amount);
				if (item.invoice_id) {
					invIds.add(item.invoice_id);
				}
			}
		});

		// Add savings_deposit as incidental savings item
		const savingsDep = Number(editPayment.savings_deposit || 0);
		if (savingsDep > 0) {
			incidentals.push({
				id: ++incidentalCounter,
				name: "Setoran Tabungan Umum",
				amount: savingsDep,
				isSavings: true,
			});
		}

		setPayAmounts(amounts);
		setSelectedInvoices(Array.from(invIds));
		setIncidentalItems(incidentals);

		// Set source
		if (editPayment.source === "savings" || editPayment.source === "cash") {
			setPaymentSource(editPayment.source);
		}

		// Preserve original payment date
		if (editPayment.payment_date) {
			setPaymentDate(editPayment.payment_date);
		}

		// Set notes
		if (editPayment.notes) {
			setNotes(editPayment.notes);
		}

		setEditPreFilled(true);
	}, [editPayment, editPreFilled]);

	// Payment form (continued)
	const [cashReceived, setCashReceived] = useState(0);
	const [depositChange, setDepositChange] = useState(false);

	// Savings
	const { data: savingsResp } = useGetV1StudentsIdSavings(
		selectedStudent?.id || 0,
		{ query: { enabled: !!selectedStudent?.id } },
	);
	const savings = (savingsResp?.data as any)?.data;
	const savingsBalance = savings?.general?.balance || 0;

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
				if (
					sisa > 0 ||
					item.category === "dispensation" ||
					(payAmounts[item.id] ?? 0) > 0
				) {
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
		// Dispensasi selalu di bawah sebelum total
		items.sort(
			(a, b) => (a.is_dispensation ? 1 : 0) - (b.is_dispensation ? 1 : 0),
		);
		return items;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [invoiceDetails]);

	// Buang entri payAmounts
	// Cleanup effect
	// Buang entri payAmounts milik item yang sudah tidak ada di tagihan terpilih
	// Hanya jalan setelah batch fetch selesai (invoiceDetails ada isinya)
	useEffect(() => {
		if (invoiceDetails.length === 0) return;
		setPayAmounts((prev) => {
			const validIds = new Set(invoiceItems.map((i) => i.id));
			const next: Record<number, number> = {};
			let changed = false;
			for (const key of Object.keys(prev)) {
				const id = Number(key);
				if (validIds.has(id)) {
					next[id] = prev[id];
				} else {
					changed = true;
				}
			}
			return changed ? next : prev;
		});
	}, [invoiceItems, invoiceDetails.length]);

	// Pangkas excludedItems mengikuti item aktif
	useEffect(() => {
		const validIds = new Set(invoiceItems.map((i) => i.id));
		setExcludedItems((prev) => {
			const next = prev.filter((id) => validIds.has(id));
			return next.length === prev.length ? prev : next;
		});
	}, [invoiceItems]);

	// Derived
	const tabunganUmumTotal = incidentalItems
		.filter((i) => i.isSavings)
		.reduce((sum, i) => sum + i.amount, 0);
	const totalPay = useMemo(() => {
		// Kelompokkan item per invoice. Dispensasi hanya berlaku jika
		// ada item non-dispensasi di invoice yang sama ikut dibayar.
		const invoiceGroups: Record<number, { nonDisp: number; disp: number }> = {};
		invoiceItems.forEach((item: any) => {
			const invId = item.invoice_id;
			if (!invoiceGroups[invId]) invoiceGroups[invId] = { nonDisp: 0, disp: 0 };
			const amt = payAmounts[item.id] ?? 0;
			if (excludedItems.includes(item.id)) return;
			if (item.is_dispensation) {
				invoiceGroups[invId].disp += amt;
			} else {
				invoiceGroups[invId].nonDisp += amt;
			}
		});

		const invoiceTotal = Object.values(invoiceGroups).reduce((sum, g) => {
			// Diskon dispensasi hanya berlaku jika ada item yang dibayar di invoice ini
			return sum + g.nonDisp + (g.nonDisp > 0 ? g.disp : 0);
		}, 0);
		const incidentalTotal = incidentalItems.reduce(
			(sum, item) => sum + item.amount,
			0,
		);
		return invoiceTotal + incidentalTotal;
	}, [payAmounts, incidentalItems, excludedItems, invoiceItems]);

	// Auto-fill cash received sesuai total
	useEffect(() => {
		setCashReceived(totalPay);
	}, [totalPay]);

	const canSubmit =
		selectedStudent &&
		(totalPay > 0 || tabunganUmumTotal > 0) &&
		((paymentSource === "cash" && cashReceived >= totalPay) ||
			(paymentSource === "savings" && savingsBalance >= totalPay));

	// Sync guard — cegah double-submit dalam <1ms
	const submitGuard = useRef(false);

	// Create mutation
	const createMutation = usePostV1Payments({
		mutation: {
			onSuccess: (res: any) => {
				submitGuard.current = false;
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
				submitGuard.current = false;
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menyimpan pembayaran.",
				});
			},
		},
	});

	// Update mutation
	const updateMutation = usePutV1PaymentsId({
		mutation: {
			onSuccess: (res: any) => {
				submitGuard.current = false;
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pembayaran berhasil diperbarui.",
				});
				navigate({
					to: "/keuangan/pembayaran/$id",
					params: { id: String(res.data?.data?.id) },
				});
			},
			onError: (err: any) => {
				submitGuard.current = false;
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal memperbarui pembayaran.",
				});
			},
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = () => {
		if (submitGuard.current) return;
		submitGuard.current = true;
		if (paymentSource === "savings" && totalPay > savingsBalance) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Saldo tabungan tidak mencukupi.",
			});
			return;
		}
		if (paymentSource === "cash" && cashReceived < totalPay) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Uang diterima kurang dari total pembayaran.",
			});
			return;
		}

		const totalSavingsDeposit =
			tabunganUmumTotal +
			(depositChange && cashReceived > totalPay ? cashReceived - totalPay : 0);
		const customIncidentals = incidentalItems
			.filter((i) => !i.isSavings)
			.map((i) => ({ name: i.name, amount: i.amount }));

		const payload = {
			academic_year_id: activeAy?.id || 1,
			student_id: selectedStudent.id,
			source: paymentSource,
			payment_date: paymentDate,
			items: Object.entries(payAmounts)
				.filter(([id, amt]) => amt > 0 && !excludedItems.includes(Number(id)))
				.map(([itemId, amt]) => ({
					invoice_item_id: Number(itemId),
					amount: amt,
				})),
			incidental_items:
				customIncidentals.length > 0 ? customIncidentals : undefined,
			notes: notes || undefined,
			savings_deposit:
				totalSavingsDeposit > 0 ? totalSavingsDeposit : undefined,
		};

		if (editId) {
			updateMutation.mutate({ id: editId, data: payload } as any);
		} else {
			createMutation.mutate({ data: payload } as any);
		}
	};

	const isEditMode = !!editId;

	return (
		<div className="h-full flex flex-col">
			{/* Top bar: Student Search */}
			<div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
				<div className="flex items-center gap-4">
					<h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">
						{isEditMode ? "Edit Pembayaran" : "Pembayaran"}
					</h2>
					<div className="flex-1 max-w-xl relative">
						<StudentSearch
							selectedStudent={selectedStudent}
							onSelect={setSelectedStudent}
							onClear={() => {
								setSelectedStudent(null);
								setSelectedInvoices([]);
								setPayAmounts({});
								setExcludedItems([]);
								setIncidentalItems([]);
								setCashReceived(0);
								setDepositChange(false);
								setPaymentDate(new Date().toISOString().split("T")[0]);
								setNotes("");
								setPaymentSource("cash");
							}}
							disabled={isEditMode}
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
							{isEditMode
								? "Memuat data pembayaran..."
								: "Cari dan pilih siswa untuk memulai pembayaran"}
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
								excludedItems={excludedItems}
								onToggleItem={toggleItem}
								initialInvoiceId={initialInvoiceId}
								isEditMode={isEditMode}
								onToggleInvoice={(id) =>
									setSelectedInvoices((prev) =>
										prev.includes(id)
											? prev.filter((x) => x !== id)
											: [...prev, id],
									)
								}
								onAmountChange={(itemId, val) =>
									setPayAmounts((prev) => ({ ...prev, [itemId]: val }))
								}
								onExcludeItems={excludeItems}
								onIncludeItems={includeItems}
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
							excludedItems={excludedItems}
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
								disabled={!canSubmit || submitGuard.current || isPending}
							>
								{isPending
									? "Memproses..."
									: isEditMode
										? `Simpan Perubahan — ${formatCurrency(totalPay)}`
										: `Proses & Cetak Struk — ${formatCurrency(totalPay)}`}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
