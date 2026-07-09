import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertCircle,
	ArrowDownRight,
	ArrowUpRight,
	ChevronRight,
	FileText,
	Loader2,
	Plus,
	Wallet,
} from "lucide-react";
import { useGetV1CashBalance } from "#/api/endpoints/cash/cash";
import { useGetV1Invoices } from "#/api/endpoints/invoices/invoices";
import { useGetV1ReportsDaily } from "#/api/endpoints/reports/reports";
import { useGetV1VaultBalance } from "#/api/endpoints/vault/vault";
import { academicYearAtom } from "../../../store/global";
import { formatCurrency } from "../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/")({
	component: KeuanganOverviewPage,
});

function KeuanganOverviewPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const today = new Date().toISOString().split("T")[0];

	const enabled = !!activeAy?.id;

	const { data: cashData, isLoading: cashLoading } = useGetV1CashBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled } },
	);
	const { data: vaultData, isLoading: vaultLoading } = useGetV1VaultBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled } },
	);
	const { data: reportData, isLoading: reportLoading } = useGetV1ReportsDaily(
		{ date: today, academic_year_id: activeAy?.id },
		{ query: { enabled } },
	);
	const { data: unpaidData, isLoading: unpaidLoading } = useGetV1Invoices(
		{ status: "unpaid", academic_year_id: activeAy?.id, limit: 5 },
		{ query: { enabled } },
	);

	const cash = (cashData?.data as any)?.data;
	const vault = (vaultData?.data as any)?.data;
	const report = (reportData?.data as any)?.data;
	const unpaidInvoices = (unpaidData?.data as any)?.data || [];

	const saldoKas = Number(cash?.balance || 0);
	const saldoBerangkas = Number(vault?.balance || 0);
	const pemasukanHariIni = Number(report?.income_summary?.total || 0);
	const pengeluaranHariIni = Number(report?.expense_summary?.total || 0);
	// Total seluruh tunggakan (sum terfilter dari backend), bukan jumlah preview 5 baris.
	const totalTunggakan = Number(
		(unpaidData?.data as any)?.meta?.total_outstanding ?? 0,
	);

	const isLoading =
		cashLoading || vaultLoading || reportLoading || unpaidLoading;

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
				<span className="ml-3 text-gray-500">Memuat data keuangan...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-7xl mx-auto">
			<div className="border-b border-gray-200 pb-5 sm:flex sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Dashboard Keuangan
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Tahun Ajaran Aktif: {activeAy?.name || "Belum dipilih"}
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0 flex gap-2">
					<Link
						to="/keuangan/pengeluaran"
						className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
					>
						<Plus
							className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400"
							aria-hidden="true"
						/>
						Catat Pengeluaran
					</Link>
					<Link
						to="/keuangan/pembayaran/baru"
						search={{} as any}
						className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>
						<Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
						Catat Pembayaran
					</Link>
				</div>
			</div>

			{/* Saldo Cards */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
				<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<Wallet className="h-6 w-6 text-gray-400" aria-hidden="true" />
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="truncate text-sm font-medium text-gray-500">
										Saldo Kas (Laci)
									</dt>
									<dd>
										<div className="text-lg font-medium text-gray-900">
											{formatCurrency(saldoKas)}
										</div>
									</dd>
								</dl>
							</div>
						</div>
					</div>
					<div className="bg-gray-50 px-5 py-3">
						<div className="text-sm">
							<Link
								to="/keuangan/kas"
								className="font-medium text-indigo-700 hover:text-indigo-900 flex items-center"
							>
								Lihat Kas <ChevronRight className="h-4 w-4 ml-1" />
							</Link>
						</div>
					</div>
				</div>

				<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<Wallet className="h-6 w-6 text-gray-400" aria-hidden="true" />
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="truncate text-sm font-medium text-gray-500">
										Saldo Brankas
									</dt>
									<dd>
										<div className="text-lg font-medium text-gray-900">
											{formatCurrency(saldoBerangkas)}
										</div>
									</dd>
								</dl>
							</div>
						</div>
					</div>
					<div className="bg-gray-50 px-5 py-3">
						<div className="text-sm">
							<Link
								to="/keuangan/kas"
								className="font-medium text-indigo-700 hover:text-indigo-900 flex items-center"
							>
								Lihat Brankas <ChevronRight className="h-4 w-4 ml-1" />
							</Link>
						</div>
					</div>
				</div>

				<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<AlertCircle
									className="h-6 w-6 text-amber-500"
									aria-hidden="true"
								/>
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="truncate text-sm font-medium text-gray-500">
										Total Tunggakan Bulan Ini
									</dt>
									<dd>
										<div className="text-lg font-medium text-amber-600">
											{formatCurrency(totalTunggakan)}
										</div>
									</dd>
								</dl>
							</div>
						</div>
					</div>
					<div className="bg-gray-50 px-5 py-3">
						<div className="text-sm">
							<Link
								to="/keuangan/tagihan"
								className="font-medium text-indigo-700 hover:text-indigo-900 flex items-center"
							>
								Lihat Tagihan <ChevronRight className="h-4 w-4 ml-1" />
							</Link>
						</div>
					</div>
				</div>
			</div>

			{/* Pemasukan & Pengeluaran Hari Ini */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5 p-6 flex items-start">
					<div className="rounded-md bg-green-50 p-3 mr-4">
						<ArrowDownRight
							className="h-6 w-6 text-green-600"
							aria-hidden="true"
						/>
					</div>
					<div>
						<h3 className="text-base font-semibold leading-6 text-gray-900">
							Pemasukan Hari Ini
						</h3>
						<p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
							{formatCurrency(pemasukanHariIni)}
						</p>
						<p className="text-sm text-gray-500">
							dari {(report?.income_summary?.by_category || []).length || 0}{" "}
							kategori pemasukan
						</p>
					</div>
				</div>
				<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5 p-6 flex items-start">
					<div className="rounded-md bg-rose-50 p-3 mr-4">
						<ArrowUpRight
							className="h-6 w-6 text-rose-600"
							aria-hidden="true"
						/>
					</div>
					<div>
						<h3 className="text-base font-semibold leading-6 text-gray-900">
							Pengeluaran Hari Ini
						</h3>
						<p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
							{formatCurrency(pengeluaranHariIni)}
						</p>
						<p className="text-sm text-gray-500">
							dari {(report?.expense_summary?.by_category || []).length || 0}{" "}
							kategori pengeluaran
						</p>
					</div>
				</div>
			</div>

			{/* Tagihan Jatuh Tempo & Quick Actions */}
			<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
				{/* Jatuh Tempo */}
				<div className="lg:col-span-2 overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
					<div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex justify-between items-center">
						<h3 className="text-base font-semibold leading-6 text-gray-900">
							Tagihan Jatuh Tempo Minggu Ini
						</h3>
						<Link
							to="/keuangan/tagihan"
							className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
						>
							Lihat semua &rarr;
						</Link>
					</div>
					<ul className="divide-y divide-gray-200">
						{unpaidInvoices.map((inv: any) => (
							<li key={inv.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
								<div className="flex items-center justify-between">
									<div className="flex items-center">
										<AlertCircle className="h-5 w-5 text-amber-500 mr-3" />
										<div>
											<p className="text-sm font-medium text-gray-900">
												{inv.student?.full_name}
											</p>
											<p className="text-sm text-gray-500">
												{inv.type === "monthly" && inv.month && inv.year
													? `${["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][inv.month]} ${inv.year}`
													: inv.type}
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-sm font-semibold text-gray-900">
											{formatCurrency(
												Number(inv.total_amount || 0) -
													Number(inv.paid_amount || 0),
											)}
										</p>
									</div>
								</div>
							</li>
						))}
						{unpaidInvoices.length === 0 && (
							<li className="px-4 py-8 text-center text-gray-500 text-sm">
								Tidak ada tagihan yang belum dibayar.
							</li>
						)}
					</ul>
				</div>

				{/* Quick Actions */}
				<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
					<div className="border-b border-gray-200 px-4 py-5 sm:px-6">
						<h3 className="text-base font-semibold leading-6 text-gray-900">
							Aksi Cepat
						</h3>
					</div>
					<div className="p-4 space-y-3">
						<Link
							to="/keuangan/pembayaran/baru"
							search={{} as any}
							className="group flex w-full items-center rounded-md bg-indigo-50 px-3 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
						>
							<Plus className="mr-3 h-5 w-5 text-indigo-400 group-hover:text-indigo-500" />
							Catat Pembayaran Baru
						</Link>
						<Link
							to="/keuangan/pengeluaran"
							className="group flex w-full items-center rounded-md bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
						>
							<Plus className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
							Catat Pengeluaran
						</Link>
						<button
							type="button"
							className="group flex w-full items-center rounded-md bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
							onClick={() =>
								alert("Fitur Tutup Buku Hari Ini akan diimplementasikan")
							}
						>
							<FileText className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
							Tutup Buku Hari Ini
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
