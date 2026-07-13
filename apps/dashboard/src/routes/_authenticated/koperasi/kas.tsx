import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import {
	useKasBalance,
	useKasTransactions,
} from "../../../features/koperasi/kas/api";

export const Route = createFileRoute("/_authenticated/koperasi/kas")({
	component: KasPage,
});

const LIMIT = 20;

function KasPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const [page, setPage] = useState(1);
	const ayId = activeAy?.id;

	const { data: balance } = useKasBalance(ayId);
	const { data: jurnal, isLoading, isError } = useKasTransactions(ayId, page);

	const rows = jurnal?.data ?? [];
	const total = jurnal?.meta.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / LIMIT));

	if (!activeAy) {
		return (
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-4 text-sm font-semibold text-gray-900">
					Tahun Ajaran Belum Dipilih
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Pilih tahun ajaran pada panel samping untuk melihat kas koperasi.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Kas Koperasi</h1>
				<p className="text-sm text-gray-500">
					Saldo & jurnal arus kas — Tahun Ajaran {activeAy.name}.
				</p>
			</div>

			<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5 max-w-sm">
				<div className="p-5 flex items-center">
					<div className="rounded-md bg-emerald-50 p-3 shrink-0">
						<Wallet className="h-6 w-6 text-emerald-600" />
					</div>
					<div className="ml-5">
						<dt className="text-sm font-medium text-gray-500">Saldo Kas</dt>
						<dd className="text-2xl font-bold text-gray-900">
							{formatCurrency(Number(balance?.balance ?? 0))}
						</dd>
					</div>
				</div>
			</div>

			<div>
				<h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
					Jurnal Arus Kas
				</h2>
				{isLoading ? (
					<p className="text-sm text-gray-500">Memuat jurnal...</p>
				) : isError ? (
					<p className="text-sm text-red-600">Gagal memuat jurnal kas.</p>
				) : rows.length === 0 ? (
					<p className="text-sm text-gray-500">
						Belum ada transaksi kas pada tahun ajaran ini.
					</p>
				) : (
					<>
						<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											Tanggal
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											Keterangan
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											Kategori
										</th>
										<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
											Jumlah
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{rows.map((t) => {
										const isCredit = t.transaction_type === "credit";
										return (
											<tr key={t.id} className="hover:bg-gray-50">
												<td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
													{formatDate(t.transaction_date)}
												</td>
												<td className="px-4 py-3 text-sm text-gray-900">
													{t.description || "-"}
												</td>
												<td className="px-4 py-3">
													<Badge variant={isCredit ? "secondary" : "success"}>
														{t.category || t.source_type}
													</Badge>
												</td>
												<td
													className={`px-4 py-3 text-sm text-right font-medium whitespace-nowrap ${
														isCredit ? "text-rose-600" : "text-emerald-600"
													}`}
												>
													<span className="inline-flex items-center justify-end gap-1">
														{isCredit ? (
															<ArrowUpRight className="h-3.5 w-3.5" />
														) : (
															<ArrowDownLeft className="h-3.5 w-3.5" />
														)}
														{isCredit ? "−" : "+"}
														{formatCurrency(t.amount)}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{totalPages > 1 && (
							<div className="mt-3 flex items-center justify-between text-sm">
								<span className="text-gray-500">
									Halaman {page} dari {totalPages} · {total} transaksi
								</span>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page <= 1}
										className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50 hover:bg-gray-50"
									>
										Sebelumnya
									</button>
									<button
										type="button"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page >= totalPages}
										className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50 hover:bg-gray-50"
									>
										Berikutnya
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
