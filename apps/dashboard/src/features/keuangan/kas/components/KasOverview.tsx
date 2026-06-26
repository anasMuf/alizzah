import { Link } from "@tanstack/react-router";
import {
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
import { Button, SlideOver } from "#/components/ui";
import { formatCurrency, formatDate } from "@/utils/format";

interface KasOverviewProps {
	cash: any;
	vault: any;
	todayTransactions: any[];
	cashBalance: number;
	vaultBalance: number;
	cashLoading: boolean;
	vaultLoading: boolean;
	txLoading: boolean;
	today: string;
	transferOpen: boolean;
	onTransferOpen: (v: boolean) => void;
	transferAmount: string;
	onTransferAmountChange: (v: string) => void;
	transferNote: string;
	onTransferNoteChange: (v: string) => void;
	parsedAmount: number;
	isAmountValid: boolean;
	onTransfer: () => void;
	isPending: boolean;
}

export function KasOverview({
	cash,
	vault,
	todayTransactions,
	cashBalance,
	vaultBalance,
	cashLoading,
	vaultLoading,
	txLoading,
	today,
	transferOpen,
	onTransferOpen,
	transferAmount,
	onTransferAmountChange,
	transferNote,
	onTransferNoteChange,
	parsedAmount,
	isAmountValid,
	onTransfer,
	isPending,
}: KasOverviewProps) {
	const todayCredit = Number(cash?.today_credit || 0);
	const todayDebit = Number(cash?.today_debit || 0);
	const lastClosingDate = cash?.last_closing_date;
	const isClosedToday = lastClosingDate === today;
	const savingsGeneral = Number(vault?.total_savings_general || 0);
	const savingsMandatory = Number(vault?.total_savings_mandatory || 0);
	const formatAmountInput = (value: string) => {
		const digits = value.replace(/\D/g, "");
		return digits ? Number(digits).toLocaleString("id-ID") : "";
	};

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{cashLoading ? (
					<Skeleton />
				) : (
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
									<ArrowUpRight className="h-4 w-4 text-green-500" />
									<span>Pemasukan hari ini</span>
								</div>
								<span className="text-sm font-medium text-green-600">
									{formatCurrency(todayCredit)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<ArrowDownRight className="h-4 w-4 text-red-500" />
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
										<Clock className="h-4 w-4 text-yellow-500" />
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
						</div>
						<div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
							<Link
								to="/keuangan/kas/transaksi"
								className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
							>
								Lihat Riwayat Transaksi
								<ArrowRight className="h-4 w-4 ml-1" />
							</Link>
							<button
								type="button"
								onClick={() => onTransferOpen(true)}
								className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
							>
								Transfer ke Berangkas
								<Send className="h-4 w-4 ml-1" />
							</button>
						</div>
					</div>
				)}
				{vaultLoading ? (
					<Skeleton />
				) : (
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
								<span className="text-sm text-gray-600">Tab. Umum</span>
								<span className="text-sm font-medium text-gray-900">
									{formatCurrency(savingsGeneral)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-600">
									Tab. Wajib (Berlian)
								</span>
								<span className="text-sm font-medium text-gray-900">
									{formatCurrency(savingsMandatory)}
								</span>
							</div>
						</div>
						<div className="border-t border-gray-100 pt-4">
							<Link
								to="/keuangan/kas/berangkas/transaksi"
								className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
							>
								Lihat Riwayat Transaksi Berangkas
								<ArrowRight className="h-4 w-4 ml-1" />
							</Link>
						</div>
					</div>
				)}
			</div>

			<div>
				<Link to="/keuangan/kas/tutup-buku">
					<Button size="lg" className="gap-2">
						<BookOpen className="h-4 w-4" />
						Tutup Buku Hari Ini
					</Button>
				</Link>
			</div>

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
							const timeStr = new Date(
								tx.transaction_date || tx.created_at,
							).toLocaleTimeString("id-ID", {
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

			<SlideOver
				isOpen={transferOpen}
				onClose={() => onTransferOpen(false)}
				title="Transfer ke Berangkas"
				footer={
					<>
						<Button variant="secondary" onClick={() => onTransferOpen(false)}>
							Batal
						</Button>
						<Button onClick={onTransfer} disabled={!isAmountValid || isPending}>
							{isPending ? "Memproses..." : "Transfer"}
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
						<label
							htmlFor="transfer-amount"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Nominal Transfer
						</label>
						<div className="relative rounded-md shadow-sm">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<span className="text-gray-500 sm:text-sm">Rp</span>
							</div>
							<input
								id="transfer-amount"
								type="text"
								inputMode="numeric"
								className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
								placeholder="0"
								value={transferAmount}
								onChange={(e) =>
									onTransferAmountChange(formatAmountInput(e.target.value))
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
						<label
							htmlFor="transfer-note"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Keterangan{" "}
							<span className="text-gray-400 font-normal">(opsional)</span>
						</label>
						<input
							id="transfer-note"
							type="text"
							className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							placeholder="Mis: Transfer harian"
							value={transferNote}
							onChange={(e) => onTransferNoteChange(e.target.value)}
						/>
					</div>
				</div>
			</SlideOver>
		</div>
	);
}

function Skeleton() {
	return (
		<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 animate-pulse">
			<div className="h-6 bg-gray-200 rounded w-24 mb-4" />
			<div className="h-8 bg-gray-200 rounded w-48 mb-6" />
			<div className="space-y-3">
				<div className="h-4 bg-gray-200 rounded w-36" />
				<div className="h-4 bg-gray-200 rounded w-36" />
			</div>
		</div>
	);
}
