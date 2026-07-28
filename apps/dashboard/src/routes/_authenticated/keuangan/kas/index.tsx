import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertTriangle,
	ArrowDownRight,
	ArrowRight,
	ArrowUpRight,
	BookOpen,
	CheckCircle2,
	Clock,
	Send,
	Vault,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import {
	getGetV1CashBalanceQueryKey,
	getGetV1CashTransactionsQueryKey,
	useGetV1CashBalance,
	useGetV1CashTransactions,
	usePostV1CashTransfers,
} from "#/api/endpoints/cash/cash";
import {
	getGetV1VaultBalanceQueryKey,
	useGetV1VaultBalance,
} from "#/api/endpoints/vault/vault";
import { Button, SlideOver, useToast } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency, formatDate } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/kas/")({
	component: KasBerangkasOverviewPage,
});

function KasBerangkasOverviewPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [transferOpen, setTransferOpen] = useState(false);
	const [transferAmount, setTransferAmount] = useState("");
	const [transferNote, setTransferNote] = useState("");

	const today = new Date().toISOString().split("T")[0];

	const { data: cashData, isLoading: cashLoading } = useGetV1CashBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);

	const { data: vaultData, isLoading: vaultLoading } = useGetV1VaultBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);

	const { data: todayTxData, isLoading: txLoading } = useGetV1CashTransactions(
		{
			academic_year_id: activeAy?.id,
			start_date: today,
			end_date: today,
			limit: 50,
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const transferMutation = usePostV1CashTransfers();

	const cash = (cashData?.data as any)?.data;
	const vault = (vaultData?.data as any)?.data;
	const todayTransactions = (todayTxData?.data as any)?.data?.data || [];

	const cashBalance = Number(cash?.balance || 0);
	const todayCredit = Number(cash?.today_credit || 0);
	const todayDebit = Number(cash?.today_debit || 0);
	const lastClosingDate = cash?.last_closing_date;
	const savingsMandatoryBerlian = Number(
		cash?.total_savings_mandatory_berlian || 0,
	);
	const savingsMandatoryMutiara = Number(
		cash?.total_savings_mandatory_mutiara || 0,
	);

	const vaultBalance = Number(vault?.balance || 0);
	const savingsGeneral = Number(vault?.total_savings_general || 0);

	const parsedAmount = Number(transferAmount.replace(/\D/g, "")) || 0;
	const isAmountValid = parsedAmount > 0 && parsedAmount <= cashBalance;

	const handleTransferSubmit = () => {
		if (!parsedAmount || parsedAmount <= 0) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Jumlah transfer harus lebih dari 0",
			});
			return;
		}
		if (parsedAmount > cashBalance) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Jumlah transfer melebihi saldo kas",
			});
			return;
		}

		transferMutation.mutate(
			{
				data: {
					amount: parsedAmount,
					description: transferNote || "Transfer kas ke berangkas",
				},
				params: { academic_year_id: activeAy?.id },
			},
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Transfer Berhasil",
						message: `${formatCurrency(parsedAmount)} berhasil ditransfer ke berangkas.`,
					});
					setTransferOpen(false);
					setTransferAmount("");
					setTransferNote("");
					queryClient.invalidateQueries({
						queryKey: getGetV1CashBalanceQueryKey(),
					});
					queryClient.invalidateQueries({
						queryKey: getGetV1VaultBalanceQueryKey(),
					});
					queryClient.invalidateQueries({
						queryKey: getGetV1CashTransactionsQueryKey(),
					});
				},
				onError: () => {
					addToast({
						variant: "error",
						title: "Transfer Gagal",
						message:
							"Terjadi kesalahan saat melakukan transfer. Silakan coba lagi.",
					});
				},
			},
		);
	};

	const formatAmountInput = (value: string) => {
		const digits = value.replace(/\D/g, "");
		if (!digits) return "";
		return Number(digits).toLocaleString("id-ID");
	};

	const isClosedToday = lastClosingDate === today;
	const isLoading = cashLoading || vaultLoading;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Kas & Berangkas
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					TA {activeAy?.name || "-"} &middot; {formatDate(today)}
				</p>
			</div>

			{/* Balance Cards */}
			{isLoading ? (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{[0, 1].map((i) => (
						<div
							key={i}
							className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 animate-pulse"
						>
							<div className="h-6 bg-gray-200 rounded w-24 mb-4" />
							<div className="h-8 bg-gray-200 rounded w-48 mb-6" />
							<div className="space-y-3">
								<div className="h-4 bg-gray-200 rounded w-36" />
								<div className="h-4 bg-gray-200 rounded w-36" />
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* KAS Card */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<div className="flex items-center gap-2 mb-4">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
								<Wallet className="h-5 w-5 text-indigo-600" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900">Kas</h3>
						</div>

						<p className="text-3xl font-bold text-gray-900 mb-6">
							{formatCurrency(cashBalance)}
						</p>

						<div className="space-y-3 mb-6">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<ArrowDownRight className="h-4 w-4 text-green-500" />
									<span>Pemasukan hari ini</span>
								</div>
								<span className="text-sm font-medium text-green-600">
									{formatCurrency(todayCredit)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<ArrowUpRight className="h-4 w-4 text-red-500" />
									<span>Pengeluaran hari ini</span>
								</div>
								<span className="text-sm font-medium text-red-600">
									{formatCurrency(todayDebit)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-gray-600">
									{isClosedToday ? (
										<CheckCircle2 className="h-4 w-4 text-green-500" />
									) : (
										<AlertTriangle className="h-4 w-4 text-yellow-500" />
									)}
									<span>Tutup buku terakhir</span>
								</div>
								<span
									className={`text-sm font-medium ${isClosedToday ? "text-green-600" : "text-yellow-600"}`}
								>
									{lastClosingDate
										? formatDate(lastClosingDate)
										: "Belum pernah"}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-600">
									Tab. Wajib (Berlian)
								</span>
								<span className="text-sm font-medium text-gray-900">
									{formatCurrency(savingsMandatoryBerlian)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-600">
									Tab. Wajib (Mutiara)
								</span>
								<span className="text-sm font-medium text-gray-900">
									{formatCurrency(savingsMandatoryMutiara)}
								</span>
							</div>
						</div>

						<div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
							<Link
								to="/keuangan/kas/transaksi"
								search={{} as any}
								className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
							>
								Lihat Riwayat Transaksi
								<ArrowRight className="h-4 w-4 ml-1" />
							</Link>
							<button
								type="button"
								onClick={() => setTransferOpen(true)}
								className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
							>
								Transfer ke Berangkas
								<Send className="h-4 w-4 ml-1" />
							</button>
						</div>
					</div>

					{/* BERANGKAS Card */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<div className="flex items-center gap-2 mb-4">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
								<Vault className="h-5 w-5 text-amber-600" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900">Berangkas</h3>
						</div>

						<p className="text-3xl font-bold text-gray-900 mb-6">
							{formatCurrency(vaultBalance)}
						</p>

						<div className="space-y-3 mb-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-600">
									Tab. Umum (semua siswa)
								</span>
								<span className="text-sm font-medium text-gray-900">
									{formatCurrency(savingsGeneral)}
								</span>
							</div>
						</div>

						<div className="border-t border-gray-100 pt-4">
							<Link
								to="/keuangan/kas/berangkas/transaksi"
								search={{} as any}
								className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
							>
								Lihat Riwayat Transaksi Berangkas
								<ArrowRight className="h-4 w-4 ml-1" />
							</Link>
						</div>
					</div>
				</div>
			)}

			{/* Tutup Buku */}
			<div>
				<Link to="/keuangan/kas/tutup-buku">
					<Button size="lg" className="gap-2">
						<BookOpen className="h-4 w-4" />
						Tutup Buku Hari Ini
					</Button>
				</Link>
			</div>

			{/* Mutasi Hari Ini */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200">
					<h3 className="text-base font-semibold text-gray-900">
						MUTASI HARI INI
					</h3>
				</div>

				{txLoading ? (
					<div className="px-6 py-8 text-center text-sm text-gray-500">
						Memuat data transaksi...
					</div>
				) : todayTransactions.length === 0 ? (
					<div className="px-6 py-12 text-center text-sm text-gray-500">
						Belum ada transaksi hari ini.
					</div>
				) : (
					<div className="divide-y divide-gray-100">
						{todayTransactions.map((tx: any) => {
							const isCredit = tx.transaction_type === "credit";
							const txDate = new Date(tx.transaction_date || tx.created_at);
							const timeStr = txDate.toLocaleTimeString("id-ID", {
								hour: "2-digit",
								minute: "2-digit",
							});

							return (
								<div
									key={tx.id}
									className="px-6 py-3 flex items-center justify-between"
								>
									<div className="flex items-center gap-3">
										<div
											className={`flex h-8 w-8 items-center justify-center rounded-full ${isCredit ? "bg-green-50" : "bg-red-50"}`}
										>
											{isCredit ? (
												<ArrowUpRight className="h-4 w-4 text-green-500" />
											) : (
												<ArrowDownRight className="h-4 w-4 text-red-500" />
											)}
										</div>
										<div>
											<p className="text-sm font-medium text-gray-900">
												{tx.description}
											</p>
											<div className="flex items-center gap-1 text-xs text-gray-500">
												<Clock className="h-3 w-3" />
												<span>{timeStr}</span>
												{tx.created_by?.full_name && (
													<span className="ml-1">
														&middot; {tx.created_by.full_name}
													</span>
												)}
											</div>
										</div>
									</div>
									<span
										className={`text-sm font-semibold tabular-nums ${isCredit ? "text-green-600" : "text-red-600"}`}
									>
										{isCredit ? "+" : "-"}
										{formatCurrency(Number(tx.amount))}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Transfer SlideOver */}
			<SlideOver
				isOpen={transferOpen}
				onClose={() => setTransferOpen(false)}
				title="Transfer ke Berangkas"
				footer={
					<>
						<Button variant="secondary" onClick={() => setTransferOpen(false)}>
							Batal
						</Button>
						<Button
							onClick={handleTransferSubmit}
							disabled={!isAmountValid || transferMutation.isPending}
						>
							{transferMutation.isPending ? "Memproses..." : "Transfer"}
						</Button>
					</>
				}
			>
				<div className="space-y-6">
					<div className="rounded-lg bg-gray-50 p-4">
						<p className="text-sm text-gray-500">Saldo Kas Saat Ini</p>
						<p className="text-2xl font-bold text-gray-900">
							{formatCurrency(cashBalance)}
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Nominal Transfer
						</label>
						<div className="relative rounded-md shadow-sm">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<span className="text-gray-500 sm:text-sm">Rp</span>
							</div>
							<input
								type="text"
								inputMode="numeric"
								className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								placeholder="0"
								value={transferAmount}
								onChange={(e) =>
									setTransferAmount(formatAmountInput(e.target.value))
								}
							/>
						</div>
						{parsedAmount > cashBalance && (
							<p className="mt-1 text-sm text-red-600">
								Nominal tidak boleh melebihi saldo kas (
								{formatCurrency(cashBalance)})
							</p>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Keterangan{" "}
							<span className="text-gray-400 font-normal">(opsional)</span>
						</label>
						<input
							type="text"
							className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Mis: Transfer harian"
							value={transferNote}
							onChange={(e) => setTransferNote(e.target.value)}
						/>
					</div>

					{parsedAmount > 0 && isAmountValid && (
						<div className="rounded-lg border border-gray-200 p-4 space-y-3">
							<p className="text-sm font-medium text-gray-900">
								Pratinjau Setelah Transfer
							</p>
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-600">Saldo Kas</span>
								<span className="text-sm font-medium text-gray-900">
									{formatCurrency(cashBalance - parsedAmount)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-600">Saldo Berangkas</span>
								<span className="text-sm font-medium text-gray-900">
									{formatCurrency(vaultBalance + parsedAmount)}
								</span>
							</div>
						</div>
					)}
				</div>
			</SlideOver>
		</div>
	);
}
