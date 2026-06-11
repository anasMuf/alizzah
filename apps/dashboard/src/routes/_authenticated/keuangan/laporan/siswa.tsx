import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Printer,
	Search,
	User,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGetV1ReportsStudentsId } from "../../../../api/endpoints/reports/reports";
import { useGetV1Students } from "../../../../api/endpoints/students/students";
import { Alert } from "@alizzah/ui";
import { Badge } from "@alizzah/ui";
import { Button } from "@alizzah/ui";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency, formatDate } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/laporan/siswa")({
	component: RekapSiswaPage,
	validateSearch: (search: Record<string, unknown>) => ({
		studentId: search.studentId ? Number(search.studentId) : undefined,
	}),
});

function RekapSiswaPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const { studentId: preSelectedId } = Route.useSearch();

	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selectedStudentId, setSelectedStudentId] = useState<number>(
		preSelectedId || 0,
	);
	const [allTA, setAllTA] = useState(false);
	const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(
		new Set(),
	);

	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Debounce search
	useEffect(() => {
		debounceRef.current = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 300);
		return () => clearTimeout(debounceRef.current);
	}, [searchQuery]);

	// Pre-select from URL param
	useEffect(() => {
		if (preSelectedId) {
			setSelectedStudentId(preSelectedId);
		}
	}, [preSelectedId]);

	const { data: studentsData, isLoading: studentsLoading } = useGetV1Students(
		{
			search: debouncedQuery,
			academic_year_id: activeAy?.id,
			limit: 10,
		},
		{
			query: {
				enabled:
					!!debouncedQuery && debouncedQuery.length >= 2 && !!activeAy?.id,
			},
		},
	);

	const studentResults: any[] = (studentsData?.data as any)?.data || [];

	const {
		data: reportData,
		isLoading: reportLoading,
		isError,
	} = useGetV1ReportsStudentsId(
		selectedStudentId,
		{
			academic_year_id: allTA ? undefined : activeAy?.id,
			all: allTA || undefined,
		},
		{
			query: { enabled: selectedStudentId > 0 },
		},
	);

	const report = selectedStudentId > 0 ? (reportData?.data as any)?.data : null;

	const student = report?.student;
	const invoiceSummary = report?.invoice_summary;
	const invoices: any[] = report?.invoices || [];
	const payments: any[] = report?.payment_history || [];
	const savings = report?.savings;

	const handleSelectStudent = useCallback((id: number) => {
		setSelectedStudentId(id);
		setSearchQuery("");
		setDebouncedQuery("");
		setExpandedInvoices(new Set());
	}, []);

	const toggleInvoice = (id: number) => {
		setExpandedInvoices((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const invoiceStatusBadge = (status: string) => {
		switch (status) {
			case "paid":
				return (
					<Badge variant="success">
						<CheckCircle2 className="h-3 w-3 mr-1" />
						Lunas
					</Badge>
				);
			case "partial":
				return (
					<Badge variant="warning">
						<AlertTriangle className="h-3 w-3 mr-1" />
						Sebagian
					</Badge>
				);
			default:
				return (
					<Badge variant="danger">
						<XCircle className="h-3 w-3 mr-1" />
						Belum
					</Badge>
				);
		}
	};

	const itemStatusIcon = (status: string) => {
		switch (status) {
			case "paid":
				return <CheckCircle2 className="h-4 w-4 text-green-500" />;
			case "partial":
				return <AlertTriangle className="h-4 w-4 text-amber-500" />;
			default:
				return <XCircle className="h-4 w-4 text-red-400" />;
		}
	};

	const showSearchResults = debouncedQuery.length >= 2 && !selectedStudentId;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between print:hidden">
				<div>
					<nav className="flex items-center text-sm text-gray-500 mb-2">
						<Link
							to="/keuangan/laporan"
							className="hover:text-indigo-600 transition-colors"
						>
							Laporan
						</Link>
						<ChevronRight className="w-4 h-4 mx-1" />
						<span className="text-gray-900 font-medium">Rekap per Siswa</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						{student ? `Rekap — ${student.full_name}` : "Rekap per Siswa"}
					</h2>
				</div>
				{report && (
					<Button
						variant="secondary"
						onClick={() => window.print()}
						className="print:hidden"
					>
						<Printer className="w-4 h-4 mr-2" />
						Cetak
					</Button>
				)}
			</div>

			{/* Print Header */}
			<div className="hidden print:block border-b border-gray-300 pb-4 mb-6">
				<h1 className="text-lg font-bold">ALIZZAH MANAJEMEN</h1>
				<p className="text-sm text-gray-600">Laporan Keuangan</p>
				<div className="mt-2 text-sm text-gray-700 space-y-0.5">
					<p>Jenis: Rekap per Siswa</p>
					<p>Siswa: {student?.full_name || "-"}</p>
					<p>TA: {allTA ? "Semua" : activeAy?.name || "-"}</p>
				</div>
			</div>

			{/* Search & TA toggle */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 print:hidden">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="relative flex-1 min-w-[240px] max-w-md">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							{selectedStudentId ? "Ganti siswa" : "Cari nama siswa"}
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<Search className="h-4 w-4 text-gray-400" />
							</div>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									if (selectedStudentId) setSelectedStudentId(0);
								}}
								placeholder="Ketik nama siswa..."
								className="block w-full rounded-md border-0 py-1.5 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							/>
						</div>

						{/* Search Results Dropdown */}
						{showSearchResults && (
							<div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg ring-1 ring-black/5 max-h-64 overflow-auto">
								{studentsLoading ? (
									<div className="px-4 py-3 text-sm text-gray-500">
										Mencari...
									</div>
								) : studentResults.length > 0 ? (
									studentResults.map((s: any) => (
										<button
											key={s.id}
											type="button"
											onClick={() => handleSelectStudent(s.id)}
											className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
										>
											<div className="flex items-center gap-3">
												<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
													<User className="h-4 w-4 text-gray-500" />
												</div>
												<div>
													<p className="text-sm font-medium text-gray-900">
														{s.full_name}
													</p>
													<p className="text-xs text-gray-500">
														{s.class_group?.name || ""}{" "}
														{s.class_group?.level
															? `· ${s.class_group.level}`
															: ""}
													</p>
												</div>
											</div>
										</button>
									))
								) : (
									<div className="px-4 py-3 text-sm text-gray-500">
										Siswa tidak ditemukan.
									</div>
								)}
							</div>
						)}
					</div>

					{selectedStudentId > 0 && (
						<>
							<div>
								<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
									TA
								</label>
								<input
									type="text"
									value={allTA ? "Semua TA" : activeAy?.name || "-"}
									disabled
									className="block w-full sm:w-36 rounded-md border-0 py-1.5 px-3 text-gray-500 bg-gray-50 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
								/>
							</div>
							<label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={allTA}
									onChange={(e) => setAllTA(e.target.checked)}
									className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
								/>
								Semua TA
							</label>
						</>
					)}
				</div>
			</div>

			{/* Loading */}
			{reportLoading && (
				<div className="animate-pulse space-y-4">
					<div className="h-20 bg-gray-200 rounded-xl" />
					<div className="h-32 bg-gray-200 rounded-xl" />
					<div className="h-48 bg-gray-200 rounded-xl" />
				</div>
			)}

			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat rekap siswa.
				</Alert>
			)}

			{/* Report Content */}
			{report && !reportLoading && (
				<>
					{/* Student Profile */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<div className="flex items-center gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
								<User className="h-6 w-6 text-indigo-600" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900">
									{student?.full_name}
								</h3>
								<p className="text-sm text-gray-500">
									{student?.gender === "L"
										? "Laki-laki"
										: student?.gender === "P"
											? "Perempuan"
											: student?.gender || ""}
									{" · "}TA {allTA ? "Semua" : activeAy?.name || "-"}
								</p>
							</div>
						</div>
					</div>

					{/* Summary */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
							<p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
								Total Tagihan
							</p>
							<p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
								{formatCurrency(Number(invoiceSummary?.total_billed || 0))}
							</p>
						</div>
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
							<p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
								Sudah Dibayar
							</p>
							<p className="mt-1 text-xl font-bold text-green-600 tabular-nums">
								{formatCurrency(Number(invoiceSummary?.total_paid || 0))}
							</p>
						</div>
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
							<p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
								Sisa Tunggakan
							</p>
							<p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
								{formatCurrency(Number(invoiceSummary?.total_unpaid || 0))}
							</p>
						</div>
					</div>

					{/* Savings */}
					{savings && (savings.general || savings.mandatory) && (
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
							<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
								Saldo Tabungan
							</h3>
							<div className="flex flex-wrap gap-6">
								{savings.general && (
									<div>
										<p className="text-sm text-gray-600">Tabungan Umum</p>
										<p className="text-lg font-bold text-gray-900 tabular-nums">
											{formatCurrency(Number(savings.general.balance || 0))}
										</p>
									</div>
								)}
								{savings.mandatory && (
									<div>
										<p className="text-sm text-gray-600">Tabungan Wajib</p>
										<p className="text-lg font-bold text-gray-900 tabular-nums">
											{formatCurrency(Number(savings.mandatory.balance || 0))}
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Invoice List */}
					<div className="space-y-3">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
							Rincian Tagihan
						</h3>
						{invoices.length > 0 ? (
							invoices.map((inv: any) => {
								const isExpanded = expandedInvoices.has(inv.id);
								const items: any[] = inv.items || [];
								return (
									<div
										key={inv.id}
										className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden"
									>
										<button
											type="button"
											onClick={() => toggleInvoice(inv.id)}
											className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
										>
											<div className="flex items-center gap-3 text-left">
												<div>
													<p className="text-sm font-semibold text-gray-900">
														{inv.type === "monthly"
															? `Tagihan Bulanan — ${inv.period}`
															: inv.type === "registration"
																? `Tagihan Registrasi — ${inv.period}`
																: `Tagihan ${inv.type} — ${inv.period}`}
													</p>
													<div className="flex items-center gap-2 mt-1">
														{invoiceStatusBadge(inv.status)}
														<span className="text-xs text-gray-500">
															Total:{" "}
															{formatCurrency(Number(inv.total_amount || 0))}
														</span>
													</div>
												</div>
											</div>
											{isExpanded ? (
												<ChevronUp className="h-5 w-5 text-gray-400" />
											) : (
												<ChevronDown className="h-5 w-5 text-gray-400" />
											)}
										</button>

										{isExpanded && items.length > 0 && (
											<div className="border-t border-gray-200 px-6 py-3 space-y-2 bg-gray-50">
												{items.map((item: any) => (
													<div
														key={item.id}
														className="flex items-center justify-between py-1.5"
													>
														<div className="flex items-center gap-2">
															{itemStatusIcon(item.status)}
															<span className="text-sm text-gray-700">
																{item.name}
															</span>
														</div>
														<div className="flex items-center gap-3">
															<span className="text-sm tabular-nums text-gray-900">
																{formatCurrency(Number(item.amount || 0))}
															</span>
															{item.status === "partial" && (
																<span className="text-xs text-amber-600">
																	Sisa{" "}
																	{formatCurrency(
																		Number(item.amount || 0) -
																			Number(item.paid_amount || 0),
																	)}
																</span>
															)}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								);
							})
						) : (
							<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-8 text-center">
								<p className="text-sm text-gray-500">
									Siswa ini belum memiliki tagihan.
								</p>
							</div>
						)}
					</div>

					{/* Payment History */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
						<div className="p-6 pb-2">
							<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Riwayat Pembayaran
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
											Tanggal
										</th>
										<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
											Sumber
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
											Nominal
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{payments.length > 0 ? (
										payments.map((p: any) => (
											<tr key={p.id}>
												<td className="whitespace-nowrap py-3 pl-6 pr-3 text-sm text-gray-900">
													{formatDate(p.payment_date)}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
													{p.source || "-"}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-sm text-right tabular-nums font-medium text-gray-900 pr-6">
													{formatCurrency(Number(p.total_amount || 0))}
												</td>
											</tr>
										))
									) : (
										<tr>
											<td
												colSpan={3}
												className="px-6 py-8 text-center text-sm text-gray-500"
											>
												Belum ada riwayat pembayaran.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
