import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertTriangle,
	ArrowRight,
	BookCheck,
	CheckCircle2,
	ChevronRight,
	Clock,
	Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useGetDailyClosingPreview } from "#/api/custom/daily-closing-preview";
import {
	useGetV1DailyClosings,
	usePatchV1DailyClosingsIdConfirm,
	usePostV1DailyClosings,
} from "#/api/endpoints/daily-closings/daily-closings";
import { Alert, Badge, Button, ConfirmDialog } from "#/components/ui";
import { academicYearAtom } from "../../../../../store/global";
import { formatCurrency, formatDate } from "../../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/keuangan/kas/tutup-buku/",
)({
	component: TutupBukuPage,
});

function getTodayString() {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function TutupBukuPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const today = getTodayString();

	// Tanggal tutup buku dapat dipilih (default hari ini, tidak boleh masa depan).
	const [selectedDate, setSelectedDate] = useState<string>(today);
	const [physicalCash, setPhysicalCash] = useState<string>("");
	const [notes, setNotes] = useState("");
	const [confirmNotes, setConfirmNotes] = useState("");
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [submitError, setSubmitError] = useState("");

	// Reset input saat pindah tanggal.
	useEffect(() => {
		setPhysicalCash("");
		setNotes("");
		setSubmitError("");
	}, [selectedDate]);

	const { data: closingsData, isLoading: closingsLoading } =
		useGetV1DailyClosings(
			{
				academic_year_id: activeAy?.id,
				start_date: selectedDate,
				end_date: selectedDate,
				limit: 1,
			},
			{ query: { enabled: !!activeAy?.id && !!selectedDate } },
		);

	const closings = (closingsData?.data as any)?.data || [];
	const dateClosing = closings.length > 0 ? closings[0] : null;

	// Pratinjau kas sistem terkoreksi untuk tanggal terpilih (tanpa menyimpan).
	const { data: preview, isLoading: previewLoading } =
		useGetDailyClosingPreview(
			activeAy?.id,
			selectedDate,
			!!activeAy?.id && !!selectedDate && !dateClosing,
		);

	const createClosing = usePostV1DailyClosings();
	const confirmClosing = usePatchV1DailyClosingsIdConfirm();

	const openingBalance = Number(preview?.opening_balance || 0);
	const dayCashIn = Number(preview?.day_cash_in || 0);
	const dayCashOut = Number(preview?.day_cash_out || 0);
	const ledgerCash = Number(preview?.ledger_cash_amount || 0);
	const workaroundAdj = Number(preview?.workaround_adjustment || 0);
	const systemCash = Number(preview?.system_cash_amount || 0);

	const physicalCashNum = Number(physicalCash) || 0;
	const difference = physicalCashNum - systemCash;
	const hasInput = physicalCash !== "" && physicalCash !== "0";

	const isLoading = closingsLoading;

	const invalidateQueries = () => {
		queryClient.invalidateQueries({ queryKey: ["/v1/daily-closings"] });
		queryClient.invalidateQueries({
			queryKey: ["/v1/daily-closings/preview"],
		});
		queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
	};

	const handleSubmit = () => {
		if (!activeAy?.id) return;
		if (!hasInput) return;
		if (difference !== 0 && !notes.trim()) {
			setSubmitError(
				"Keterangan wajib diisi jika terdapat selisih antara kas fisik dan kas sistem.",
			);
			return;
		}

		setSubmitError("");
		createClosing.mutate(
			{
				data: {
					academic_year_id: activeAy.id,
					closing_date: selectedDate,
					physical_cash_amount: physicalCashNum,
					notes: notes.trim() || undefined,
				},
			},
			{
				onSuccess: () => {
					invalidateQueries();
					setPhysicalCash("");
					setNotes("");
				},
				onError: (err: any) => {
					setSubmitError(err?.message || "Gagal menyimpan tutup buku.");
				},
			},
		);
	};

	const handleConfirm = () => {
		if (!dateClosing?.id) return;
		confirmClosing.mutate(
			{
				id: dateClosing.id,
				data: { notes: confirmNotes.trim() || undefined },
			},
			{
				onSuccess: () => {
					invalidateQueries();
					setShowConfirmDialog(false);
					setConfirmNotes("");
				},
			},
		);
	};

	const isConfirmed = dateClosing?.is_confirmed === true;
	const isPending = dateClosing && !isConfirmed;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<nav className="flex items-center text-sm text-gray-500 mb-2">
					<Link
						to="/keuangan/kas"
						className="hover:text-indigo-600 transition-colors"
					>
						Kas & Berangkas
					</Link>
					<ChevronRight className="w-4 h-4 mx-1" />
					<span className="text-gray-900 font-medium">Tutup Buku</span>
				</nav>
				<div className="sm:flex sm:items-center sm:justify-between">
					<div>
						<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight flex items-center">
							<BookCheck className="w-6 h-6 mr-2 text-gray-400" />
							Tutup Buku Harian
						</h2>
						<p className="mt-1 text-sm text-gray-500">
							Pilih tanggal untuk melihat kas sistem, lalu cocokkan dengan kas
							fisik.
						</p>
					</div>
				</div>
			</div>

			{/* Pemilih tanggal */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
				<label
					htmlFor="closing-date"
					className="block text-sm font-medium text-gray-700 mb-1"
				>
					Tanggal Tutup Buku
				</label>
				<input
					id="closing-date"
					type="date"
					max={today}
					value={selectedDate}
					onChange={(e) => setSelectedDate(e.target.value)}
					className="block w-full max-w-xs rounded-md border-0 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
				/>
				<p className="mt-2 text-xs text-gray-500">{formatDate(selectedDate)}</p>
			</div>

			{isLoading && (
				<div className="animate-pulse space-y-4">
					<div className="h-48 bg-gray-200 rounded" />
				</div>
			)}

			{/* State A: Belum ada tutup buku untuk tanggal terpilih */}
			{!isLoading && !dateClosing && (
				<>
					{/* Dekomposisi kas sistem (dari preview) */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
							Kas Sistem per {formatDate(selectedDate)}
						</h3>
						{previewLoading ? (
							<div className="animate-pulse h-24 bg-gray-100 rounded" />
						) : (
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-gray-600">
										Saldo Kas Awal (s/d H-1)
									</span>
									<span className="text-sm font-semibold text-gray-900">
										{formatCurrency(openingBalance)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-green-600">
										+ Uang Masuk (tanggal ini)
									</span>
									<span className="text-sm font-semibold text-green-600">
										{formatCurrency(dayCashIn)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-red-600">
										− Uang Keluar (tanggal ini)
									</span>
									<span className="text-sm font-semibold text-red-600">
										{formatCurrency(dayCashOut)}
									</span>
								</div>
								<div className="border-t border-gray-200 pt-3 flex justify-between items-center">
									<span className="text-sm text-gray-600">
										= Saldo Kas Ledger (mentah)
									</span>
									<span className="text-sm font-semibold text-gray-900">
										{formatCurrency(ledgerCash)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-amber-700">
										− Koreksi "tarik lalu bayar tunai"
									</span>
									<span className="text-sm font-semibold text-amber-700">
										{formatCurrency(workaroundAdj)}
									</span>
								</div>
								<div className="border-t border-gray-200 pt-3 flex justify-between items-center">
									<span className="text-sm font-semibold text-gray-900">
										= Kas Sistem (perkiraan tunai fisik)
									</span>
									<span className="text-base font-bold text-gray-900">
										{formatCurrency(systemCash)}
									</span>
								</div>
								{workaroundAdj > 0 && (
									<p className="text-xs text-gray-500">
										Koreksi = penarikan tabungan yang dipakai membayar tunai
										(uang tabungan, bukan uang tunai baru).
									</p>
								)}
							</div>
						)}
					</div>

					{/* Input kas fisik */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
							Hitung Kas Fisik
						</h3>
						<div className="max-w-md">
							<label
								htmlFor="physical-cash"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Jumlah Kas Fisik (Rp)
							</label>
							<div className="relative rounded-md shadow-sm">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<span className="text-gray-500 sm:text-sm">Rp</span>
								</div>
								<input
									id="physical-cash"
									type="number"
									min="0"
									className="block w-full rounded-md border-0 py-2.5 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
									placeholder="0"
									value={physicalCash}
									onChange={(e) => setPhysicalCash(e.target.value)}
								/>
							</div>
						</div>

						{/* Preview selisih */}
						{hasInput && (
							<div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
								<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
									Preview Selisih
								</h4>
								<div className="grid grid-cols-3 gap-4 text-center">
									<div>
										<p className="text-xs text-gray-500 mb-1">Kas Fisik</p>
										<p className="text-sm font-bold text-gray-900">
											{formatCurrency(physicalCashNum)}
										</p>
									</div>
									<div>
										<p className="text-xs text-gray-500 mb-1">Kas Sistem</p>
										<p className="text-sm font-bold text-gray-900">
											{formatCurrency(systemCash)}
										</p>
									</div>
									<div>
										<p className="text-xs text-gray-500 mb-1">Selisih</p>
										<div className="flex items-center justify-center gap-1">
											{difference === 0 ? (
												<>
													<CheckCircle2 className="w-4 h-4 text-green-500" />
													<p className="text-sm font-bold text-green-600">
														{formatCurrency(0)}
													</p>
												</>
											) : (
												<>
													<AlertTriangle className="w-4 h-4 text-amber-500" />
													<p className="text-sm font-bold text-amber-600">
														{formatCurrency(difference)}
													</p>
												</>
											)}
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Keterangan */}
						{hasInput && (
							<div className="mt-4 max-w-md">
								<label
									htmlFor="closing-notes"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Keterangan{" "}
									{difference !== 0 && <span className="text-red-500">*</span>}
								</label>
								<textarea
									id="closing-notes"
									rows={3}
									className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
									placeholder={
										difference !== 0
											? "Wajib diisi karena terdapat selisih..."
											: "Opsional..."
									}
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
								/>
							</div>
						)}

						{submitError && (
							<div className="mt-4 max-w-md">
								<Alert variant="error">{submitError}</Alert>
							</div>
						)}

						{hasInput && (
							<div className="mt-4">
								<Alert variant="warning">
									Setelah dikonfirmasi, seluruh transaksi tanggal ini tidak
									dapat diedit atau dihapus.
								</Alert>
							</div>
						)}

						<div className="mt-6 flex items-center gap-4">
							<Button
								onClick={handleSubmit}
								disabled={!hasInput || createClosing.isPending || !activeAy?.id}
							>
								{createClosing.isPending ? "Menyimpan..." : "Simpan Tutup Buku"}
							</Button>
						</div>
					</div>
				</>
			)}

			{/* State B: Menunggu konfirmasi */}
			{!isLoading && isPending && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
					<div className="flex items-center gap-3 mb-6">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
							<Clock className="w-5 h-5 text-amber-600" />
						</div>
						<div>
							<Badge variant="warning">Menunggu Konfirmasi</Badge>
							<p className="text-xs text-gray-500 mt-1">
								Dibuat oleh {dateClosing.closed_by?.full_name || "-"}
							</p>
						</div>
					</div>

					<ClosingBreakdown dc={dateClosing} />

					{dateClosing.notes && (
						<div className="mb-6">
							<p className="text-xs text-gray-500 mb-1">Keterangan</p>
							<p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
								{dateClosing.notes}
							</p>
						</div>
					)}

					<Alert variant="warning">
						Setelah dikonfirmasi, seluruh transaksi tanggal{" "}
						{formatDate(dateClosing.closing_date)} akan dikunci permanen.
					</Alert>

					<div className="mt-6">
						<Button onClick={() => setShowConfirmDialog(true)}>
							Konfirmasi Tutup Buku
						</Button>
					</div>
				</div>
			)}

			{/* State C: Terkonfirmasi */}
			{!isLoading && isConfirmed && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
					<div className="flex items-center gap-3 mb-6">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
							<Lock className="w-5 h-5 text-green-600" />
						</div>
						<div>
							<Badge variant="success">Dikonfirmasi & Terkunci</Badge>
							<p className="text-xs text-gray-500 mt-1">
								Dikonfirmasi oleh {dateClosing.closed_by?.full_name || "-"}
							</p>
						</div>
					</div>

					<ClosingBreakdown dc={dateClosing} />

					{dateClosing.notes && (
						<div className="mb-6">
							<p className="text-xs text-gray-500 mb-1">Keterangan</p>
							<p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
								{dateClosing.notes}
							</p>
						</div>
					)}

					<div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
						<Lock className="w-4 h-4 shrink-0" />
						<span>
							Seluruh transaksi tanggal {formatDate(dateClosing.closing_date)}{" "}
							telah dikunci dan tidak dapat diubah.
						</span>
					</div>

					<div className="mt-6 flex flex-wrap gap-3">
						<Link to="/keuangan/laporan/saldo">
							<Button variant="secondary">
								Lihat Laporan Saldo
								<ArrowRight className="w-4 h-4 ml-1.5" />
							</Button>
						</Link>
					</div>
				</div>
			)}

			{/* Links */}
			<div className="flex flex-wrap justify-end gap-4">
				<Link
					to="/keuangan/kas/audit-harian"
					className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
				>
					Audit Kas Harian (rincian transaksi)
					<ArrowRight className="w-4 h-4 ml-1" />
				</Link>
				<Link
					to="/keuangan/kas/tutup-buku/riwayat"
					search={{} as any}
					className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
				>
					Lihat Riwayat Tutup Buku
					<ArrowRight className="w-4 h-4 ml-1" />
				</Link>
			</div>

			{/* Confirm Dialog */}
			<ConfirmDialog
				open={showConfirmDialog}
				title="Konfirmasi Tutup Buku"
				variant="danger"
				confirmLabel="Ya, Konfirmasi & Kunci"
				cancelLabel="Batal"
				onConfirm={handleConfirm}
				onCancel={() => {
					setShowConfirmDialog(false);
					setConfirmNotes("");
				}}
			>
				<div className="space-y-3">
					<p>
						Setelah dikonfirmasi, seluruh transaksi tanggal{" "}
						<strong>{formatDate(selectedDate)}</strong> akan dikunci permanen
						dan tidak dapat diubah atau dihapus.
					</p>
					<p className="font-medium text-red-600">
						Tindakan ini tidak dapat dibatalkan.
					</p>
					<div>
						<label
							htmlFor="confirm-notes"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Catatan Konfirmasi (Opsional)
						</label>
						<textarea
							id="confirm-notes"
							rows={2}
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Tambahkan catatan..."
							value={confirmNotes}
							onChange={(e) => setConfirmNotes(e.target.value)}
						/>
					</div>
				</div>
			</ConfirmDialog>
		</div>
	);
}

/** Rincian kas fisik/sistem + dekomposisi ledger/koreksi untuk closing tersimpan. */
function ClosingBreakdown({ dc }: { dc: any }) {
	const ledger = Number(dc.ledger_cash_amount || 0);
	const workaround = Number(dc.workaround_adjustment || 0);
	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
				<div className="bg-gray-50 rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Kas Fisik</p>
					<p className="text-lg font-bold text-gray-900">
						{formatCurrency(Number(dc.physical_cash_amount))}
					</p>
				</div>
				<div className="bg-gray-50 rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Kas Sistem</p>
					<p className="text-lg font-bold text-gray-900">
						{formatCurrency(Number(dc.system_cash_amount))}
					</p>
				</div>
				<div className="bg-gray-50 rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Selisih</p>
					<p
						className={`text-lg font-bold ${Number(dc.difference) === 0 ? "text-green-600" : "text-amber-600"}`}
					>
						{formatCurrency(Number(dc.difference))}
					</p>
				</div>
			</div>
			{(ledger > 0 || workaround > 0) && (
				<div className="mb-6 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
					Kas Sistem = Ledger {formatCurrency(ledger)} − Koreksi
					tarik-lalu-bayar {formatCurrency(workaround)}.
				</div>
			)}
		</>
	);
}
