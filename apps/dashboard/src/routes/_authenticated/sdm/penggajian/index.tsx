import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertCircle,
	Copy,
	Download,
	FileText,
	Lock,
	LockOpen,
	MessageCircle,
	Send,
	UserCog,
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
	type Slip,
	useFinalizePayroll,
	useGolongans,
	useKirimWASatu,
	useKirimWASemua,
	useKirimWAStatus,
	usePenggajian,
	useShareLink,
	useUnlockPayroll,
} from "#/features/sdm/api";
import { sdmGet } from "#/features/sdm/lib/client";
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
		"finalize" | "unlock" | "kirim-semua" | null
	>(null);
	const [pdfId, setPdfId] = useState<number | null>(null);
	const [copyBusyId, setCopyBusyId] = useState<number | null>(null);
	const [waBusyId, setWaBusyId] = useState<number | null>(null);

	useEffect(() => {
		if (months.length > 0 && !months.some((m) => m.value === periode)) {
			const now = new Date();
			const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
			setPeriode(months.some((m) => m.value === cur) ? cur : months[0].value);
		}
	}, [months, periode]);

	const { data: payroll, isLoading, isError } = usePenggajian(periode);
	const { data: golongans = [] } = useGolongans();
	const finalize = useFinalizePayroll();
	const unlock = useUnlockPayroll();
	const shareLink = useShareLink();
	const kirimSatu = useKirimWASatu();
	const kirimSemua = useKirimWASemua();
	const { data: waStatuses = [] } = useKirimWAStatus(periode);
	const waByEmp = useMemo(
		() => new Map(waStatuses.map((s) => [s.employee_id, s])),
		[waStatuses],
	);

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

	const handlePdf = async (employeeId: number) => {
		setPdfId(employeeId);
		try {
			const [slip, { downloadSlipPdf }] = await Promise.all([
				sdmGet<Slip>(`/penggajian/${employeeId}`, { periode }),
				import("#/features/sdm/lib/slipPdf"),
			]);
			const golonganKeterangan =
				golongans.find((g) => g.kode === slip.golongan_kode)?.keterangan ?? "";
			downloadSlipPdf(slip, periode, { golonganKeterangan });
		} catch (err) {
			addToast({
				variant: "error",
				title: "Gagal",
				message:
					err instanceof ApiError ? err.message : "Gagal membuat slip PDF.",
			});
		} finally {
			setPdfId(null);
		}
	};

	const handleCopyLink = async (employeeId: number) => {
		setCopyBusyId(employeeId);
		try {
			const link = await shareLink.mutateAsync(employeeId);
			await navigator.clipboard.writeText(link.url);
			addToast({
				variant: "success",
				title: "Tautan disalin",
				message: `Berlaku s/d ${new Date(link.expires_at).toLocaleString("id-ID")}`,
			});
		} catch (err) {
			addToast({
				variant: "error",
				title: "Gagal",
				message:
					err instanceof ApiError ? err.message : "Gagal membuat tautan.",
			});
		} finally {
			setCopyBusyId(null);
		}
	};

	const handleKirimWA = async (employeeId: number) => {
		setWaBusyId(employeeId);
		try {
			const res = await kirimSatu.mutateAsync({ employeeId, periode });
			addToast({
				variant: res.status === "sent" ? "success" : "error",
				title: res.status === "sent" ? "Terkirim" : "Gagal",
				message: res.message,
			});
		} catch (err) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
			});
		} finally {
			setWaBusyId(null);
		}
	};

	const runAction = () => {
		if (!confirmAction || !periode) return;
		if (confirmAction === "kirim-semua") {
			kirimSemua.mutate(periode, {
				onSuccess: (res) => {
					addToast({
						variant: "success",
						title: "Dijadwalkan",
						message: `${res.enqueued} slip masuk antrian${res.skipped > 0 ? `, ${res.skipped} dilewati (tanpa data gaji / no. WA)` : ""}. Status diperbarui otomatis.`,
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
			return;
		}
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
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setConfirmAction("kirim-semua")}
								disabled={rows.length === 0}
							>
								<Send className="h-4 w-4 mr-1" /> Kirim Semua
							</Button>
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
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-14">
										No
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Nama
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Total
									</th>
									<th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
										Slip Gaji Terkirim
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Aksi
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{rows.map((r, i) => {
									const st = waByEmp.get(r.employee_id);
									return (
										<tr key={r.employee_id} className="hover:bg-gray-50">
											<td className="px-4 py-3 text-sm text-gray-400 tabular-nums">
												{i + 1}
											</td>
											<td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
												{r.nama}
												<span className="ml-2 text-xs text-gray-400">
													{r.golongan_kode}
												</span>
											</td>
											<td className="px-4 py-3 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
												{formatCurrency(r.total_gaji)}
											</td>
											<td className="px-4 py-3 text-center whitespace-nowrap">
												{st ? (
													<WaStatusBadge
														status={st.status}
														error={st.pesan_error}
													/>
												) : (
													<span className="text-xs text-gray-300">—</span>
												)}
											</td>
											<td className="px-4 py-3 text-right">
												<div className="inline-flex items-center gap-2">
													<Link
														to="/sdm/penggajian/$id"
														params={{ id: String(r.employee_id) }}
														search={{ periode }}
														className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
													>
														<FileText className="h-3.5 w-3.5 mr-1" /> Slip
													</Link>
													<button
														type="button"
														onClick={() => handlePdf(r.employee_id)}
														disabled={pdfId === r.employee_id}
														className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
													>
														<Download className="h-3.5 w-3.5 mr-1" />
														{pdfId === r.employee_id ? "..." : "PDF"}
													</button>
													<Link
														to="/sdm/penggajian/olah-hr/$id"
														params={{ id: String(r.employee_id) }}
														className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
													>
														<UserCog className="h-3.5 w-3.5 mr-1" /> Olah HR
													</Link>
													<button
														type="button"
														onClick={() => handleCopyLink(r.employee_id)}
														disabled={copyBusyId === r.employee_id}
														title="Salin tautan slip (berlaku sementara)"
														className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
													>
														<Copy className="h-3.5 w-3.5 mr-1" />
														{copyBusyId === r.employee_id ? "..." : "Link"}
													</button>
													<button
														type="button"
														onClick={() => handleKirimWA(r.employee_id)}
														disabled={waBusyId === r.employee_id}
														title="Kirim slip via WhatsApp"
														className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
													>
														<MessageCircle className="h-3.5 w-3.5 mr-1" />
														{waBusyId === r.employee_id ? "..." : "WA"}
													</button>
												</div>
											</td>
										</tr>
									);
								})}
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
			<ConfirmDialog
				open={confirmAction === "kirim-semua"}
				title="Kirim Slip ke Semua Karyawan?"
				description={`Slip ${formatPeriode(periode)} akan dikirim via WhatsApp ke seluruh karyawan aktif yang punya nomor WA. Pengiriman diproses di latar (antrian) — status muncul otomatis per baris.`}
				confirmLabel="Kirim Semua"
				onConfirm={runAction}
				onCancel={() => setConfirmAction(null)}
			/>
		</div>
	);
}

// WaStatusBadge — status pengiriman WA satu karyawan pada periode terpilih.
function WaStatusBadge({ status, error }: { status: string; error: string }) {
	if (status === "sent") return <Badge variant="success">Terkirim</Badge>;
	if (status === "failed")
		return (
			<Badge variant="danger" title={error || "Gagal terkirim"}>
				Gagal
			</Badge>
		);
	return <Badge variant="warning">Menunggu</Badge>;
}
