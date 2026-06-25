import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { Alert, Button, EmptyState } from "#/components/ui";
import { formatCurrency, formatDate } from "@/utils/format";

interface ExpenseTableProps {
	expenses: any[];
	meta: any;
	isLoading: boolean;
	isError: boolean;
	page: number;
	onPageChange: (p: number) => void;
	getCategoryLabel: (expense: any) => string;
}

export function ExpenseTable({
	expenses,
	meta,
	isLoading,
	isError,
	page,
	onPageChange,
	getCategoryLabel,
}: ExpenseTableProps) {
	if (isError) {
		return (
			<Alert variant="error" title="Gagal Memuat Data">
				Terjadi kesalahan saat memuat data pengeluaran. Silakan coba lagi.
			</Alert>
		);
	}

	return (
		<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-300">
					<thead className="bg-gray-50">
						<tr>
							<th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-16">
								#
							</th>
							<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
								Tanggal
							</th>
							<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
								Kategori
							</th>
							<th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
								Nominal
							</th>
							<th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
								<span className="sr-only">Aksi</span>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 bg-white">
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<tr key={i}>
									<td className="py-4 pl-4 pr-3 sm:pl-6">
										<div className="h-4 w-6 bg-gray-200 rounded animate-pulse" />
									</td>
									<td className="px-3 py-4">
										<div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
									</td>
									<td className="px-3 py-4">
										<div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
									</td>
									<td className="px-3 py-4 text-right">
										<div className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto" />
									</td>
									<td className="py-4 pl-3 pr-4 sm:pr-6">
										<div className="h-4 w-12 bg-gray-200 rounded animate-pulse ml-auto" />
									</td>
								</tr>
							))
						) : expenses.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-3 py-12">
									<EmptyState
										title="Belum Ada Pengeluaran"
										description="Belum ada data pengeluaran yang sesuai dengan filter."
										action={
											<Link to="/keuangan/pengeluaran/baru">
												<Button variant="primary" size="sm">
													<Plus className="w-4 h-4 mr-1" />
													Catat Pengeluaran Baru
												</Button>
											</Link>
										}
									/>
								</td>
							</tr>
						) : (
							expenses.map((expense: any, index: number) => (
								<tr key={expense.id} className="hover:bg-gray-50 group">
									<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
										{(page - 1) * 20 + index + 1}
									</td>
									<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
										{formatDate(expense.expense_date)}
									</td>
									<td className="px-3 py-4 text-sm text-gray-900">
										{getCategoryLabel(expense)}
										{expense.description && (
											<div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
												{expense.description}
											</div>
										)}
									</td>
									<td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-gray-900 text-right">
										{formatCurrency(Number(expense.amount))}
									</td>
									<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
										<Link
											to="/keuangan/pengeluaran/$id"
											params={{ id: String(expense.id) }}
											className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
										>
											Detail <ChevronRight className="w-4 h-4 ml-1" />
										</Link>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{meta && meta.total_pages > 1 && (
				<Pagination meta={meta} page={page} onPageChange={onPageChange} />
			)}
		</div>
	);
}

function Pagination({
	meta,
	page,
	onPageChange,
}: {
	meta: any;
	page: number;
	onPageChange: (p: number) => void;
}) {
	return (
		<div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
			<div className="flex flex-1 justify-between sm:hidden">
				<Button
					variant="secondary"
					onClick={() => onPageChange(Math.max(1, page - 1))}
					disabled={page === 1}
				>
					Previous
				</Button>
				<Button
					variant="secondary"
					onClick={() => onPageChange(page + 1)}
					disabled={page >= meta.total_pages}
				>
					Next
				</Button>
			</div>
			<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p className="text-sm text-gray-700">
						Menampilkan{" "}
						<span className="font-medium">{(page - 1) * 20 + 1}</span> sampai{" "}
						<span className="font-medium">
							{Math.min(page * 20, meta.total_items)}
						</span>{" "}
						dari <span className="font-medium">{meta.total_items}</span>{" "}
						pengeluaran
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
							className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
						>
							<span className="sr-only">Previous</span>
							<ChevronRight className="h-5 w-5 rotate-180" aria-hidden="true" />
						</button>
						<span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
							{page}
						</span>
						<button
							type="button"
							onClick={() => onPageChange(page + 1)}
							disabled={page >= meta.total_pages}
							className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
						>
							<span className="sr-only">Next</span>
							<ChevronRight className="h-5 w-5" aria-hidden="true" />
						</button>
					</nav>
				</div>
			</div>
		</div>
	);
}
