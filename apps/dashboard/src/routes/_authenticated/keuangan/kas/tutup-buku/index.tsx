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
import { useState } from "react";
import { useGetV1CashBalance } from "../../../../../api/endpoints/cash/cash";
import {
	useGetV1DailyClosings,
	usePatchV1DailyClosingsIdConfirm,
	usePostV1DailyClosings,
} from "../../../../../api/endpoints/daily-closings/daily-closings";
import { Alert } from "../../../../../components/atoms/Alert";
import { Badge } from "../../../../../components/atoms/Badge";
import { Button } from "../../../../../components/atoms/Button";
import { ConfirmDialog } from "../../../../../components/molecules/ConfirmDialog";
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

	const [physicalCash, setPhysicalCash] = useState<string>("");
	const [notes, setNotes] = useState("");
	const [confirmNotes, setConfirmNotes] = useState("");
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [submitError, setSubmitError] = useState("");

	const { data: closingsData, isLoading: closingsLoading } =
		useGetV1DailyClosings(
			{
				academic_year_id: activeAy?.id,
				start_date: today,
				end_date: today,
				limit: 1,
			},
			{ query: { enabled: !!activeAy?.id } },
		);

	const { data: balanceData, isLoading: balanceLoading } = useGetV1CashBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);

	const createClosing = usePostV1DailyClosings();
	const confirmClosing = usePatchV1DailyClosingsIdConfirm();

	const closings = (closingsData?.data as any)?.data || [];
	const todayClosing = closings.length > 0 ? closings[0] : null;

	const balance = (balanceData?.data as any)?.data;
	const systemBalance = Number(balance?.balance || 0);
	const todayCredit = Number(balance?.today_credit || 0);
	const todayDebit = Number(balance?.today_debit || 0);
	const openingBalance = systemBalance - todayCredit + todayDebit;

	const physicalCashNum = Number(physicalCash) || 0;
	const difference = physicalCashNum - systemBalance;
	const hasInput = physicalCash !== "" && physicalCash !== "0";

	const isLoading = closingsLoading || balanceLoading;

	const invalidateQueries = () => {
		queryClient.invalidateQueries({ queryKey: ["/v1/daily-closings"] });
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
					closing_date: today,
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
			},
		);
	};

	const handleConfirm = () => {
		if (!todayClosing?.id) return;
		confirmClosing.mutate(
			{
				id: todayClosing.id,
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

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="animate-pulse space-y-4">
					<div className="h-8 bg-gray-200 rounded w-1/3" />
					<div className="h-4 bg-gray-200 rounded w-1/2" />
					<div className="h-48 bg-gray-200 rounded" />
				</div>
			</div>
		);
	}

	const isConfirmed = todayClosing?.is_confirmed === true;
	const isPending = todayClosing && !isConfirmed;

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
						<p className="mt-1 text-sm text-gray-500">{formatDate(today)}</p>
					</div>
				</div>
			</div>

			{/* State A: No closing for today */}
			{!todayClosing && (
				<>
					{/* Transaction summary */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
							Ringkasan Transaksi Hari Ini
						</h3>
						<div className="space-y-3">
							<div className="flex justify-between items-center py-2">
								<span className="text-sm text-gray-600">Saldo Kas Awal</span>
								<span className="text-sm font-semibold text-gray-900">
									{formatCurrency(openingBalance)}
								</span>
							</div>
							<div className="flex justify-between items-center py-2">
								<span className="text-sm text-green-600">
									+ Pemasukan Hari Ini
								</span>
								<span className="text-sm font-semibold text-green-600">
									{formatCurrency(todayCredit)}
								</span>
							</div>
							<div className="flex justify-between items-center py-2">
								<span className="text-sm text-red-600">
									- Pengeluaran Hari Ini
								</span>
								<span className="text-sm font-semibold text-red-600">
									{formatCurrency(todayDebit)}
								</span>
							</div>
							<div className="border-t border-gray-200 pt-3 flex justify-between items-center">
								<span className="text-sm font-semibold text-gray-900">
									= Saldo Kas Sistem
								</span>
								<span className="text-base font-bold text-gray-900">
									{formatCurrency(systemBalance)}
								</span>
							</div>
						</div>
					</div>

					{/* Physical cash input */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
							Hitung Kas Fisik
						</h3>
						<div className="max-w-md">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Jumlah Kas Fisik (Rp)
							</label>
							<div className="relative rounded-md shadow-sm">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<span className="text-gray-500 sm:text-sm">Rp</span>
								</div>
								<input
									type="number"
									min="0"
									className="block w-full rounded-md border-0 py-2.5 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
									placeholder="0"
									value={physicalCash}
									onChange={(e) => setPhysicalCash(e.target.value)}
								/>
							</div>
						</div>

						{/* Preview difference */}
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
											{formatCurrency(systemBalance)}
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

						{/* Notes */}
						{hasInput && (
							<div className="mt-4 max-w-md">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Keterangan{" "}
									{difference !== 0 && <span className="text-red-500">*</span>}
								</label>
								<textarea
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
									Setelah dikonfirmasi, seluruh transaksi hari ini tidak dapat
									diedit atau dihapus.
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

			{/* State B: Pending confirmation */}
			{isPending && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
					<div className="flex items-center gap-3 mb-6">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
							<Clock className="w-5 h-5 text-amber-600" />
						</div>
						<div>
							<Badge variant="warning">Menunggu Konfirmasi</Badge>
							<p className="text-xs text-gray-500 mt-1">
								Dibuat oleh {todayClosing.closed_by?.full_name || "-"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
						<div className="bg-gray-50 rounded-lg p-4">
							<p className="text-xs text-gray-500 mb-1">Kas Fisik</p>
							<p className="text-lg font-bold text-gray-900">
								{formatCurrency(Number(todayClosing.physical_cash_amount))}
							</p>
						</div>
						<div className="bg-gray-50 rounded-lg p-4">
							<p className="text-xs text-gray-500 mb-1">Kas Sistem</p>
							<p className="text-lg font-bold text-gray-900">
								{formatCurrency(Number(todayClosing.system_cash_amount))}
							</p>
						</div>
						<div className="bg-gray-50 rounded-lg p-4">
							<p className="text-xs text-gray-500 mb-1">Selisih</p>
							<p
								className={`text-lg font-bold ${Number(todayClosing.difference) === 0 ? "text-green-600" : "text-amber-600"}`}
							>
								{formatCurrency(Number(todayClosing.difference))}
							</p>
						</div>
					</div>

					{todayClosing.notes && (
						<div className="mb-6">
							<p className="text-xs text-gray-500 mb-1">Keterangan</p>
							<p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
								{todayClosing.notes}
							</p>
						</div>
					)}

					<Alert variant="warning">
						Setelah dikonfirmasi, seluruh transaksi tanggal{" "}
						{formatDate(todayClosing.closing_date)} akan dikunci permanen.
					</Alert>

					<div className="mt-6">
						<Button onClick={() => setShowConfirmDialog(true)}>
							Konfirmasi Tutup Buku
						</Button>
					</div>
				</div>
			)}

			{/* State C: Confirmed */}
			{isConfirmed && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
					<div className="flex items-center gap-3 mb-6">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
							<Lock className="w-5 h-5 text-green-600" />
						</div>
						<div>
							<Badge variant="success">Dikonfirmasi & Terkunci</Badge>
							<p className="text-xs text-gray-500 mt-1">
								Dikonfirmasi oleh {todayClosing.closed_by?.full_name || "-"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
						<div className="bg-gray-50 rounded-lg p-4">
							<p className="text-xs text-gray-500 mb-1">Kas Fisik</p>
							<p className="text-lg font-bold text-gray-900">
								{formatCurrency(Number(todayClosing.physical_cash_amount))}
							</p>
						</div>
						<div className="bg-gray-50 rounded-lg p-4">
							<p className="text-xs text-gray-500 mb-1">Kas Sistem</p>
							<p className="text-lg font-bold text-gray-900">
								{formatCurrency(Number(todayClosing.system_cash_amount))}
							</p>
						</div>
						<div className="bg-gray-50 rounded-lg p-4">
							<p className="text-xs text-gray-500 mb-1">Selisih</p>
							<p
								className={`text-lg font-bold ${Number(todayClosing.difference) === 0 ? "text-green-600" : "text-amber-600"}`}
							>
								{formatCurrency(Number(todayClosing.difference))}
							</p>
						</div>
					</div>

					{todayClosing.notes && (
						<div className="mb-6">
							<p className="text-xs text-gray-500 mb-1">Keterangan</p>
							<p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
								{todayClosing.notes}
							</p>
						</div>
					)}

					<div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
						<Lock className="w-4 h-4 shrink-0" />
						<span>
							Seluruh transaksi tanggal {formatDate(todayClosing.closing_date)}{" "}
							telah dikunci dan tidak dapat diubah.
						</span>
					</div>

					<div className="mt-6 flex flex-wrap gap-3">
						<Link to="/keuangan/laporan/harian">
							<Button variant="secondary">
								Lihat Laporan Harian
								<ArrowRight className="w-4 h-4 ml-1.5" />
							</Button>
						</Link>
					</div>
				</div>
			)}

			{/* History link */}
			<div className="flex justify-end">
				<Link
					to="/keuangan/kas/tutup-buku/riwayat"
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
						<strong>{formatDate(today)}</strong> akan dikunci permanen dan tidak
						dapat diubah atau dihapus.
					</p>
					<p className="font-medium text-red-600">
						Tindakan ini tidak dapat dibatalkan.
					</p>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Catatan Konfirmasi (Opsional)
						</label>
						<textarea
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
