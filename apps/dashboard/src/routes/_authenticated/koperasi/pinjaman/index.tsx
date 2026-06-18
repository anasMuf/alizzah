import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle, ChevronRight, HandCoins, Plus } from "lucide-react";
import { useState } from "react";
import { Badge, Button, EmptyState } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import {
	type LoanStatus,
	useLoanSummary,
	useLoans,
} from "../../../../features/koperasi/pinjaman/api";
import { PinjamanForm } from "../../../../features/koperasi/pinjaman/PinjamanForm";

export const Route = createFileRoute("/_authenticated/koperasi/pinjaman/")({
	component: PinjamanListPage,
	validateSearch: (
		search: Record<string, unknown>,
	): { action?: string; member_id?: number } => {
		return {
			action: search.action as string | undefined,
			member_id: search.member_id as number | undefined,
		};
	},
});

const LIMIT = 20;

const STATUS: Record<
	LoanStatus,
	{ label: string; variant: "danger" | "warning" | "success" }
> = {
	unpaid: { label: "Belum Bayar", variant: "danger" },
	partial: { label: "Sebagian", variant: "warning" },
	paid: { label: "Lunas", variant: "success" },
};

function PinjamanListPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const search = Route.useSearch();
	const [view, setView] = useState<"list" | "summary">("list");
	const [page, setPage] = useState(1);
	const [status, setStatus] = useState("");
	const [isFormOpen, setIsFormOpen] = useState(search.action === "new");

	if (!activeAy) {
		return (
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-4 text-sm font-semibold text-gray-900">
					Tahun Ajaran Belum Dipilih
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Pilih tahun ajaran pada panel samping untuk melihat pinjaman.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pinjaman</h1>
					<p className="text-sm text-gray-500">
						Simpan-pinjam anggota (tanpa bunga) — Tahun Ajaran {activeAy.name}.
					</p>
				</div>
				<Button variant="primary" onClick={() => setIsFormOpen(true)}>
					<Plus className="h-4 w-4 mr-1.5" /> Catat Pinjaman
				</Button>
			</div>

			<div className="flex gap-2 border-b border-gray-200">
				{(["list", "summary"] as const).map((v) => (
					<button
						key={v}
						type="button"
						onClick={() => setView(v)}
						className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
							view === v
								? "border-indigo-600 text-indigo-600"
								: "border-transparent text-gray-500 hover:text-gray-700"
						}`}
					>
						{v === "list" ? "Daftar Pinjaman" : "Rekap per Anggota"}
					</button>
				))}
			</div>

			{view === "list" ? (
				<LoanList
					ayId={activeAy.id}
					page={page}
					setPage={setPage}
					status={status}
					setStatus={setStatus}
				/>
			) : (
				<LoanSummary ayId={activeAy.id} />
			)}

			<PinjamanForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				initialMemberId={search.member_id}
			/>
		</div>
	);
}

function LoanList({
	ayId,
	page,
	setPage,
	status,
	setStatus,
}: {
	ayId: number;
	page: number;
	setPage: (fn: (p: number) => number) => void;
	status: string;
	setStatus: (s: string) => void;
}) {
	const { data, isLoading, isError } = useLoans(ayId, page, status);
	const rows = data?.data ?? [];
	const total = data?.meta.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / LIMIT));

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				{["", "unpaid", "partial", "paid"].map((s) => (
					<button
						key={s || "all"}
						type="button"
						onClick={() => {
							setStatus(s);
							setPage(() => 1);
						}}
						className={`rounded-md px-3 py-1 text-sm ${
							status === s
								? "bg-indigo-600 text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}
					>
						{s === "" ? "Semua" : STATUS[s as LoanStatus].label}
					</button>
				))}
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat pinjaman...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat pinjaman.</p>
			) : rows.length === 0 ? (
				<EmptyState
					icon={<HandCoins className="h-10 w-10 text-gray-400" />}
					title="Belum ada pinjaman"
					description="Catat pengajuan pinjaman anggota untuk mulai mencatat simpan-pinjam."
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
										Anggota
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Keperluan
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Pokok
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
								{rows.map((l) => (
									<tr key={l.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
											{formatDate(l.loan_date)}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											{l.member_name || "-"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-600">
											{l.purpose}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
											{formatCurrency(l.principal)}
										</td>
										<td className="px-4 py-3 text-sm text-right whitespace-nowrap">
											<span
												className={
													l.remaining > 0
														? "text-amber-600 font-medium"
														: "text-gray-400"
												}
											>
												{formatCurrency(l.remaining)}
											</span>
										</td>
										<td className="px-4 py-3">
											<Badge variant={STATUS[l.status].variant}>
												{STATUS[l.status].label}
											</Badge>
										</td>
										<td className="px-4 py-3 text-right">
											<Link
												to="/koperasi/pinjaman/$id"
												params={{ id: String(l.id) }}
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
								Halaman {page} dari {totalPages} · {total} pinjaman
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

function LoanSummary({ ayId }: { ayId: number }) {
	const { data, isLoading, isError } = useLoanSummary(ayId);
	// Endpoint summary bisa mengembalikan null (slice nil) saat belum ada data;
	// default `= []` hanya menangani undefined, jadi koersi eksplisit di sini.
	const items = data ?? [];

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat rekap...</p>;
	}
	if (isError) {
		return <p className="text-sm text-red-600">Gagal memuat rekap.</p>;
	}
	if (items.length === 0) {
		return (
			<EmptyState
				icon={<HandCoins className="h-10 w-10 text-gray-400" />}
				title="Belum ada data"
				description="Rekap muncul setelah ada pinjaman tercatat."
			/>
		);
	}

	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
							Anggota
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Jml Pinjaman
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Total Pokok
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Dibayar
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Sisa
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100">
					{items.map((it) => (
						<tr key={it.member_id} className="hover:bg-gray-50">
							<td className="px-4 py-3 text-sm font-medium text-gray-900">
								{it.member_name}
							</td>
							<td className="px-4 py-3 text-sm text-gray-600 text-right">
								{it.loan_count}
							</td>
							<td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
								{formatCurrency(it.total_principal)}
							</td>
							<td className="px-4 py-3 text-sm text-emerald-600 text-right whitespace-nowrap">
								{formatCurrency(it.total_paid)}
							</td>
							<td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
								<span
									className={
										it.remaining > 0 ? "text-amber-600" : "text-gray-400"
									}
								>
									{formatCurrency(it.remaining)}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
