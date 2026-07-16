import { Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertCircle,
	ArrowUpRight,
	ChevronRight,
	CreditCard,
	FileText,
	Loader2,
	Plus,
	TrendingDown,
	Users,
	Vault,
	Wallet,
} from "lucide-react";
import { useGetV1CashBalance } from "#/api/endpoints/cash/cash";
import { useGetV1Invoices } from "#/api/endpoints/invoices/invoices";
import { useGetV1ReportsAnnual } from "#/api/endpoints/reports/reports";
import { useGetV1Students } from "#/api/endpoints/students/students";
import { useGetV1VaultBalance } from "#/api/endpoints/vault/vault";
import { useAuth } from "#/features/auth/AuthContext";
import { useAccess } from "#/features/auth/access";
import { academicYearAtom } from "../../../store/global";
import { formatCurrency } from "../../../utils/format";

export function DashboardView() {
	const { user } = useAuth();
	const { hasModule } = useAccess();
	const [activeAy] = useAtom(academicYearAtom);
	const enabled = !!activeAy?.id;

	const isAdminKeuangan = hasModule("keuangan");
	const isAdminAdministrasi = hasModule("administrasi");

	const { data: studentsData, isLoading: studentsLoading } = useGetV1Students(
		{ academic_year_id: activeAy?.id, status: "active", limit: 1 },
		{ query: { enabled: enabled && isAdminAdministrasi } },
	);
	const totalStudents = (studentsData?.data as any)?.meta?.total ?? 0;

	const { data: cashData, isLoading: cashLoading } = useGetV1CashBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: enabled && isAdminKeuangan } },
	);
	const cash = (cashData?.data as any)?.data;

	const { data: vaultData } = useGetV1VaultBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: enabled && isAdminKeuangan } },
	);
	const vault = (vaultData?.data as any)?.data;

	const { data: annualData, isLoading: annualLoading } = useGetV1ReportsAnnual(
		{ academic_year_id: activeAy?.id! },
		{ query: { enabled: enabled && isAdminKeuangan } },
	);
	const annual = (annualData?.data as any)?.data;

	const { data: unpaidData, isLoading: unpaidLoading } = useGetV1Invoices(
		{ status: "unpaid", academic_year_id: activeAy?.id, limit: 5 },
		{ query: { enabled: enabled && isAdminKeuangan } },
	);
	const unpaidInvoices: any[] = (unpaidData?.data as any)?.data || [];
	const unpaidMeta = (unpaidData?.data as any)?.meta;

	const isLoading =
		studentsLoading || cashLoading || annualLoading || unpaidLoading;

	const greeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Selamat Pagi";
		if (hour < 15) return "Selamat Siang";
		if (hour < 18) return "Selamat Sore";
		return "Selamat Malam";
	};

	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					{greeting()}, {user?.full_name}
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					{activeAy
						? `Tahun Ajaran ${activeAy.name}`
						: "Pilih tahun ajaran di menu samping untuk memulai."}
				</p>
			</div>

			{!activeAy ? (
				<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
					<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
					<h3 className="mt-4 text-sm font-semibold text-gray-900">
						Tahun Ajaran Belum Dipilih
					</h3>
					<p className="mt-1 text-sm text-gray-500">
						Silakan pilih tahun ajaran aktif pada panel samping kiri.
					</p>
				</div>
			) : isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
					<span className="ml-3 text-gray-500">Memuat data dashboard...</span>
				</div>
			) : (
				<>
					{/* Stat Cards */}
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{isAdminAdministrasi && (
							<StatCard
								icon={Users}
								iconBg="bg-blue-50"
								iconColor="text-blue-600"
								label="Total Siswa Aktif"
								value={totalStudents.toLocaleString("id-ID")}
								linkTo="/administrasi/siswa"
								linkLabel="Lihat Siswa"
							/>
						)}

						{isAdminKeuangan && (
							<>
								<StatCard
									icon={Wallet}
									iconBg="bg-emerald-50"
									iconColor="text-emerald-600"
									label="Saldo Kas"
									value={formatCurrency(Number(cash?.balance || 0))}
									linkTo="/keuangan/kas"
									linkLabel="Lihat Kas"
								/>
								<StatCard
									icon={Vault}
									iconBg="bg-amber-50"
									iconColor="text-amber-600"
									label="Saldo Brangkas"
									value={formatCurrency(Number(vault?.balance || 0))}
									linkTo="/keuangan/kas/berangkas"
									linkLabel="Lihat Brangkas"
								/>
								<StatCard
									icon={ArrowUpRight}
									iconBg="bg-rose-50"
									iconColor="text-rose-600"
									label="Total Pengeluaran"
									value={formatCurrency(
										Number(annual?.expense_summary?.total || 0),
									)}
								/>
							</>
						)}
					</div>

					{/* Financial overview
					{/* Financial overview for keuangan roles */}
					{isAdminKeuangan && (
						<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
							{/* Unpaid invoices */}
							<div className="lg:col-span-2 overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
								<div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex justify-between items-center">
									<div>
										<h3 className="text-base font-semibold leading-6 text-gray-900">
											Tagihan Belum Lunas
										</h3>
										{unpaidMeta?.total > 0 && (
											<p className="mt-1 text-sm text-gray-500">
												{unpaidMeta.total} tagihan tersisa
											</p>
										)}
									</div>
									<Link
										to="/keuangan/tagihan"
										search={{} as any}
										className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center"
									>
										Semua <ChevronRight className="h-4 w-4 ml-1" />
									</Link>
								</div>
								<ul className="divide-y divide-gray-200">
									{unpaidInvoices.length === 0 ? (
										<li className="px-4 py-8 text-center text-gray-500 text-sm">
											Semua tagihan sudah lunas.
										</li>
									) : (
										unpaidInvoices.map((inv: any) => {
											const sisa =
												Number(inv.total_amount || 0) -
												Number(inv.paid_amount || 0);
											return (
												<li
													key={inv.id}
													className="px-4 py-4 sm:px-6 hover:bg-gray-50"
												>
													<div className="flex items-center justify-between">
														<div className="flex items-center min-w-0">
															<AlertCircle className="h-5 w-5 text-amber-500 mr-3 shrink-0" />
															<div className="min-w-0">
																<p className="text-sm font-medium text-gray-900 truncate">
																	{inv.student?.full_name}
																</p>
																<p className="text-sm text-gray-500">
																	{inv.type === "monthly" &&
																	inv.month &&
																	inv.year
																		? `${["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][inv.month]} ${inv.year}`
																		: inv.type}
																</p>
															</div>
														</div>
														<span className="text-sm font-semibold text-amber-600 ml-4 shrink-0">
															{formatCurrency(sisa)}
														</span>
													</div>
												</li>
											);
										})
									)}
								</ul>
							</div>

							{/* Quick actions */}
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
										<CreditCard className="mr-3 h-5 w-5 text-indigo-400 group-hover:text-indigo-500" />
										Catat Pembayaran
									</Link>
									<Link
										to="/keuangan/pengeluaran/baru"
										className="group flex w-full items-center rounded-md bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
									>
										<TrendingDown className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
										Catat Pengeluaran
									</Link>
									<Link
										to="/keuangan/laporan"
										className="group flex w-full items-center rounded-md bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
									>
										<FileText className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
										Lihat Laporan
									</Link>
								</div>
							</div>
						</div>
					)}

					{/* Admin Administrasi quick links */}
					{isAdminAdministrasi && !isAdminKeuangan && (
						<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
							<div className="border-b border-gray-200 px-4 py-5 sm:px-6">
								<h3 className="text-base font-semibold leading-6 text-gray-900">
									Aksi Cepat
								</h3>
							</div>
							<div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
								<Link
									to="/administrasi/siswa/baru"
									className="group flex items-center rounded-md bg-indigo-50 px-3 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
								>
									<Plus className="mr-3 h-5 w-5 text-indigo-400" />
									Tambah Siswa Baru
								</Link>
								<Link
									to="/administrasi/rombel"
									className="group flex items-center rounded-md bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
								>
									<Users className="mr-3 h-5 w-5 text-gray-400" />
									Kelola Rombel
								</Link>
								<Link
									to="/administrasi/siklus"
									className="group flex items-center rounded-md bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
								>
									<FileText className="mr-3 h-5 w-5 text-gray-400" />
									Siklus Akademik
								</Link>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

function StatCard({
	icon: Icon,
	iconBg,
	iconColor,
	label,
	value,
	sub,
	linkTo,
	linkLabel,
}: {
	icon: React.ElementType;
	iconBg: string;
	iconColor: string;
	label: string;
	value: string;
	sub?: string;
	linkTo?: string;
	linkLabel?: string;
}) {
	return (
		<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
			<div className="p-5">
				<div className="flex items-center">
					<div className={`rounded-md ${iconBg} p-3 shrink-0`}>
						<Icon className={`h-6 w-6 ${iconColor}`} />
					</div>
					<div className="ml-5 w-0 flex-1">
						<dl>
							<dt className="truncate text-sm font-medium text-gray-500">
								{label}
							</dt>
							<dd className="text-lg font-semibold text-gray-900">{value}</dd>
						</dl>
					</div>
				</div>
				{sub && <p className="mt-2 text-xs text-gray-500">{sub}</p>}
			</div>
			{linkTo && linkLabel && (
				<div className="bg-gray-50 px-5 py-3">
					<Link
						to={linkTo}
						className="text-sm font-medium text-indigo-700 hover:text-indigo-900 flex items-center"
					>
						{linkLabel} <ChevronRight className="h-4 w-4 ml-1" />
					</Link>
				</div>
			)}
		</div>
	);
}
