import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	ArrowDownRight,
	ArrowUpRight,
	Calendar,
	ChevronRight,
	Filter,
	Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGetV1CashTransactions } from "#/api/endpoints/cash/cash";
import { Button } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency, formatDate } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/kas/transaksi")({
	component: KasTransaksiPage,
});

const PAGE_SIZE = 50;

function KasTransaksiPage() {
	const [activeAy] = useAtom(academicYearAtom);

	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [jenis, setJenis] = useState("");
	const [tipe, setTipe] = useState("");
	const [page, setPage] = useState(1);
	const [allTxs, setAllTxs] = useState<any[]>([]);

	// Reset accumulated data when filters change
	const resetAndReload = useCallback(() => {
		setAllTxs([]);
		setPage(1);
	}, []);

	const {
		data: txData,
		isLoading,
		isFetching,
	} = useGetV1CashTransactions(
		{
			academic_year_id: activeAy?.id,
			page,
			limit: PAGE_SIZE,
			...(startDate ? { start_date: startDate } : {}),
			...(endDate ? { end_date: endDate } : {}),
			...(jenis ? { transaction_type: jenis } : {}),
			...(tipe ? { source_type: tipe } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const transactions = (txData?.data as any)?.data || [];
	const meta = (txData?.data as any)?.meta;
	const totalItems = Number(meta?.total ?? 0);
	const hasMore = allTxs.length < totalItems;

	// Accumulate transactions across pages
	useEffect(() => {
		if (transactions.length > 0) {
			setAllTxs((prev) => {
				const existingIds = new Set(prev.map((t: any) => t.id));
				const newTxs = transactions.filter((t: any) => !existingIds.has(t.id));
				return [...prev, ...newTxs];
			});
		}
	}, [transactions]);

	// Summary from metadata (covers all filtered data, not just current page)
	const totalCredit = Number(meta?.total_credit ?? 0);
	const totalDebit = Number(meta?.total_debit ?? 0);

	// Infinite scroll sentinel
	const sentinelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el || !hasMore || isFetching) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !isFetching) {
					setPage((p) => p + 1);
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasMore, isFetching]);

	const groupedByDate = useMemo(() => {
		const groups: Record<string, any[]> = {};
		for (const tx of allTxs) {
			const dateKey = (tx.transaction_date || tx.created_at || "").split(
				"T",
			)[0];
			if (!groups[dateKey]) groups[dateKey] = [];
			groups[dateKey].push(tx);
		}
		return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
	}, [allTxs]);

	const handleReset = () => {
		setStartDate("");
		setEndDate("");
		setJenis("");
		setTipe("");
		resetAndReload();
	};

	const handleFilterChange = (setter: (v: string) => void, value: string) => {
		setter(value);
		resetAndReload();
	};

	const isFirstLoad = isLoading && allTxs.length === 0;

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav className="flex items-center gap-1 text-sm text-gray-500">
				<Link to="/keuangan/kas" className="hover:text-indigo-600">
					Kas & Berangkas
				</Link>
				<ChevronRight className="h-4 w-4" />
				<span className="text-gray-900 font-medium">Riwayat Transaksi</span>
			</nav>

			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Riwayat Transaksi Kas
				</h2>
				<p className="mt-1 text-sm text-gray-500">TA {activeAy?.name || "-"}</p>
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Dari Tanggal
						</label>
						<input
							type="date"
							value={startDate}
							onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Sampai Tanggal
						</label>
						<input
							type="date"
							value={endDate}
							onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Jenis
						</label>
						<select
							value={jenis}
							onChange={(e) => handleFilterChange(setJenis, e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua</option>
							<option value="credit">Masuk</option>
							<option value="debit">Keluar</option>
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Tipe
						</label>
						<select
							value={tipe}
							onChange={(e) => handleFilterChange(setTipe, e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Tipe</option>
							<option value="payment">Pembayaran</option>
							<option value="expense">Pengeluaran</option>
							<option value="transfer_to_vault">Transfer ke Brangkas</option>
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<Button
							variant="secondary"
							className="bg-white"
							onClick={handleReset}
						>
							<Filter className="w-4 h-4 mr-2" />
							Reset Filter
						</Button>
					</div>
				</div>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
					<p className="text-sm text-gray-500">Pemasukan</p>
					<p className="text-xl font-bold text-green-600">
						{formatCurrency(totalCredit)}
					</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
					<p className="text-sm text-gray-500">Pengeluaran</p>
					<p className="text-xl font-bold text-red-600">
						{formatCurrency(totalDebit)}
					</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
					<p className="text-sm text-gray-500">Saldo Akhir</p>
					<p className="text-xl font-bold text-gray-900">
						{formatCurrency(totalCredit - totalDebit)}
					</p>
				</div>
			</div>

			{/* Transaction Table */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-300">
						<thead className="bg-gray-50">
							<tr>
								<th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-12">
									#
								</th>
								<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
									Waktu
								</th>
								<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
									Keterangan
								</th>
								<th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 pr-6">
									Nominal
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{isFirstLoad ? (
								<tr>
									<td
										colSpan={4}
										className="px-3 py-8 text-center text-sm text-gray-500"
									>
										<Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
										Memuat data transaksi...
									</td>
								</tr>
							) : groupedByDate.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="px-3 py-12 text-center text-sm text-gray-500"
									>
										Belum ada transaksi yang sesuai dengan filter.
									</td>
								</tr>
							) : (
								groupedByDate.map(([dateKey, txs]) => {
									let counter = 0;
									return [
										<tr key={`date-${dateKey}`} className="bg-gray-50">
											<td colSpan={4} className="py-2 pl-4 sm:pl-6">
												<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
													<Calendar className="h-4 w-4 text-gray-400" />
													{formatDate(dateKey)}
												</div>
											</td>
										</tr>,
										...txs.map((tx: any) => {
											counter++;
											const isCredit = tx.transaction_type === "credit";
											const txDate = new Date(
												tx.transaction_date || tx.created_at,
											);
											const timeStr = txDate.toLocaleTimeString("id-ID", {
												hour: "2-digit",
												minute: "2-digit",
											});

											return (
												<tr key={tx.id} className="hover:bg-gray-50">
													<td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
														{counter}
													</td>
													<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
														{timeStr}
													</td>
													<td className="px-3 py-3 text-sm text-gray-900">
														<p>{tx.description}</p>
														{tx.created_by?.full_name && (
															<p className="text-xs text-gray-500 mt-0.5">
																oleh {tx.created_by.full_name}
															</p>
														)}
													</td>
													<td className="whitespace-nowrap px-3 py-3 text-sm text-right pr-6">
														<span
															className={`inline-flex items-center gap-1 font-semibold tabular-nums ${isCredit ? "text-green-600" : "text-red-600"}`}
														>
															{isCredit ? (
																<ArrowDownRight className="h-4 w-4" />
															) : (
																<ArrowUpRight className="h-4 w-4" />
															)}
															{isCredit ? "+" : "-"}
															{formatCurrency(Number(tx.amount))}
														</span>
													</td>
												</tr>
											);
										}),
									];
								})
							)}
						</tbody>
					</table>
				</div>

				{/* Infinite scroll sentinel */}
				<div ref={sentinelRef} className="py-4 text-center">
					{isFetching && allTxs.length > 0 && (
						<div className="flex items-center justify-center gap-2 text-sm text-gray-500">
							<Loader2 className="h-4 w-4 animate-spin" />
							Memuat...
						</div>
					)}
					{!hasMore && allTxs.length > 0 && (
						<p className="text-sm text-gray-400">
							{allTxs.length} dari {totalItems} transaksi ditampilkan
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
