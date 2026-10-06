import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ArrowLeft, HandCoins, Trash2, UserCog } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Badge, Button, ConfirmDialog, useToast } from "#/components/ui";
import {
	type GolonganHistory,
	useDeleteGolonganHistory,
	useEmployee,
	useGolonganHistory,
	useGolongans,
	useRiwayat,
	useSaveGolonganHistory,
} from "#/features/sdm/api";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/guru/$id")({
	component: GuruDetailPage,
});

const PAGE_SIZE = 10;

function GuruDetailPage() {
	const { id } = Route.useParams();
	const employeeId = Number(id);
	const { data: emp, isLoading, isError } = useEmployee(employeeId);
	const [activeAy] = useAtom(academicYearAtom);
	const { data: riwayat, isLoading: loadingRiwayat } = useRiwayat(
		activeAy?.id,
		employeeId,
	);

	// Hanya bulan yang punya penggajian (riwayat pembayaran).
	const riwayatRows = useMemo(
		() => (riwayat?.per_bulan ?? []).filter((b) => b.ada_data),
		[riwayat],
	);

	// Infinite scroll: tampilkan PAGE_SIZE baris dulu, tambah saat sentinel terlihat.
	const [visible, setVisible] = useState(PAGE_SIZE);
	const sentinelRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset saat karyawan/TA berganti
	useEffect(() => {
		setVisible(PAGE_SIZE);
	}, [employeeId, activeAy?.id]);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && visible < riwayatRows.length) {
					setVisible(visible + PAGE_SIZE);
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [visible, riwayatRows.length]);

	const shown = riwayatRows.slice(0, visible);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat karyawan...</p>;
	}
	if (isError || !emp) {
		return <p className="text-sm text-red-600">Gagal memuat karyawan.</p>;
	}

	return (
		<div className="space-y-6">
			<Link
				to="/sdm/guru"
				className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600"
			>
				<ArrowLeft className="h-4 w-4 mr-1" /> Data Karyawan
			</Link>

			{/* Profil karyawan */}
			<div className="rounded-lg border border-gray-200 bg-white p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{emp.nama}</h1>
						<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
							<span>Masuk {formatDate(emp.tgl_masuk ?? undefined)}</span>
							<Badge variant="info">Golongan {emp.golongan?.kode ?? "-"}</Badge>
							{emp.sertifikasi && <Badge variant="warning">Sertifikasi</Badge>}
							{emp.impasing && <Badge variant="danger">Impasing</Badge>}
							{!emp.is_active && <Badge variant="secondary">Nonaktif</Badge>}
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link
							to="/sdm/penggajian/olah-hr/$id"
							params={{ id: String(employeeId) }}
							className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
						>
							<UserCog className="h-4 w-4 mr-1.5" /> Olah HR
						</Link>
						<Link
							to="/sdm/pinjaman"
							search={{ employee_id: employeeId }}
							className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							<HandCoins className="h-4 w-4 mr-1.5" /> Pinjaman
						</Link>
					</div>
				</div>
			</div>

			{/* Riwayat penggajian */}
			<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
				<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
					<h2 className="text-sm font-semibold text-gray-900">
						Riwayat Penggajian
					</h2>
					{activeAy && (
						<span className="text-xs text-gray-500">TA {activeAy.name}</span>
					)}
				</div>

				{!activeAy ? (
					<p className="px-5 py-6 text-sm text-gray-500">
						Pilih Tahun Ajaran pada panel samping untuk melihat riwayat.
					</p>
				) : loadingRiwayat ? (
					<p className="px-5 py-6 text-sm text-gray-500">Memuat riwayat...</p>
				) : riwayatRows.length === 0 ? (
					<p className="px-5 py-6 text-sm text-gray-400">
						Belum ada penggajian pada Tahun Ajaran ini.
					</p>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											Bulan
										</th>
										<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											Golongan
										</th>
										<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											Status
										</th>
										<th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
											Total
										</th>
										<th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
											Slip
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{shown.map((b) => (
										<tr key={b.periode} className="hover:bg-gray-50">
											<td className="px-5 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
												{b.label}
											</td>
											<td className="px-5 py-3 text-sm whitespace-nowrap">
												{b.golongan_kode ? (
													<Badge variant="info">{b.golongan_kode}</Badge>
												) : (
													<span className="text-gray-400">-</span>
												)}
											</td>
											<td className="px-5 py-3">
												{b.status === "finalized" ? (
													<Badge variant="success">Finalized</Badge>
												) : (
													<Badge variant="warning">Preview</Badge>
												)}
											</td>
											<td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
												{formatCurrency(b.total_gaji)}
											</td>
											<td className="px-5 py-3 text-right">
												<Link
													to="/sdm/penggajian/$id"
													params={{ id: String(employeeId) }}
													search={{ periode: b.periode.slice(0, 7) }}
													className="text-sm text-indigo-600 hover:text-indigo-800"
												>
													Lihat Slip
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{/* Sentinel infinite scroll */}
						<div ref={sentinelRef} className="h-px" />
						<div className="flex items-center justify-center py-3 text-sm text-gray-500">
							{shown.length < riwayatRows.length
								? `Menampilkan ${shown.length} dari ${riwayatRows.length} bulan`
								: `Semua ${riwayatRows.length} bulan ditampilkan`}
						</div>
					</>
				)}
			</div>

			{/* Riwayat golongan */}
			<GolonganHistorySection employeeId={employeeId} />
		</div>
	);
}

// GolonganHistorySection — penugasan golongan effective-dated (audit & override).
function GolonganHistorySection({ employeeId }: { employeeId: number }) {
	const { addToast } = useToast();
	const { data: rows = [], isLoading } = useGolonganHistory(employeeId);
	const { data: golongans = [] } = useGolongans();
	const save = useSaveGolonganHistory();
	const del = useDeleteGolonganHistory();
	const [golonganId, setGolonganId] = useState("");
	const [tanggal, setTanggal] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [alasan, setAlasan] = useState("");
	const [confirmDelete, setConfirmDelete] = useState<GolonganHistory | null>(
		null,
	);

	const submit = () => {
		if (!golonganId) {
			addToast({
				variant: "warning",
				title: "Pilih golongan",
				message: "Golongan wajib dipilih.",
			});
			return;
		}
		save.mutate(
			{
				employeeId,
				input: {
					golongan_id: Number(golonganId),
					effective_date: tanggal,
					reason: alasan.trim(),
				},
			},
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: "Riwayat golongan disimpan.",
					});
					setAlasan("");
				},
				onError: (err: Error) =>
					addToast({
						variant: "error",
						title: "Gagal",
						message:
							err instanceof ApiError ? err.message : "Terjadi kesalahan",
					}),
			},
		);
	};

	// Tampilkan yang terbaru di atas.
	const sorted = [...rows].sort((a, b) =>
		b.effective_date.localeCompare(a.effective_date),
	);

	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
			<div className="border-b border-gray-100 px-5 py-4">
				<h2 className="text-sm font-semibold text-gray-900">
					Riwayat Golongan
				</h2>
				<p className="mt-1 text-xs text-gray-500">
					Penugasan golongan berlaku sejak tanggal tertentu dan dipakai
					menghitung gaji (mengalahkan perhitungan masa kerja).
				</p>
			</div>

			<div className="flex flex-wrap items-end gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
				<div>
					<label
						htmlFor="gh-golongan"
						className="block text-xs font-medium text-gray-700 mb-1"
					>
						Golongan
					</label>
					<select
						id="gh-golongan"
						value={golonganId}
						onChange={(e) => setGolonganId(e.target.value)}
						className="block rounded-md border-0 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
					>
						<option value="">Pilih…</option>
						{golongans.map((g) => (
							<option key={g.id} value={g.id}>
								{g.kode} — {g.keterangan}
							</option>
						))}
					</select>
				</div>
				<div>
					<label
						htmlFor="gh-tanggal"
						className="block text-xs font-medium text-gray-700 mb-1"
					>
						Berlaku Sejak
					</label>
					<input
						id="gh-tanggal"
						type="date"
						value={tanggal}
						onChange={(e) => setTanggal(e.target.value)}
						className="block rounded-md border-0 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
					/>
				</div>
				<div className="min-w-[180px] flex-1">
					<label
						htmlFor="gh-alasan"
						className="block text-xs font-medium text-gray-700 mb-1"
					>
						Alasan (opsional)
					</label>
					<input
						id="gh-alasan"
						value={alasan}
						onChange={(e) => setAlasan(e.target.value)}
						placeholder="mis. kenaikan berkala"
						className="block w-full rounded-md border-0 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
					/>
				</div>
				<Button
					variant="primary"
					size="sm"
					onClick={submit}
					disabled={save.isPending}
				>
					{save.isPending ? "Menyimpan…" : "Tambah"}
				</Button>
			</div>

			{isLoading ? (
				<p className="px-5 py-6 text-sm text-gray-500">Memuat riwayat...</p>
			) : sorted.length === 0 ? (
				<p className="px-5 py-6 text-sm text-gray-400">
					Belum ada riwayat golongan.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Berlaku Sejak
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Golongan
								</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Alasan
								</th>
								<th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{sorted.map((h) => (
								<tr key={h.id} className="hover:bg-gray-50">
									<td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">
										{formatDate(h.effective_date)}
									</td>
									<td className="px-5 py-3">
										<Badge variant="info">Golongan {h.golongan_kode}</Badge>
									</td>
									<td className="px-5 py-3 text-sm text-gray-600">
										{h.reason || "-"}
									</td>
									<td className="px-5 py-3 text-right">
										<button
											type="button"
											onClick={() => setConfirmDelete(h)}
											className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
										>
											<Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<ConfirmDialog
				open={confirmDelete !== null}
				title="Hapus Riwayat Golongan?"
				description={`Penugasan golongan ${confirmDelete?.golongan_kode ?? ""} berlaku ${confirmDelete?.effective_date ?? ""} akan dihapus — gaji kembali memakai perhitungan masa kerja.`}
				confirmLabel="Hapus"
				variant="danger"
				onConfirm={() => {
					if (!confirmDelete) return;
					del.mutate(
						{ employeeId, historyId: confirmDelete.id },
						{
							onSuccess: () => {
								addToast({
									variant: "success",
									title: "Berhasil",
									message: "Riwayat golongan dihapus.",
								});
								setConfirmDelete(null);
							},
							onError: (err: Error) =>
								addToast({
									variant: "error",
									title: "Gagal",
									message:
										err instanceof ApiError ? err.message : "Terjadi kesalahan",
								}),
						},
					);
				}}
				onCancel={() => setConfirmDelete(null)}
			/>
		</div>
	);
}
