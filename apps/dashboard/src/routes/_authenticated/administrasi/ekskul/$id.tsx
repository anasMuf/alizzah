import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	ChevronRight,
	Download,
	Loader2,
	Search,
	UserCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { customInstance } from "#/api/mutator/custom-instance";
import { buildAcademicYearMonths } from "#/components/molecules/BillingMonthsDialog";
import { Badge, Button, EmptyState, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import {
	downloadExcel,
	type ExcelSheet,
	formatDateId,
	formatGender,
	formatStatus,
} from "#/utils/excel";

const MONTH_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Agu",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

const monthLabel = (m: { month: number; year: number }) =>
	`${MONTH_SHORT[m.month - 1] ?? m.month} ${m.year}`;

/** Urutan bulan sebagai angka unik (tahun*12 + bulan) untuk membandingkan rentang. */
const monthIndex = (m?: { month: number; year: number }) =>
	m ? m.year * 12 + m.month : Number.NEGATIVE_INFINITY;

/**
 * Mengurai rentang dari URL, tetapi hanya jika ada di daftar bulan tahun ajaran
 * aktif — mencegah param basi (mis. dari tahun ajaran sebelumnya) menghasilkan
 * select kosong / rentang di luar TA.
 */
const parseRange = (
	ayMonths: { month: number; year: number }[],
	month?: string,
	year?: string,
): { month: number; year: number } | undefined => {
	if (!month || !year) return undefined;
	const m = { month: Number(month), year: Number(year) };
	return ayMonths.some((am) => am.month === m.month && am.year === m.year)
		? m
		: undefined;
};

export const Route = createFileRoute("/_authenticated/administrasi/ekskul/$id")(
	{
		component: EkskulDetailPage,
		validateSearch: (params: Record<string, unknown>) => ({
			search: typeof params.search === "string" ? params.search : undefined,
			level: typeof params.level === "string" ? params.level : undefined,
			class_group:
				typeof params.class_group === "string" ? params.class_group : undefined,
			month_from:
				typeof params.month_from === "string" ? params.month_from : undefined,
			year_from:
				typeof params.year_from === "string" ? params.year_from : undefined,
			month_to:
				typeof params.month_to === "string" ? params.month_to : undefined,
			year_to: typeof params.year_to === "string" ? params.year_to : undefined,
		}),
	},
);

function EkskulDetailPage() {
	const { id } = Route.useParams();
	const { addToast } = useToast();
	const navigate = useNavigate();
	const [activeAy] = useAtom(academicYearAtom);
	const searchParams = Route.useSearch();

	const search = searchParams.search ?? "";
	const levelFilter = searchParams.level ?? "";
	const classGroupFilter = searchParams.class_group ?? "";
	const monthFrom = searchParams.month_from ?? "";
	const yearFrom = searchParams.year_from ?? "";
	const monthTo = searchParams.month_to ?? "";
	const yearTo = searchParams.year_to ?? "";

	// Bulan-bulan tahun ajaran aktif (Jul..Jun) — untuk filter periode tagihan
	const ayMonths = useMemo(
		() => buildAcademicYearMonths(activeAy?.start_date, activeAy?.end_date),
		[activeAy],
	);

	// Rentang efektif: default bulan pertama s.d. akhir tahun ajaran; nilai URL
	// hanya dipakai bila masih valid untuk tahun ajaran aktif (parseRange).
	const rangeFrom = useMemo(
		() => parseRange(ayMonths, monthFrom, yearFrom) ?? ayMonths[0],
		[ayMonths, monthFrom, yearFrom],
	);
	const rangeTo = useMemo(
		() =>
			parseRange(ayMonths, monthTo, yearTo) ?? ayMonths[ayMonths.length - 1],
		[ayMonths, monthTo, yearTo],
	);

	// Opsi bulan dibatasi agar "Dari" selalu <= "Sampai" (cegah rentang invalid)
	const fromOptions = useMemo(
		() => ayMonths.filter((m) => monthIndex(m) <= monthIndex(rangeTo)),
		[ayMonths, rangeTo],
	);
	const toOptions = useMemo(
		() => ayMonths.filter((m) => monthIndex(m) >= monthIndex(rangeFrom)),
		[ayMonths, rangeFrom],
	);

	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [exporting, setExporting] = useState(false);

	// Sync filters to URL
	const updateSearch = useCallback(
		(updates: Record<string, unknown>) => {
			navigate({
				from: Route.fullPath,
				search: { ...searchParams, ...updates } as typeof searchParams,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	// Fetch data
	useEffect(() => {
		if (!activeAy?.id) return;
		const params = new URLSearchParams({
			academic_year_id: String(activeAy.id),
		});
		if (rangeFrom) {
			params.set("month_from", String(rangeFrom.month));
			params.set("year_from", String(rangeFrom.year));
		}
		if (rangeTo) {
			params.set("month_to", String(rangeTo.month));
			params.set("year_to", String(rangeTo.year));
		}
		setLoading(true);
		customInstance<any>(
			`/v1/extracurriculars/${id}/students?${params.toString()}`,
		)
			.then((res: any) => setData(res.data?.data))
			.catch((err: any) => setError(err.message ?? "Gagal memuat data"))
			.finally(() => setLoading(false));
	}, [activeAy?.id, id, rangeFrom, rangeTo]);

	const pasta = data;
	const allStudents: any[] = pasta?.students ?? [];

	// Derive unique levels and rombels; rombel options depent on selected level
	const { uniqueLevels, rombelOptions } = useMemo(() => {
		const levels = new Set<string>();
		// Map: level → set of rombel names
		const rombelsByLevel = new Map<string, Set<string>>();
		const allRombels = new Set<string>();

		for (const s of allStudents) {
			const lv = s.class_group_level;
			const cg = s.class_group_name;
			if (lv) levels.add(lv);
			if (cg) {
				allRombels.add(cg);
				if (lv) {
					if (!rombelsByLevel.has(lv)) rombelsByLevel.set(lv, new Set());
					rombelsByLevel.get(lv)!.add(cg);
				}
			}
		}

		// If level is selected, only show rombels of that level
		const rombels = levelFilter
			? [...(rombelsByLevel.get(levelFilter) ?? [])].sort()
			: [...allRombels].sort();

		return {
			uniqueLevels: [...levels].sort(),
			rombelOptions: rombels,
		};
	}, [allStudents, levelFilter]);

	const filtered = useMemo(() => {
		let result = allStudents;

		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter(
				(s: any) =>
					s.full_name?.toLowerCase().includes(q) ||
					s.class_group_name?.toLowerCase().includes(q),
			);
		}

		if (levelFilter) {
			result = result.filter((s: any) => s.class_group_level === levelFilter);
		}

		if (classGroupFilter) {
			result = result.filter(
				(s: any) => s.class_group_name === classGroupFilter,
			);
		}

		return result;
	}, [allStudents, search, levelFilter, classGroupFilter]);

	const getStatusBadge = (status: string) => {
		switch (status.toLowerCase()) {
			case "active":
				return <Badge variant="success">Aktif</Badge>;
			case "graduated":
				return <Badge variant="primary">Lulus</Badge>;
			case "transferred":
				return <Badge variant="warning">Pindah</Badge>;
			case "dropped":
				return <Badge variant="danger">Keluar</Badge>;
			default:
				return <Badge variant="secondary">{status}</Badge>;
		}
	};

	const handleExport = async () => {
		setExporting(true);
		try {
			const columns = [
				{ header: "No", key: "_no", width: 5 },
				{ header: "Nama Lengkap", key: "full_name", width: 30 },
				{
					header: "Jenis Kelamin",
					key: "gender",
					width: 15,
					format: formatGender,
				},
				{ header: "Tempat Lahir", key: "birth_place", width: 20 },
				{
					header: "Tanggal Lahir",
					key: "birth_date",
					width: 20,
					format: formatDateId,
				},
				{ header: "Jenjang", key: "class_group_level", width: 12 },
				{ header: "Rombel", key: "class_group_name", width: 20 },
				{ header: "Status", key: "status", width: 15, format: formatStatus },
			];

			const rows = filtered.map((s: any, i: number) => ({
				...s,
				_no: i + 1,
			}));

			const sheets: ExcelSheet[] = [
				{ name: pasta?.extracurricular_name ?? "Pasta", columns, data: rows },
			];

			const safeName = (pasta?.extracurricular_name ?? "Pasta").replace(
				/\s+/g,
				"-",
			);
			const periodSuffix =
				rangeFrom && rangeTo
					? `_${monthLabel(rangeFrom).replace(/\s+/g, "-")}-${monthLabel(
							rangeTo,
						).replace(/\s+/g, "-")}`
					: "";
			await downloadExcel(sheets, `Pasta-${safeName}${periodSuffix}`);

			addToast({
				variant: "success",
				title: "Berhasil",
				message: `Data ${rows.length} siswa berhasil diexport.`,
			});
		} catch (err: any) {
			addToast({
				variant: "error",
				title: "Gagal Export",
				message: err.message ?? "Terjadi kesalahan.",
			});
		} finally {
			setExporting(false);
		}
	};

	if (!activeAy?.id) {
		return <EmptyState title="Pilih tahun ajaran terlebih dahulu" />;
	}

	if (loading) {
		return (
			<div className="bg-white rounded-xl shadow-sm h-64 animate-pulse mt-6" />
		);
	}

	if (error || !pasta) {
		return (
			<div className="bg-red-50 p-4 rounded-md text-red-800 mt-6">
				{error ?? "Data tidak ditemukan."}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/ekskul"
							search={{} as any}
							className="text-gray-400 hover:text-gray-500"
						>
							Administrasi
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight className="h-5 w-5 text-gray-400" />
							<Link
								to="/administrasi/ekskul"
								search={{} as any}
								className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
							>
								Pasta
							</Link>
						</div>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight className="h-5 w-5 text-gray-400" />
							<span className="ml-2 text-sm font-medium text-gray-900">
								{pasta.extracurricular_name}
							</span>
						</div>
					</li>
				</ol>
			</nav>

			{/* Header */}
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						{pasta.extracurricular_name}
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						{allStudents.length} siswa memiliki tagihan • Periode{" "}
						{rangeFrom && rangeTo
							? `${monthLabel(rangeFrom)} – ${monthLabel(rangeTo)}`
							: ""}{" "}
						• Tahun ajaran {activeAy.name}
					</p>
				</div>
				<div className="mt-4 sm:mt-0">
					<Button
						variant="secondary"
						onClick={handleExport}
						disabled={exporting || filtered.length === 0}
					>
						{exporting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}{" "}
						Export
					</Button>
				</div>
			</div>

			{/* Search + Filters */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
					<div className="relative w-full sm:max-w-xs">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search className="h-4 w-4 text-gray-400" />
						</div>
						<input
							type="text"
							className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							placeholder="Cari siswa..."
							value={search}
							onChange={(e) =>
								updateSearch({ search: e.target.value || undefined })
							}
						/>
					</div>
					<div className="flex w-full sm:w-auto flex-wrap gap-3">
						<div className="flex flex-1 items-center gap-1.5 min-w-0 sm:flex-none">
							<span className="whitespace-nowrap text-sm text-gray-500">
								Dari
							</span>
							<select
								className="block w-full sm:w-36 rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
								value={rangeFrom ? `${rangeFrom.month}-${rangeFrom.year}` : ""}
								onChange={(e) => {
									const [mm, yy] = e.target.value.split("-");
									updateSearch({ month_from: mm, year_from: yy });
								}}
								title="Bulan awal periode tagihan"
							>
								{fromOptions.map((m) => (
									<option
										key={`from-${m.month}-${m.year}`}
										value={`${m.month}-${m.year}`}
									>
										{monthLabel(m)}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-1 items-center gap-1.5 min-w-0 sm:flex-none">
							<span className="whitespace-nowrap text-sm text-gray-500">
								Sampai
							</span>
							<select
								className="block w-full sm:w-36 rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
								value={rangeTo ? `${rangeTo.month}-${rangeTo.year}` : ""}
								onChange={(e) => {
									const [mm, yy] = e.target.value.split("-");
									updateSearch({ month_to: mm, year_to: yy });
								}}
								title="Bulan akhir periode tagihan"
							>
								{toOptions.map((m) => (
									<option
										key={`to-${m.month}-${m.year}`}
										value={`${m.month}-${m.year}`}
									>
										{monthLabel(m)}
									</option>
								))}
							</select>
						</div>
						<select
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							value={levelFilter}
							onChange={(e) =>
								updateSearch({
									level: e.target.value || undefined,
									class_group: undefined, // reset rombel when level changes
								})
							}
						>
							<option value="">Semua Jenjang</option>
							{uniqueLevels.map((lv: string) => (
								<option key={lv} value={lv}>
									{lv}
								</option>
							))}
						</select>
						<select
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							value={classGroupFilter}
							onChange={(e) =>
								updateSearch({ class_group: e.target.value || undefined })
							}
						>
							<option value="">Semua Rombel</option>
							{rombelOptions.map((cg: string) => (
								<option key={cg} value={cg}>
									{cg}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Table */}
			{filtered.length === 0 ? (
				<EmptyState
					title={
						search || levelFilter || classGroupFilter
							? "Tidak ada hasil"
							: "Belum ada siswa"
					}
					description={
						search || levelFilter || classGroupFilter
							? "Tidak ada siswa yang cocok dengan filter."
							: "Belum ada siswa yang memiliki tagihan di pasta ini pada periode tersebut."
					}
				/>
			) : (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-300">
							<thead className="bg-gray-50">
								<tr>
									<th className="py-3.5 pl-4 pr-3 sm:pl-6 text-left text-sm font-semibold text-gray-900 w-10">
										No
									</th>
									<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
										Siswa
									</th>
									<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
										Jenjang
									</th>
									<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
										Rombel
									</th>
									<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
										Status
									</th>
									<th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
										<span className="sr-only">Aksi</span>
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white">
								{filtered.map((student: any, idx: number) => (
									<tr key={student.id} className="hover:bg-gray-50">
										<td className="py-4 pl-4 sm:pl-6 text-sm text-gray-500">
											{idx + 1}
										</td>
										<td className="px-3 py-4">
											<div className="flex items-center gap-3">
												<UserCircle className="h-10 w-10 text-gray-300" />
												<div>
													<div className="font-medium text-gray-900">
														{student.full_name}
													</div>
													<div className="text-gray-500 text-xs">
														{student.gender === "L" ? "Laki-laki" : "Perempuan"}
													</div>
												</div>
											</div>
										</td>
										<td className="px-3 py-4 text-sm text-gray-500">
											{student.class_group_level || "-"}
										</td>
										<td className="px-3 py-4 text-sm text-gray-500">
											{student.class_group_name || "-"}
										</td>
										<td className="px-3 py-4 text-sm">
											{getStatusBadge(student.status)}
										</td>
										<td className="py-4 pl-3 pr-4 sm:pr-6 text-right">
											<Link
												to="/administrasi/siswa/$id/profil"
												params={{ id: String(student.id) }}
												className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md text-sm"
											>
												Detail
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
