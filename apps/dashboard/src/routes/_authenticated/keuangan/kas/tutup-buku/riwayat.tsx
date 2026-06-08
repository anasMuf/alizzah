import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	ChevronRight,
	Clock,
	Filter,
	Lock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1DailyClosings } from "../../../../../api/endpoints/daily-closings/daily-closings";
import { Badge } from "../../../../../components/atoms/Badge";
import { Button } from "../../../../../components/atoms/Button";
import { academicYearAtom } from "../../../../../store/global";
import { formatCurrency, formatDate } from "../../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/keuangan/kas/tutup-buku/riwayat",
)({
	component: RiwayatTutupBukuPage,
});

function getMonthOptions() {
	const months = [
		"Januari",
		"Februari",
		"Maret",
		"April",
		"Mei",
		"Juni",
		"Juli",
		"Agustus",
		"September",
		"Oktober",
		"November",
		"Desember",
	];
	return months.map((name, idx) => ({
		value: String(idx + 1).padStart(2, "0"),
		label: name,
	}));
}

function RiwayatTutupBukuPage() {
	const [activeAy] = useAtom(academicYearAtom);

	const now = new Date();
	const [month, setMonth] = useState(
		String(now.getMonth() + 1).padStart(2, "0"),
	);
	const [year, setYear] = useState(String(now.getFullYear()));
	const [status, setStatus] = useState("");
	const [page, setPage] = useState(1);

	const startDate = `${year}-${month}-01`;
	const endDate = useMemo(() => {
		const lastDay = new Date(Number(year), Number(month), 0).getDate();
		return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
	}, [year, month]);

	const { data: closingsData, isLoading } = useGetV1DailyClosings(
		{
			academic_year_id: activeAy?.id,
			page,
			limit: 31,
			start_date: startDate,
			end_date: endDate,
			...(status !== "" ? { is_confirmed: status === "confirmed" } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const closings: any[] = (closingsData?.data as any)?.data?.data || [];
	const meta = (closingsData?.data as any)?.data?.meta;

	// If API returns flat array instead of paginated
	const closingsList = Array.isArray(closings) ? closings : [];

	const { confirmedCount, pendingCount } = useMemo(() => {
		let confirmed = 0;
		let pending = 0;
		for (const c of closingsList) {
			if (c.is_confirmed) confirmed++;
			else pending++;
		}
		return { confirmedCount: confirmed, pendingCount: pending };
	}, [closingsList]);

	const handleReset = () => {
		const n = new Date();
		setMonth(String(n.getMonth() + 1).padStart(2, "0"));
		setYear(String(n.getFullYear()));
		setStatus("");
		setPage(1);
	};

	const currentYear = new Date().getFullYear();
	const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

	return (
		<div className="space-y-6">
			<nav className="flex items-center gap-1 text-sm text-gray-500">
				<Link to="/keuangan/kas" className="hover:text-indigo-600">
					Kas & Berangkas
				</Link>
				<ChevronRight className="h-4 w-4" />
				<Link to="/keuangan/kas/tutup-buku" className="hover:text-indigo-600">
					Tutup Buku
				</Link>
				<ChevronRight className="h-4 w-4" />
				<span className="text-gray-900 font-medium">Riwayat</span>
			</nav>

			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Riwayat Tutup Buku
				</h2>
				<p className="mt-1 text-sm text-gray-500">TA {activeAy?.name || "-"}</p>
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Bulan
						</label>
						<select
							value={month}
							onChange={(e) => {
								setMonth(e.target.value);
								setPage(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{getMonthOptions().map((m) => (
								<option key={m.value} value={m.value}>
									{m.label}
								</option>
							))}
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Tahun
						</label>
						<select
							value={year}
							onChange={(e) => {
								setYear(e.target.value);
								setPage(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Status
						</label>
						<select
							value={status}
							onChange={(e) => {
								setStatus(e.target.value);
								setPage(1);
							}}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Status</option>
							<option value="confirmed">Dikonfirmasi</option>
							<option value="pending">Menunggu Konfirmasi</option>
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<Button
							variant="secondary"
							className="bg-white"
							onClick={handleReset}
						>
							<Filter className="w-4 h-4 mr-2" />
							Reset Filter
						</Button>
					</div>
				</div>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
					<p className="text-sm text-gray-500">Total Tutup Buku</p>
					<p className="text-xl font-bold text-gray-900">
						{closingsList.length}
					</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
					<div className="flex items-center gap-2">
						<Lock className="h-4 w-4 text-green-500" />
						<p className="text-sm text-gray-500">Dikonfirmasi</p>
					</div>
					<p className="text-xl font-bold text-green-600">{confirmedCount}</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
					<div className="flex items-center gap-2">
						<Clock className="h-4 w-4 text-amber-500" />
						<p className="text-sm text-gray-500">Menunggu Konfirmasi</p>
					</div>
					<p className="text-xl font-bold text-amber-600">{pendingCount}</p>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-300">
						<thead className="bg-gray-50">
							<tr>
								<th
									scope="col"
									className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-12"
								>
									#
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Tanggal
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
								>
									Kas Fisik
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
								>
									Kas Sistem
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
								>
									Selisih
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Status
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 pr-6"
								>
									Oleh
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{isLoading ? (
								<tr>
									<td
										colSpan={7}
										className="px-3 py-8 text-center text-sm text-gray-500"
									>
										Memuat data tutup buku...
									</td>
								</tr>
							) : closingsList.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="px-3 py-12 text-center text-sm text-gray-500"
									>
										Belum ada riwayat tutup buku untuk periode ini.
									</td>
								</tr>
							) : (
								closingsList.map((closing: any, idx: number) => {
									const diff = Number(closing.difference || 0);
									const isConfirmed = closing.is_confirmed === true;

									return (
										<tr key={closing.id} className="hover:bg-gray-50">
											<td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
												{(page - 1) * 31 + idx + 1}
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">
												<div className="flex items-center gap-2">
													<Calendar className="h-4 w-4 text-gray-400" />
													{formatDate(closing.closing_date)}
												</div>
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-sm text-right font-semibold tabular-nums text-gray-900">
												{formatCurrency(
													Number(closing.physical_cash_amount || 0),
												)}
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-sm text-right font-semibold tabular-nums text-gray-900">
												{formatCurrency(
													Number(closing.system_cash_amount || 0),
												)}
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-sm text-right">
												<span
													className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
														diff === 0 ? "text-green-600" : "text-amber-600"
													}`}
												>
													{diff === 0 ? (
														<CheckCircle2 className="h-4 w-4" />
													) : (
														<AlertTriangle className="h-4 w-4" />
													)}
													{formatCurrency(diff)}
												</span>
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-sm">
												{isConfirmed ? (
													<Badge variant="success">
														<Lock className="h-3 w-3 mr-1" />
														Dikonfirmasi
													</Badge>
												) : (
													<Badge variant="warning">
														<Clock className="h-3 w-3 mr-1" />
														Menunggu
													</Badge>
												)}
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500 pr-6">
												{closing.closed_by?.full_name || "-"}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{meta && meta.total_pages > 1 && (
					<div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
						<div className="flex flex-1 justify-between sm:hidden">
							<Button
								variant="secondary"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
							>
								Previous
							</Button>
							<Button
								variant="secondary"
								onClick={() => setPage((p) => p + 1)}
								disabled={page >= meta.total_pages}
							>
								Next
							</Button>
						</div>
						<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
							<div>
								<p className="text-sm text-gray-700">
									Menampilkan{" "}
									<span className="font-medium">{(page - 1) * 31 + 1}</span>{" "}
									sampai{" "}
									<span className="font-medium">
										{Math.min(page * 31, meta.total_items)}
									</span>{" "}
									dari <span className="font-medium">{meta.total_items}</span>{" "}
									data
								</p>
							</div>
							<div>
								<nav
									className="isolate inline-flex -space-x-px rounded-md shadow-sm"
									aria-label="Pagination"
								>
									<button
										type="button"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page === 1}
										className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
									>
										<span className="sr-only">Previous</span>
										<ChevronRight
											className="h-5 w-5 rotate-180"
											aria-hidden="true"
										/>
									</button>
									<span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
										{page}
									</span>
									<button
										type="button"
										onClick={() => setPage((p) => p + 1)}
										disabled={page >= meta.total_pages}
										className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
									>
										<span className="sr-only">Next</span>
										<ChevronRight className="h-5 w-5" aria-hidden="true" />
									</button>
								</nav>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
