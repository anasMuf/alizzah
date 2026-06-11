import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	ArrowDownRight,
	ArrowUpRight,
	Calendar,
	ChevronRight,
	Filter,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1VaultTransactions } from "@alizzah/api-client/endpoints/vault/vault";
import { Button } from "@alizzah/ui";
import { academicYearAtom } from "../../../../../store/global";
import { formatCurrency, formatDate } from "../../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/keuangan/kas/berangkas/transaksi",
)({
	component: BerangkasTransaksiPage,
});

const SOURCE_TYPE_LABELS: Record<string, string> = {
	transfer_from_cash: "Transfer dari Kas",
	savings_deposit: "Setoran Tabungan",
	savings_withdrawal: "Penarikan Tabungan",
	graduation_allocation: "Alokasi Wisuda",
};

function BerangkasTransaksiPage() {
	const [activeAy] = useAtom(academicYearAtom);

	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [jenis, setJenis] = useState("");
	const [tipe, setTipe] = useState("");
	const [page, setPage] = useState(1);

	const { data: txData, isLoading } = useGetV1VaultTransactions(
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

	return (
		<div className="space-y-6">
			<nav className="flex items-center gap-1 text-sm text-gray-500">
				<Link to="/keuangan/kas" className="hover:text-indigo-600">
					Kas & Berangkas
				</Link>
				<ChevronRight className="h-4 w-4" />
				<span className="text-gray-900 font-medium">
					Riwayat Transaksi Berangkas
				</span>
			</nav>

			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Riwayat Transaksi Berangkas
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
							onChange={(e) => {
								setStartDate(e.target.value);
								setPage(1);
							}}
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
							onChange={(e) => {
								setEndDate(e.target.value);
								setPage(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Jenis
						</label>
						<select
							value={jenis}
							onChange={(e) => {
								setJenis(e.target.value);
								setPage(1);
							}}
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
							onChange={(e) => {
								setTipe(e.target.value);
								setPage(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Tipe</option>
							<option value="transfer_from_cash">Transfer dari Kas</option>
							<option value="savings_deposit">Setoran Tabungan</option>
							<option value="savings_withdrawal">Penarikan Tabungan</option>
							<option value="graduation_allocation">Alokasi Wisuda</option>
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
					<p className="text-sm text-gray-500">Masuk</p>
					<p className="text-xl font-bold text-green-600">
						{formatCurrency(totalCredit)}
					</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
					<p className="text-sm text-gray-500">Keluar</p>
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
								<th
									scope="col"
									className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-12"
								>
									#
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Waktu
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Keterangan
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Tipe
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 pr-6"
								>
									Nominal
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{isLoading ? (
								<tr>
									<td
										colSpan={5}
										className="px-3 py-8 text-center text-sm text-gray-500"
									>
										Memuat data transaksi...
									</td>
								</tr>
							) : groupedByDate.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="px-3 py-12 text-center text-sm text-gray-500"
									>
										Belum ada transaksi berangkas yang sesuai dengan filter.
									</td>
								</tr>
							) : (
								groupedByDate.map(([dateKey, txs]) => {
									let counter = 0;
									return [
										<tr key={`date-${dateKey}`} className="bg-gray-50">
											<td colSpan={5} className="py-2 pl-4 sm:pl-6">
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
													<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
														{SOURCE_TYPE_LABELS[tx.source_type] ||
															tx.source_type}
													</td>
													<td className="whitespace-nowrap px-3 py-3 text-sm text-right pr-6">
														<span
															className={`inline-flex items-center gap-1 font-semibold tabular-nums ${isCredit ? "text-green-600" : "text-red-600"}`}
														>
															{isCredit ? (
																<ArrowUpRight className="h-4 w-4" />
															) : (
																<ArrowDownRight className="h-4 w-4" />
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

				{meta && meta.total_pages > 1 && (
					<div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
						<div className="flex flex-1 justify-between sm:hidden">
							<Button
								variant="secondary"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
							>
								Previous
							</Button>
							<Button
								variant="secondary"
								onClick={() => setPage((p) => p + 1)}
								disabled={page >= meta.total_pages}
							>
								Next
							</Button>
						</div>
						<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
							<div>
								<p className="text-sm text-gray-700">
									Menampilkan{" "}
									<span className="font-medium">{(page - 1) * 30 + 1}</span>{" "}
									sampai{" "}
									<span className="font-medium">
										{Math.min(page * 30, meta.total_items)}
									</span>{" "}
									dari <span className="font-medium">{meta.total_items}</span>{" "}
									transaksi
								</p>
							</div>
							<div>
								<nav
									className="isolate inline-flex -space-x-px rounded-md shadow-sm"
									aria-label="Pagination"
								>
									<button
										type="button"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page === 1}
										className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
									>
										<span className="sr-only">Previous</span>
										<ChevronRight
											className="h-5 w-5 rotate-180"
											aria-hidden="true"
										/>
									</button>
									<span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
										{page}
									</span>
									<button
										type="button"
										onClick={() => setPage((p) => p + 1)}
										disabled={page >= meta.total_pages}
										className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
									>
										<span className="sr-only">Next</span>
										<ChevronRight className="h-5 w-5" aria-hidden="true" />
									</button>
								</nav>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
