import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertCircle,
	ChevronRight,
	Lock,
	LockOpen,
	Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	useToast,
} from "#/components/ui";
import {
	formatPeriode,
	monthsInAcademicYear,
	useFinalizePayroll,
	usePenggajian,
	useUnlockPayroll,
} from "#/features/sdm/api";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/penggajian/")({
	component: PenggajianPage,
});

function PenggajianPage() {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);
	const months = useMemo(
		() => (activeAy ? monthsInAcademicYear(activeAy) : []),
		[activeAy],
	);
	const [periode, setPeriode] = useState("");
	const [confirmAction, setConfirmAction] = useState<
		"finalize" | "unlock" | null
	>(null);

	useEffect(() => {
		if (months.length > 0 && !months.some((m) => m.value === periode)) {
			const now = new Date();
			const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
			setPeriode(months.some((m) => m.value === cur) ? cur : months[0].value);
		}
	}, [months, periode]);

	const { data: payroll, isLoading, isError } = usePenggajian(periode);
	const finalize = useFinalizePayroll();
	const unlock = useUnlockPayroll();

	if (!activeAy) {
		return (
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-4 text-sm font-semibold text-gray-900">
					Tahun Ajaran Belum Dipilih
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Pilih tahun ajaran pada panel samping untuk melihat penggajian.
				</p>
			</div>
		);
	}

	const rows = payroll?.rows ?? [];
	const status = payroll?.status ?? "preview";
	const isFinalized = status === "finalized";

	const runAction = () => {
		if (!confirmAction || !periode) return;
		if (confirmAction === "finalize") {
			finalize.mutate(periode, {
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `Penggajian ${formatPeriode(periode)} difinalisasi — snapshot terkunci.`,
					});
					setConfirmAction(null);
				},
				onError: (err: Error) =>
					addToast({
						variant: "error",
						title: "Gagal",
						message:
							err instanceof ApiError ? err.message : "Terjadi kesalahan",
					}),
			});
		} else {
			unlock.mutate(periode, {
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `Periode ${formatPeriode(periode)} dibuka kembali untuk koreksi.`,
					});
					setConfirmAction(null);
				},
				onError: (err: Error) =>
					addToast({
						variant: "error",
						title: "Gagal",
						message:
							err instanceof ApiError ? err.message : "Terjadi kesalahan",
					}),
			});
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Penggajian</h1>
					<p className="text-sm text-gray-500">
						Gaji {periode ? formatPeriode(periode) : "—"} · dibayar tgl 5 ·
						Tahun Ajaran {activeAy.name}.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={periode}
						onChange={(e) => setPeriode(e.target.value)}
						className="block rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
					>
						{months.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
					{periode && (
						<>
							{isFinalized ? (
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setConfirmAction("unlock")}
								>
									<LockOpen className="h-4 w-4 mr-1" /> Buka Kembali
								</Button>
							) : (
								<Button
									variant="primary"
									size="sm"
									onClick={() => setConfirmAction("finalize")}
									disabled={rows.length === 0}
								>
									<Lock className="h-4 w-4 mr-1" /> Finalisasi
								</Button>
							)}
						</>
					)}
				</div>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Menghitung gaji...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal menghitung penggajian.</p>
			) : rows.length === 0 ? (
				<EmptyState
					icon={<Wallet className="h-10 w-10 text-gray-400" />}
					title="Belum ada data absensi"
					description={`Input absensi ${periode ? formatPeriode(periode) : ""} terlebih dahulu — penggajian hanya menghitung karyawan yang punya absensi.`}
				/>
			) : (
				<>
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-indigo-50 px-5 py-3">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-indigo-900">
								Total Penggajian {formatPeriode(periode)}
							</span>
							{isFinalized ? (
								<Badge variant="success">Finalized</Badge>
							) : (
								<Badge variant="warning">Preview</Badge>
							)}
							{payroll?.finalized_at && (
								<span className="text-xs text-indigo-700">
									terkunci{" "}
									{new Date(payroll.finalized_at).toLocaleString("id-ID")}
								</span>
							)}
						</div>
						<span className="text-lg font-bold text-indigo-900">
							{formatCurrency(payroll?.total_gaji ?? 0)}
						</span>
					</div>

					{!isFinalized && (
						<p className="text-xs text-gray-500">
							Status <b>Preview</b> — angka dapat berubah jika data
							absen/HR/angsuran berubah. Finalisasi untuk mengunci snapshot.
						</p>
					)}

					<div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Karyawan
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Pokok
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Hadir
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Disiplin
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Bonus
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										F
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										TT
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										PJ
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Lain
									</th>
									<th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Angs.
									</th>
									<th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Total
									</th>
									<th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Slip
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{rows.map((r) => (
									<tr key={r.employee_id} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
											{r.nama}
											<span className="ml-2 text-xs text-gray-400">
												{r.golongan_kode}
											</span>
										</td>
										<td className="px-2 py-3 text-sm text-gray-900 text-right">
											{formatCurrency(r.hr_pokok)}
										</td>
										<td className="px-2 py-3 text-sm text-gray-600 text-right">
											{formatCurrency(r.kehadiran)}
										</td>
										<td className="px-2 py-3 text-sm text-gray-600 text-right">
											{formatCurrency(r.siaga + r.piket)}
										</td>
										<td className="px-2 py-3 text-sm text-gray-600 text-right">
											{formatCurrency(r.bonus_terlambat + r.bonus_pulang_awal)}
										</td>
										<td className="px-2 py-3 text-sm text-gray-600 text-right">
											{formatCurrency(r.subtotal_f)}
										</td>
										<td className="px-2 py-3 text-sm text-gray-600 text-right">
											{formatCurrency(r.subtotal_t)}
										</td>
										<td className="px-2 py-3 text-sm text-gray-600 text-right">
											{formatCurrency(r.subtotal_p)}
										</td>
										<td className="px-2 py-3 text-sm text-gray-600 text-right">
											{formatCurrency(r.subtotal_l)}
										</td>
										<td className="px-2 py-3 text-sm text-red-600 text-right">
											{formatCurrency(r.angsuran)}
										</td>
										<td className="px-3 py-3 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
											{formatCurrency(r.total_gaji)}
										</td>
										<td className="px-3 py-3 text-right">
											<Link
												to="/sdm/penggajian/$id"
												params={{ id: String(r.employee_id) }}
												search={{ periode }}
												className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
											>
												<ChevronRight className="h-4 w-4" />
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}

			<ConfirmDialog
				open={confirmAction === "finalize"}
				title="Finalisasi Penggajian?"
				description={`Gaji ${formatPeriode(periode)} akan dihitung dan dikunci sebagai snapshot. Perubahan data setelah ini TIDAK mengubah slip periode ini.`}
				confirmLabel="Finalisasi"
				onConfirm={runAction}
				onCancel={() => setConfirmAction(null)}
			/>
			<ConfirmDialog
				open={confirmAction === "unlock"}
				title="Buka Kembali Periode?"
				description={`Snapshot ${formatPeriode(periode)} akan dihapus dan kembali ke status preview. Finalisasi ulang setelah data diperbaiki.`}
				confirmLabel="Buka Kembali"
				variant="danger"
				onConfirm={runAction}
				onCancel={() => setConfirmAction(null)}
			/>
		</div>
	);
}
