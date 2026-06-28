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

export function usePembayaranBaru() {
	const navigate = useNavigate();
	const [activeAy] = useAtom(academicYearAtom);
	const { addToast } = useToast();
	const searchParams = useSearch({
		from: "/_authenticated/keuangan/pembayaran/baru",
	}) as { student_id?: number; invoice_id?: number };
	const [step, setStep] = useState<"select" | "review">("select");
	const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
		searchParams.student_id || null,
	);
	const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
	const [payAmounts, setPayAmounts] = useState<Record<number, number>>({});
	const [excludedItems, setExcludedItems] = useState<number[]>([]);
	const [incidentalItems, setIncidentalItems] = useState<IncidentalItem[]>([]);
	const [source, setSource] = useState<"cash" | "savings">("cash");

	const { data: studentData } = useGetV1StudentsId(selectedStudentId || 0, {
		query: { enabled: !!selectedStudentId },
	});
	const student = (studentData?.data as any)?.data;
	const { data: savingsData } = useGetV1StudentsIdSavings(
		selectedStudentId || 0,
		{ query: { enabled: !!selectedStudentId } },
	);
	const savings = (savingsData?.data as any)?.data;
	const savingsBalance = Number(savings?.general?.balance || 0);

	const selectedInvoiceIds = useMemo(
		() => selectedInvoices,
		[selectedInvoices],
	);
	const { data: invoiceDetails = [] } = useGetV1InvoicesBatch(
		selectedInvoiceIds,
		{ enabled: selectedInvoiceIds.length > 0 },
	);

	const totalKoperasi = useMemo(() => {
		let total = 0;
		for (const detail of invoiceDetails as any[]) {
			for (const item of detail?.items || []) {
				if (item.is_koperasi && !excludedItems.includes(item.id))
					total +=
						Number(item.sisa_tagihan || item.amount || 0) -
						Number(item.paid_amount || 0);
			}
		}
		return total;
	}, [invoiceDetails, excludedItems]);

	const totalNonKoperasi = useMemo(() => {
		let total = 0;
		for (const detail of invoiceDetails as any[]) {
			for (const item of detail?.items || []) {
				if (!item.is_koperasi && !excludedItems.includes(item.id))
					total +=
						Number(item.sisa_tagihan || item.amount || 0) -
						Number(item.paid_amount || 0);
			}
		}
		return total;
	}, [invoiceDetails, excludedItems]);

	const incidentalTotal = useMemo(
		() => incidentalItems.reduce((s, i) => s + i.amount, 0),
		[incidentalItems],
	);
	const grandTotal = totalNonKoperasi + totalKoperasi + incidentalTotal;

	const createMutation = usePostV1Payments({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pembayaran berhasil dicatat.",
				});
				navigate({ to: "/keuangan/pembayaran" });
			},
			onError: (err: any) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: err?.message || "Gagal mencatat pembayaran.",
				}),
		},
	});

	const handlePay = () => {
		if (!selectedStudentId) return;
		const items: any[] = [];
		for (const detail of invoiceDetails as any[]) {
			for (const item of detail?.items || []) {
				if (
					!excludedItems.includes(item.id) &&
					Number(item.sisa_tagihan || 0) > 0
				) {
					items.push({
						invoice_item_id: item.id,
						amount: Number(payAmounts[item.id] || item.sisa_tagihan || 0),
					});
				}
			}
		}
		createMutation.mutate({
			data: {
				student_id: selectedStudentId,
				academic_year_id: activeAy?.id!,
				payment_date: new Date().toISOString().split("T")[0],
				items,
				incidental_items: incidentalItems.map((i) => ({
					name: i.name,
					amount: i.amount,
				})),
				savings_deposit: 0,
				source,
				notes: "",
			},
		});
	};

	return {
		activeAy,
		step,
		setStep,
		selectedStudentId,
		setSelectedStudentId,
		selectedInvoices,
		setSelectedInvoices,
		payAmounts,
		setPayAmounts,
		excludedItems,
		setExcludedItems,
		incidentalItems,
		setIncidentalItems,
		source,
		setSource,
		student,
		savings,
		savingsBalance,
		invoiceDetails,
		totalKoperasi,
		totalNonKoperasi,
		incidentalTotal,
		grandTotal,
		isPending: createMutation.isPending,
		handlePay,
	};
}
