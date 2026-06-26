import { ArrowDownRight, ArrowUpRight, Calendar, Filter } from "lucide-react";
import { Button } from "#/components/ui";
import { formatCurrency, formatDate } from "@/utils/format";

interface CashTransactionTableProps {
	transactions: any[];
	meta: any;
	isLoading: boolean;
	startDate: string;
	onStartDateChange: (v: string) => void;
	endDate: string;
	onEndDateChange: (v: string) => void;
	jenis: string;
	onJenisChange: (v: string) => void;
	tipe: string;
	onTipeChange: (v: string) => void;
	page: number;
	onPageChange: (p: number) => void;
	totalCredit: number;
	totalDebit: number;
	groupedByDate: [string, any[]][];
	onReset: () => void;
}

export function CashTransactionTable({
	transactions,
	meta,
	isLoading,
	startDate,
	onStartDateChange,
	endDate,
	onEndDateChange,
	jenis,
	onJenisChange,
	tipe,
	onTipeChange,
	page,
	onPageChange,
	totalCredit,
	totalDebit,
	groupedByDate,
	onReset,
}: CashTransactionTableProps) {
	return (
		<div className="space-y-6">
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="w-full sm:w-auto">
						<label
							htmlFor="tx-start"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Dari Tanggal
						</label>
						<input
							id="tx-start"
							type="date"
							value={startDate}
							onChange={(e) => {
								onStartDateChange(e.target.value);
								onPageChange(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
					<div className="w-full sm:w-auto">
						<label
							htmlFor="tx-end"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Sampai Tanggal
						</label>
						<input
							id="tx-end"
							type="date"
							value={endDate}
							onChange={(e) => {
								onEndDateChange(e.target.value);
								onPageChange(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
					<div className="w-full sm:w-auto">
						<label
							htmlFor="tx-type"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Jenis
						</label>
						<select
							id="tx-type"
							value={jenis}
							onChange={(e) => {
								onJenisChange(e.target.value);
								onPageChange(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua</option>
							<option value="credit">Masuk</option>
							<option value="debit">Keluar</option>
						</select>
					</div>
					<div className="w-full sm:w-auto">
						<label
							htmlFor="tx-source"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Tipe
						</label>
						<select
							id="tx-source"
							value={tipe}
							onChange={(e) => {
								onTipeChange(e.target.value);
								onPageChange(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Tipe</option>
							<option value="payment">Pembayaran</option>
							<option value="expense">Pengeluaran</option>
							<option value="transfer">Transfer</option>
						</select>
					</div>
					<div className="w-full sm:w-auto">
						<Button variant="secondary" className="bg-white" onClick={onReset}>
							<Filter className="w-4 h-4 mr-2" />
							Reset Filter
						</Button>
					</div>
				</div>
			</div>

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
							{isLoading ? (
								<tr>
									<td
										colSpan={4}
										className="px-3 py-8 text-center text-sm text-gray-500"
									>
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
											const timeStr = new Date(
												tx.transaction_date || tx.created_at,
											).toLocaleTimeString("id-ID", {
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
										onClick={() => onPageChange(Math.max(1, page - 1))}
										disabled={page === 1}
										className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
									>
										<span className="sr-only">Previous</span>
										<Calendar className="h-5 w-5 rotate-180" />
									</button>
									<span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
										{page}
									</span>
									<button
										type="button"
										onClick={() => onPageChange(page + 1)}
										disabled={page >= meta.total_pages}
										className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
									>
										<span className="sr-only">Next</span>
										<Calendar className="h-5 w-5" />
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
