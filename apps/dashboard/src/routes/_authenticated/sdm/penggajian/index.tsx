import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertCircle,
	CheckCheck,
	Copy,
	Download,
	FileText,
	Lock,
	LockOpen,
	MessageCircle,
	MoreHorizontal,
	RotateCcw,
	RotateCw,
	Send,
	UserCog,
	Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
	useAbsen,
	useFinalizePayroll,
	useGolongans,
	useKirimWASatu,
	useKirimWASemua,
	useKirimWAStatus,
	useKirimWATandaiSemuaTerkirim,
	useKirimWATandaiTerkirim,
	useKirimWAUlangGagal,
	usePayrollStatus,
	usePenggajian,
	useShareLink,
	useUnlockPayroll,
} from "#/features/sdm/api";
import { sdmGet } from "#/features/sdm/lib/client";
import {
	defaultPayDate,
	formatTanggalBayar,
	resolveDefaultPeriode,
} from "#/features/sdm/lib/periode";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/penggajian/")({
	component: PenggajianPage,
	validateSearch: (search: Record<string, unknown>): { periode?: string } => {
		const v = search.periode;
		return typeof v === "string" && v !== "" ? { periode: v } : {};
	},
});

function PenggajianPage() {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);
	const months = useMemo(
		() => (activeAy ? monthsInAcademicYear(activeAy) : []),
		[activeAy],
	);
	const { periode: periodeParam } = Route.useSearch();
	const navigate = useNavigate();
	const setPeriode = (value: string) =>
		navigate({
			to: "/sdm/penggajian",
			search: { periode: value },
			replace: true,
		});
	const [confirmAction, setConfirmAction] = useState<
		| "finalize"
		| "unlock"
		| "kirim-semua"
		| "kirim-ulang-gagal"
		| "tandai-semua-terkirim"
		| null
	>(null);
	const [tanggalBayar, setTanggalBayar] = useState("");
	const [pdfId, setPdfId] = useState<number | null>(null);
	const [copyBusyId, setCopyBusyId] = useState<number | null>(null);
	const [waBusyId, setWaBusyId] = useState<number | null>(null);
	const [markBusyId, setMarkBusyId] = useState<number | null>(null);

	// "Hari ini" distabilkan per mount agar default tidak berubah saat render.
	const today = useMemo(() => new Date(), []);
	const calendarPrevMonth = useMemo(() => {
		const curKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
		const idx = months.findIndex((m) => m.value === curKey);
		return idx > 0 ? months[idx - 1].value : "";
	}, [months, today]);
	const { data: calendarPrevStatus } = usePayrollStatus(calendarPrevMonth);
	const { data: calendarPrevRows = [] } = useAbsen(calendarPrevMonth);

	// periode efektif: dari URL bila valid; selebihnya default cerdas (tutup buku
	// bulan sebelumnya tgl 1–5 / buku tertunda), selainnya bulan berjalan.
	const periode = useMemo(() => {
		if (periodeParam && months.some((m) => m.value === periodeParam)) {
			return periodeParam;
		}
		return resolveDefaultPeriode(months, today, {
			prevStatus: calendarPrevStatus?.status,
			prevHasAbsen: calendarPrevRows.length > 0,
		});
	}, [periodeParam, months, today, calendarPrevStatus, calendarPrevRows]);

	// Selaraskan URL dengan periode efektif → tetap saat refresh / pindah halaman.
	useEffect(() => {
		if (periode && periode !== periodeParam) {
			navigate({
				to: "/sdm/penggajian",
				search: { periode },
				replace: true,
			});
		}
	}, [periode, periodeParam, navigate]);

	const { data: payroll, isLoading, isError } = usePenggajian(periode);
	const { data: golongans = [] } = useGolongans();
	const finalize = useFinalizePayroll();
	const unlock = useUnlockPayroll();
	const shareLink = useShareLink();
	const kirimSatu = useKirimWASatu();
	const kirimSemua = useKirimWASemua();
	const kirimUlangGagal = useKirimWAUlangGagal();
	const tandaiTerkirim = useKirimWATandaiTerkirim();
	const tandaiSemuaTerkirim = useKirimWATandaiSemuaTerkirim();
	const {
		data: waStatuses = [],
		refetch: refetchWaStatus,
		isFetching: waStatusFetching,
		dataUpdatedAt: waStatusUpdatedAt,
	} = useKirimWAStatus(periode);
	const waByEmp = useMemo(
		() => new Map(waStatuses.map((s) => [s.employee_id, s])),
		[waStatuses],
	);
	// Tombol "Kirim Ulang yang Gagal" hanya relevan bila ada baris gagal.
	const failedCount = useMemo(
		() => waStatuses.filter((s) => s.status === "failed").length,
		[waStatuses],
	);
	// Baris "belum pasti" (timeout) bisa dikoreksi manual dari dashboard Wablas.
	const unknownCount = useMemo(
		() => waStatuses.filter((s) => s.status === "unknown").length,
		[waStatuses],
	);
	const belumTerkirimCount = failedCount + unknownCount;

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

	const handleTandaiTerkirim = async (employeeId: number) => {
		setMarkBusyId(employeeId);
		try {
			const res = await tandaiTerkirim.mutateAsync({ employeeId, periode });
			addToast({
				variant: "success",
				title: res.updated > 0 ? "Ditandai terkirim" : "Tidak ada perubahan",
				message:
					res.updated > 0
						? "Status slip diperbarui menjadi terkirim."
						: "Baris ini sudah berstatus terkirim.",
			});
		} catch (err) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
			});
		} finally {
			setMarkBusyId(null);
		}
	};

	const runAction = () => {
		if (!confirmAction || !periode) return;
		if (confirmAction === "tandai-semua-terkirim") {
			tandaiSemuaTerkirim.mutate(periode, {
				onSuccess: (res) => {
					addToast({
						variant: "success",
						title: "Status diperbarui",
						message: `${res.updated} slip ditandai terkirim.`,
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
		if (
			confirmAction === "kirim-semua" ||
			confirmAction === "kirim-ulang-gagal"
		) {
			const mutation =
				confirmAction === "kirim-semua" ? kirimSemua : kirimUlangGagal;
			mutation.mutate(periode, {
				onSuccess: (res) => {
					const notes = [
						res.skipped > 0
							? `${res.skipped} dilewati (tanpa data gaji / no. WA)`
							: "",
						res.already_sent > 0
							? `${res.already_sent} sudah terkirim (tidak dikirim ulang)`
							: "",
						res.processing > 0 ? `${res.processing} sedang diproses` : "",
					].filter(Boolean);
					addToast({
						variant: "success",
						title:
							confirmAction === "kirim-semua"
								? "Dijadwalkan"
								: "Dijadwalkan Ulang",
						message: `${res.enqueued} slip masuk antrian${notes.length > 0 ? `; ${notes.join("; ")}` : ""}. Status diperbarui otomatis.`,
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
			finalize.mutate(
				{ periode, tanggal_bayar: tanggalBayar },
				{
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
				},
			);
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
						Gaji {periode ? formatPeriode(periode) : "—"} ·{" "}
						{payroll?.tanggal_bayar
							? `${isFinalized ? "dibayar" : "rencana dibayar"} ${formatTanggalBayar(payroll.tanggal_bayar)}`
							: "dibayar paling lambat tgl 5"}{" "}
						· Tahun Ajaran {activeAy.name}.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
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
							{failedCount > 0 && (
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setConfirmAction("kirim-ulang-gagal")}
									className="ring-red-300 text-red-700 hover:bg-red-50"
								>
									<RotateCcw className="h-4 w-4 mr-1" /> Kirim Ulang Gagal (
									{failedCount})
								</Button>
							)}
							{belumTerkirimCount > 0 && (
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setConfirmAction("tandai-semua-terkirim")}
									className="ring-green-300 text-green-700 hover:bg-green-50"
								>
									<CheckCheck className="h-4 w-4 mr-1" /> Tandai Semua Terkirim
									({belumTerkirimCount})
								</Button>
							)}
							{waStatusUpdatedAt > 0 && (
								<span className="text-xs text-gray-500">
									Status WA{" "}
									{new Date(waStatusUpdatedAt).toLocaleTimeString("id-ID")}
								</span>
							)}
							<Button
								variant="secondary"
								size="sm"
								onClick={() => void refetchWaStatus()}
								disabled={waStatusFetching}
								title="Muat ulang status pengiriman dari server"
							>
								<RotateCw
									className={`h-4 w-4 mr-1 ${waStatusFetching ? "animate-spin" : ""}`}
								/>
								Muat Ulang
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
									onClick={() => {
										setTanggalBayar(
											payroll?.tanggal_bayar ?? defaultPayDate(periode),
										);
										setConfirmAction("finalize");
									}}
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
											<td className="px-4 py-3 text-right whitespace-nowrap">
												<RowActionsMenu label={`Aksi untuk ${r.nama}`}>
													<Link
														to="/sdm/penggajian/$id"
														params={{ id: String(r.employee_id) }}
														search={{ periode }}
														className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
													>
														<FileText className="h-4 w-4 text-gray-400" /> Slip
													</Link>
													<button
														type="button"
														onClick={() => handlePdf(r.employee_id)}
														disabled={pdfId === r.employee_id}
														className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
													>
														<Download className="h-4 w-4 text-gray-400" />
														{pdfId === r.employee_id
															? "Menyiapkan PDF..."
															: "Unduh PDF"}
													</button>
													<Link
														to="/sdm/penggajian/olah-hr/$id"
														params={{ id: String(r.employee_id) }}
														search={{ periode }}
														className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
													>
														<UserCog className="h-4 w-4 text-gray-400" /> Olah
														HR
													</Link>
													<button
														type="button"
														onClick={() => handleCopyLink(r.employee_id)}
														disabled={copyBusyId === r.employee_id}
														className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
													>
														<Copy className="h-4 w-4 text-gray-400" /> Salin
														tautan slip
													</button>
													<button
														type="button"
														onClick={() => handleKirimWA(r.employee_id)}
														disabled={waBusyId === r.employee_id}
														className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
													>
														<MessageCircle className="h-4 w-4 text-gray-400" />{" "}
														Kirim via WA
													</button>
													{st &&
														(st.status === "failed" ||
															st.status === "unknown") && (
															<button
																type="button"
																onClick={() =>
																	handleTandaiTerkirim(r.employee_id)
																}
																disabled={markBusyId === r.employee_id}
																className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
																title="Tandai terkirim setelah dicek di dashboard Wablas"
															>
																<CheckCheck className="h-4 w-4 text-gray-400" />{" "}
																Tandai terkirim
															</button>
														)}
												</RowActionsMenu>
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
			>
				<div className="mt-3 text-left">
					<label
						htmlFor="tanggal-bayar"
						className="block text-sm font-medium text-gray-700"
					>
						Tanggal bayar aktual
					</label>
					<input
						id="tanggal-bayar"
						type="date"
						value={tanggalBayar}
						onChange={(e) => setTanggalBayar(e.target.value)}
						className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
					/>
					<p className="mt-1 text-xs text-gray-500">
						Default tgl 5 bulan berikutnya. Ubah bila transfer maju ke tgl 3/4.
					</p>
				</div>
			</ConfirmDialog>
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
				description={`Slip ${formatPeriode(periode)} akan dikirim via WhatsApp ke seluruh karyawan aktif yang punya nomor WA. Karyawan yang sudah terkirim TIDAK dikirim ulang. Pengiriman diproses di latar (antrian) — status muncul otomatis per baris.`}
				confirmLabel="Kirim Semua"
				onConfirm={runAction}
				onCancel={() => setConfirmAction(null)}
			/>
			<ConfirmDialog
				open={confirmAction === "kirim-ulang-gagal"}
				title="Kirim Ulang Slip yang Gagal?"
				description={`${failedCount} slip ${formatPeriode(periode)} yang sebelumnya GAGAL akan diantrekan ulang. Slip yang sudah terkirim tidak disentuh, jadi tidak ada pesan dobel.`}
				confirmLabel="Kirim Ulang"
				onConfirm={runAction}
				onCancel={() => setConfirmAction(null)}
			/>
			<ConfirmDialog
				open={confirmAction === "tandai-semua-terkirim"}
				title="Tandai Semua Sudah Terkirim?"
				description={`${belumTerkirimCount} slip ${formatPeriode(periode)} berstatus gagal/belum pasti akan ditandai TERKIRIM tanpa mengirim WhatsApp lagi. Lakukan hanya setelah Anda memastikan nomor-nomor itu sudah menerima slip di dashboard Wablas.`}
				confirmLabel="Tandai Terkirim"
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
	// Timeout/koneksi putus: pesan bisa saja sudah diterima Wablas. Status akan
	// dikoreksi otomatis oleh webhook tracking — jangan kirim ulang otomatis.
	if (status === "unknown")
		return (
			<Badge variant="info" title={error || "Menunggu konfirmasi Wablas"}>
				Belum pasti
			</Badge>
		);
	return <Badge variant="warning">Menunggu</Badge>;
}

// Lebar menu aksi (sesuai `w-44` = 11rem = 176px).
const MENU_WIDTH = 176;

// RowActionsMenu — menu dropdown untuk kolom Aksi. Di-render lewat portal
// dengan posisi `fixed` agar tidak terpotong oleh pembungkus tabel yang
// `overflow-x-auto` (yang juga memberlakukan overflow vertikal).
function RowActionsMenu({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	const btnRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [coords, setCoords] = useState<{ top: number; left: number } | null>(
		null,
	);

	const toggle = () => {
		if (open) {
			setOpen(false);
			return;
		}
		const r = btnRef.current?.getBoundingClientRect();
		if (!r) return;
		const left = Math.max(
			8,
			Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
		);
		// Buka ke atas bila ruang di bawah tidak cukup (mis. baris terakhir).
		const top =
			window.innerHeight - r.bottom < 280
				? Math.max(8, r.top - 280)
				: r.bottom + 4;
		setCoords({ top, left });
		setOpen(true);
	};

	useEffect(() => {
		if (!open) return;
		const close = () => setOpen(false);
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		const onDown = (e: MouseEvent) => {
			const t = e.target as Node;
			if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
			setOpen(false);
		};
		// Tutup saat halaman/area lain di-scroll atau ukuran berubah.
		window.addEventListener("scroll", close, true);
		window.addEventListener("resize", close);
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("scroll", close, true);
			window.removeEventListener("resize", close);
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<div className="inline-block text-right">
			<button
				ref={btnRef}
				type="button"
				aria-haspopup="true"
				aria-expanded={open}
				aria-label={label}
				onClick={toggle}
				className="inline-flex items-center rounded-md border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
			>
				<MoreHorizontal className="h-4 w-4" />
			</button>
			{open &&
				coords &&
				createPortal(
					<div
						ref={menuRef}
						style={{
							position: "fixed",
							top: coords.top,
							left: coords.left,
							width: MENU_WIDTH,
						}}
						className="z-50 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
					>
						{/* Klik item mana pun menutup menu. */}
						<div onClick={() => setOpen(false)}>{children}</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
