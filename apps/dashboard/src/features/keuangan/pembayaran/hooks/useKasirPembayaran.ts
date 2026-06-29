import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useGetV1InvoicesBatch } from "#/api/endpoints/invoices/invoice-batch";
import { usePostV1Payments } from "#/api/endpoints/payments/payments";
import { useGetV1StudentsIdSavings } from "#/api/endpoints/savings/savings";
import { useGetV1StudentsId } from "#/api/endpoints/students/students";
import { useToast } from "#/components/ui";
import { academicYearAtom } from "@/store/global";

type IncidentalItem = {
	id: number;
	name: string;
	amount: number;
	isSavings: boolean;
};

export function useKasirPembayaran() {
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

	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const { data: initialStudentResp } = useGetV1StudentsId(
		initialStudentId || 0,
		{ query: { enabled: !!initialStudentId } },
	);
	useEffect(() => {
		if (initialStudentResp && !selectedStudent)
			setSelectedStudent((initialStudentResp.data as any)?.data);
	}, [initialStudentResp]);

	const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
	const [payAmounts, setPayAmounts] = useState<Record<number, number>>({});
	const [excludedItems, setExcludedItems] = useState<number[]>([]);
	const toggleItem = (itemId: number) =>
		setExcludedItems((prev) =>
			prev.includes(itemId)
				? prev.filter((x) => x !== itemId)
				: [...prev, itemId],
		);
	const [incidentalItems, setIncidentalItems] = useState<IncidentalItem[]>([]);
	const [paymentSource, setPaymentSource] = useState<"cash" | "savings">(
		"cash",
	);
	const [cashReceived, setCashReceived] = useState("");
	const [depositChange, setDepositChange] = useState(false);
	const [notes, setNotes] = useState("");

	const { data: savingsResp } = useGetV1StudentsIdSavings(
		selectedStudent?.id || 0,
		{ query: { enabled: !!selectedStudent?.id } },
	);
	const savings = (savingsResp?.data as any)?.data;
	const savingsBalance = savings?.general_balance || 0;

	const { data: invoiceDetails = [] } = useGetV1InvoicesBatch(
		selectedInvoices,
		{ enabled: selectedInvoices.length > 0 },
	);
	const invoiceItems = useMemo(() => {
		const items: any[] = [];
		(invoiceDetails as any[]).forEach((detail: any) => {
			detail?.items?.forEach((item: any) => {
				const sisa = Number(item.amount || 0) - Number(item.paid_amount || 0);
				if (sisa > 0 || item.category === "dispensation")
					items.push({
						id: item.id,
						invoice_id: detail.id,
						name: item.name,
						category: item.category,
						sisa_tagihan: sisa,
						is_dispensation: item.category === "dispensation",
					});
			});
		});
		return items;
	}, [invoiceDetails]);

	useEffect(() => {
		setPayAmounts((prev) => {
			const validIds = new Set(invoiceItems.map((i) => i.id));
			const next: Record<number, number> = {};
			let changed = false;
			for (const key of Object.keys(prev)) {
				const id = Number(key);
				if (validIds.has(id)) {
					next[id] = prev[id];
				} else changed = true;
			}
			return changed ? next : prev;
		});
	}, [invoiceItems]);
	useEffect(() => {
		const validIds = new Set(invoiceItems.map((i) => i.id));
		setExcludedItems((prev) => {
			const next = prev.filter((id) => validIds.has(id));
			return next.length === prev.length ? prev : next;
		});
	}, [invoiceItems]);

	const tabunganUmumTotal = incidentalItems
		.filter((i) => i.isSavings)
		.reduce((sum, i) => sum + i.amount, 0);
	const totalPay = useMemo(() => {
		const invoiceTotal = Object.entries(payAmounts).reduce(
			(sum, [id, amt]) =>
				excludedItems.includes(Number(id)) ? sum : sum + amt,
			0,
		);
		return (
			invoiceTotal + incidentalItems.reduce((sum, item) => sum + item.amount, 0)
		);
	}, [payAmounts, incidentalItems, excludedItems]);

	const canSubmit =
		selectedStudent &&
		totalPay > 0 &&
		((paymentSource === "cash" && Number(cashReceived) >= totalPay) ||
			(paymentSource === "savings" && savingsBalance >= totalPay));

	const paymentMutation = usePostV1Payments({
		mutation: {
			onSuccess: (res: any) => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pembayaran berhasil dicatat.",
				});
				const pid = (res?.data as any)?.data?.id;
				if (pid)
					navigate({
						to: "/keuangan/pembayaran/$id",
						params: { id: String(pid) },
					});
				else navigate({ to: "/keuangan/pembayaran" });
			},
			onError: (error: any) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: error?.message || "Gagal mencatat pembayaran.",
				}),
		},
	});

	const handlePay = () => {
		if (paymentSource === "savings" && savingsBalance < totalPay) {
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
			},
		} as any);
	};

	const handleClear = () => {
		setSelectedStudent(null);
		setSelectedInvoices([]);
		setPayAmounts({});
		setExcludedItems([]);
		setIncidentalItems([]);
		setCashReceived("");
		setDepositChange(false);
		setNotes("");
		setPaymentSource("cash");
	};

	return {
		activeAy,
		selectedStudent,
		setSelectedStudent,
		initialInvoiceId,
		selectedInvoices,
		setSelectedInvoices,
		payAmounts,
		setPayAmounts,
		excludedItems,
		toggleItem,
		incidentalItems,
		setIncidentalItems,
		paymentSource,
		setPaymentSource,
		cashReceived,
		setCashReceived,
		depositChange,
		setDepositChange,
		notes,
		setNotes,
		savings,
		savingsBalance,
		invoiceDetails,
		invoiceItems,
		tabunganUmumTotal,
		totalPay,
		canSubmit,
		isPending: paymentMutation.isPending,
		handlePay,
		handleClear,
	};
}
