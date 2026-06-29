import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle, ArrowLeftRight, Plus } from "lucide-react";
import { useState } from "react";
import { Badge, Button, EmptyState } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import { useMiscTransactions } from "../../../features/koperasi/lainlain/api";
import { LainLainForm } from "../../../features/koperasi/lainlain/LainLainForm";

export const Route = createFileRoute("/_authenticated/koperasi/lain-lain")({
	component: LainLainPage,
});

const LIMIT = 20;

const FLOW_TABS = [
	{ key: "", label: "Semua" },
	{ key: "income", label: "Pemasukan" },
	{ key: "expense", label: "Pengeluaran" },
];

function LainLainPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const [page, setPage] = useState(1);
	const [flow, setFlow] = useState("");
	const [isFormOpen, setIsFormOpen] = useState(false);

	const { data, isLoading, isError } = useMiscTransactions(
		activeAy?.id,
		page,
		flow,
	);
	const rows = data?.data ?? [];
	const total = data?.meta.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / LIMIT));

	if (!activeAy) {
		return (
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-4 text-sm font-semibold text-gray-900">
					Tahun Ajaran Belum Dipilih
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Pilih tahun ajaran pada panel samping untuk melihat transaksi.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Lain-lain</h1>
					<p className="text-sm text-gray-500">
						Pemasukan & pengeluaran lain koperasi — Tahun Ajaran {activeAy.name}
						.
					</p>
				</div>
				<Button variant="primary" onClick={() => setIsFormOpen(true)}>
					<Plus className="h-4 w-4 mr-1.5" /> Catat Transaksi
				</Button>
			</div>

			<div className="flex gap-2">
				{FLOW_TABS.map((t) => (
					<button
						key={t.key || "all"}
						type="button"
						onClick={() => {
							setFlow(t.key);
							setPage(1);
						}}
						className={`rounded-md px-3 py-1 text-sm ${
							flow === t.key
								? "bg-indigo-600 text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat transaksi...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat transaksi.</p>
			) : rows.length === 0 ? (
				<EmptyState
					icon={<ArrowLeftRight className="h-10 w-10 text-gray-400" />}
					title="Belum ada transaksi"
					description="Catat pemasukan atau pengeluaran lain koperasi (mis. donasi, biaya admin)."
				/>
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
										Jenis
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Kategori
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Keterangan
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Jumlah
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{rows.map((m) => {
									const isIncome = m.flow === "income";
									return (
										<tr key={m.id} className="hover:bg-gray-50">
											<td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
												{formatDate(m.transaction_date)}
											</td>
											<td className="px-4 py-3">
												<Badge variant={isIncome ? "success" : "secondary"}>
													{isIncome ? "Pemasukan" : "Pengeluaran"}
												</Badge>
											</td>
											<td className="px-4 py-3 text-sm text-gray-900">
												{m.category}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600">
												{m.description || "-"}
											</td>
											<td
												className={`px-4 py-3 text-sm text-right font-medium whitespace-nowrap ${
													isIncome ? "text-emerald-600" : "text-rose-600"
												}`}
											>
												{isIncome ? "+" : "−"}
												{formatCurrency(m.amount)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between text-sm">
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

			<LainLainForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
		</div>
	);
}
