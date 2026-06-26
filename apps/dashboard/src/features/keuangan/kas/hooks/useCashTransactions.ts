import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import { useGetV1CashTransactions } from "#/api/endpoints/cash/cash";
import { academicYearAtom } from "@/store/global";

export function useCashTransactions() {
	const [activeAy] = useAtom(academicYearAtom);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [jenis, setJenis] = useState("");
	const [tipe, setTipe] = useState("");
	const [page, setPage] = useState(1);

	const { data: txData, isLoading } = useGetV1CashTransactions(
		{
			academic_year_id: activeAy?.id,
			page,
			limit: 30,
			...(startDate ? { start_date: startDate } : {}),
			...(endDate ? { end_date: endDate } : {}),
			...(jenis ? { transaction_type: jenis } : {}),
			...(tipe ? { source_type: tipe } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const transactions = (txData?.data as any)?.data || [];
	const meta = (txData?.data as any)?.meta;

	const { totalCredit, totalDebit } = useMemo(() => {
		let credit = 0;
		let debit = 0;
		for (const tx of transactions) {
			if (tx.transaction_type === "credit") credit += Number(tx.amount);
			else debit += Number(tx.amount);
		}
		return { totalCredit: credit, totalDebit: debit };
	}, [transactions]);

	const groupedByDate = useMemo(() => {
		const groups: Record<string, any[]> = {};
		for (const tx of transactions) {
			const dateKey = (tx.transaction_date || tx.created_at || "").split(
				"T",
			)[0];
			if (!groups[dateKey]) groups[dateKey] = [];
			groups[dateKey].push(tx);
		}
		return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
	}, [transactions]);

	const handleReset = () => {
		setStartDate("");
		setEndDate("");
		setJenis("");
		setTipe("");
		setPage(1);
	};

	return {
		activeAy,
		transactions,
		meta,
		isLoading,
		startDate,
		setStartDate,
		endDate,
		setEndDate,
		jenis,
		setJenis,
		tipe,
		setTipe,
		page,
		setPage,
		totalCredit,
		totalDebit,
		groupedByDate,
		handleReset,
	};
}
