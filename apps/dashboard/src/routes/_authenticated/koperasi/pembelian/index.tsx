import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle, ChevronRight, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Badge, EmptyState } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import {
	type PurchaseStatus,
	usePurchases,
} from "../../../../features/koperasi/pembelian/api";

export const Route = createFileRoute("/_authenticated/koperasi/pembelian/")({
	component: PembelianListPage,
});

const LIMIT = 20;

const STATUS: Record<
	PurchaseStatus,
	{ label: string; variant: "danger" | "warning" | "success" }
> = {
	unpaid: { label: "Belum Bayar", variant: "danger" },
	partial: { label: "Sebagian", variant: "warning" },
	paid: { label: "Lunas", variant: "success" },
};

function PembelianListPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const [page, setPage] = useState(1);
	const [status, setStatus] = useState("");

	const { data, isLoading, isError } = usePurchases(activeAy?.id, page, status);
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
					Pilih tahun ajaran pada panel samping untuk melihat pembelian.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pembelian</h1>
					<p className="text-sm text-gray-500">
						Pembelian barang dari pemasok — Tahun Ajaran {activeAy.name}.
					</p>
				</div>
				<Link
					to="/koperasi/pembelian/pos"
					className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
				>
					<Plus className="h-4 w-4 mr-1.5" /> Restok Barang
				</Link>
			</div>

			<div className="flex gap-2">
				{["", "unpaid", "partial", "paid"].map((s) => (
					<button
						key={s || "all"}
						type="button"
						onClick={() => {
							setStatus(s);
							setPage(1);
						}}
						className={`rounded-md px-3 py-1 text-sm ${
							status === s
								? "bg-indigo-600 text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}
					>
						{s === "" ? "Semua" : STATUS[s as PurchaseStatus].label}
					</button>
				))}
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat pembelian...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat pembelian.</p>
			) : rows.length === 0 ? (
				<EmptyState
					icon={<ShoppingBag className="h-10 w-10 text-gray-400" />}
					title="Belum ada pembelian"
					description="Catat pembelian barang dari pemasok untuk menambah stok."
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
										Pemasok
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Total
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Sisa
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Status
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Detail
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{rows.map((p) => (
									<tr key={p.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
											{formatDate(p.purchase_date)}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											{p.supplier_name || "-"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
											{formatCurrency(p.total_amount)}
										</td>
										<td className="px-4 py-3 text-sm text-right whitespace-nowrap">
											<span
												className={
													p.remaining > 0
														? "text-amber-600 font-medium"
														: "text-gray-400"
												}
											>
												{formatCurrency(p.remaining)}
											</span>
										</td>
										<td className="px-4 py-3">
											<Badge variant={STATUS[p.status].variant}>
												{STATUS[p.status].label}
											</Badge>
										</td>
										<td className="px-4 py-3 text-right">
											<Link
												to="/koperasi/pembelian/$id"
												params={{ id: String(p.id) }}
												className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
											>
												Lihat <ChevronRight className="h-4 w-4" />
											</Link>
										</td>
									</tr>
								))}
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
		</div>
	);
}
