import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	ChevronDown,
	ChevronRight,
	Filter,
	Plus,
	Receipt,
	Search,
} from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useGetV1ClassGroups } from "#/api/endpoints/class-groups/class-groups";
import { useGetV1Payments } from "#/api/endpoints/payments/payments";
import type { DtoPaymentListResponse } from "#/api/model/dtoPaymentListResponse";
import { buildAcademicYearMonths } from "#/components/molecules/BillingMonthsDialog";
import { Badge, Button, Pagination } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import { extractListData, extractMeta } from "../../../../utils/api-helpers";
import {
	formatCurrency,
	formatDate,
	formatDateTime,
} from "../../../../utils/format";

const MONTH_NAMES = [
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

/** Daftar kategori item yang dikenal — label untuk filter & tampilan rincian. */
const CATEGORY_LABELS: Record<string, string> = {
	monthly_spp: "SPP",
	monthly_infaq: "Infaq Harian",
	pasta: "PASTA (Ekskul)",
	facility: "Fasilitas",
	initial: "Biaya Awal",
	registration: "Registrasi",
	daycare: "Daycare / SPD",
	daycare_meal: "Makan Daycare",
	dispensation: "Dispensasi",
	savings_mandatory: "Tabungan Wajib",
	incidental: "Insidental",
	graduation: "Perpisahan",
	calisan: "Calisan",
	ekskul: "Ekskul",
};

const categoryLabel = (cat?: string) =>
	(cat && CATEGORY_LABELS[cat]) || cat || "Item";

const periodeLabel = (month?: number, year?: number) =>
	month && year ? `${MONTH_NAMES[month - 1] ?? month} ${year}` : "";

export const Route = createFileRoute("/_authenticated/keuangan/pembayaran/")({
	component: PembayaranListPage,
	validateSearch: (search: Record<string, unknown>) => ({
		source: typeof search.source === "string" ? search.source : undefined,
		start_date:
			typeof search.start_date === "string" ? search.start_date : undefined,
		end_date: typeof search.end_date === "string" ? search.end_date : undefined,
		search: typeof search.search === "string" ? search.search : undefined,
		level: typeof search.level === "string" ? search.level : undefined,
		class_group_id:
			typeof search.class_group_id === "string"
				? search.class_group_id
				: typeof search.class_group_id === "number"
					? String(search.class_group_id)
					: undefined,
		created_by:
			typeof search.created_by === "string"
				? search.created_by
				: typeof search.created_by === "number"
					? String(search.created_by)
					: undefined,
		category: typeof search.category === "string" ? search.category : undefined,
		month: typeof search.month === "string" ? search.month : undefined,
		year: typeof search.year === "string" ? search.year : undefined,
		page: (typeof search.page === "number"
			? search.page
			: typeof search.page === "string"
				? Number.parseInt(search.page, 10) || 1
				: undefined) as number | undefined,
	}),
});

function PembayaranListPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const navigate = useNavigate();

	const searchParams = Route.useSearch();
	const source = searchParams.source ?? "";
	const start_date = searchParams.start_date ?? "";
	const end_date = searchParams.end_date ?? "";
	const search = searchParams.search ?? "";
	const level = searchParams.level ?? "";
	const classGroupId = searchParams.class_group_id ?? "";
	const createdBy = searchParams.created_by ?? "";
	const category = searchParams.category ?? "";
	const month = searchParams.month ?? "";
	const year = searchParams.year ?? "";
	const page = searchParams.page ?? 1;

	const [debouncedSearch] = useDebounce(search, 500);
	const [expandedId, setExpandedId] = useState<number | null>(null);

	const updateSearch = useCallback(
		(updates: Partial<typeof searchParams>) => {
			navigate({
				from: Route.fullPath,
				search: { ...searchParams, ...updates } as typeof searchParams,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	// Opsi jenjang & rombel (filter bergantung jenjang)
	const { data: classGroupsResp } = useGetV1ClassGroups(
		{ academic_year_id: activeAy?.id as any },
		{ query: { enabled: !!activeAy?.id } as any },
	);
	const classGroups = extractListData<{
		id: number;
		name: string;
		level?: string;
	}>(classGroupsResp);
	const levels = useMemo(
		() =>
			[...new Set(classGroups.map((cg) => cg.level).filter(Boolean))].sort(),
		[classGroups],
	);
	const rombelOptions = useMemo(
		() =>
			classGroups
				.filter((cg) => !level || cg.level === level)
				.sort((a, b) => a.name.localeCompare(b.name)),
		[classGroups, level],
	);

	// Bulan-bulan tahun ajaran aktif — untuk filter periode tagihan
	const ayMonths = useMemo(
		() => buildAcademicYearMonths(activeAy?.start_date, activeAy?.end_date),
		[activeAy],
	);

	// Fetch data
	const { data: paymentsData, isLoading } = useGetV1Payments(
		{
			page,
			limit: 20,
			academic_year_id: activeAy?.id,
			...(debouncedSearch ? { search: debouncedSearch } : {}),
			...(source ? { source } : {}),
			...(start_date ? { start_date } : {}),
			...(end_date ? { end_date } : {}),
			...(level ? { level } : {}),
			...(classGroupId ? { class_group_id: Number(classGroupId) } : {}),
			...(createdBy ? { created_by: Number(createdBy) } : {}),
			...(category ? { category } : {}),
			...(month ? { month: Number(month) } : {}),
			...(year ? { year: Number(year) } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const payments = extractListData<DtoPaymentListResponse>(paymentsData);
	const meta = extractMeta(paymentsData);

	// Opsi petugas diambil dari data halaman saat ini (endpoint /users hanya
	// superadmin, sementara halaman ini dipakai kasir juga).
	const petugasOptions = useMemo(() => {
		const map = new Map<number, string>();
		for (const p of payments) {
			if (p.created_by?.id && p.created_by?.full_name) {
				map.set(p.created_by.id, p.created_by.full_name);
			}
		}
		return [...map.entries()].map(([id, name]) => ({ id, name }));
	}, [payments]);

	const handleReset = () => {
		navigate({
			from: Route.fullPath,
			search: {} as typeof searchParams,
			replace: true,
		});
	};

	const getSourceBadge = (source: string) => {
		if (source === "savings")
			return <Badge variant="info">Tabungan Umum</Badge>;
		return <Badge variant="secondary">Uang Tunai (Kas)</Badge>;
	};

	const itemPeriodeSet = (items: any[]) => {
		const keys = new Set<string>();
		for (const it of items) {
			const label = periodeLabel(it.invoice_month, it.invoice_year);
			if (label) keys.add(label);
		}
		return [...keys];
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight flex items-center">
						<Receipt className="w-6 h-6 mr-2 text-gray-400" /> Riwayat
						Pembayaran
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Daftar seluruh transaksi pembayaran yang diterima dari siswa.
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0 flex gap-2">
					<Link
						to="/keuangan/pembayaran/baru"
						search={{ student_id: undefined, invoice_id: undefined }}
					>
						<Button variant="primary">
							<Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
							Catat Pembayaran Baru
						</Button>
					</Link>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="w-full sm:w-auto flex-1 min-w-[200px]">
						<label
							htmlFor="search-input"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Pencarian (Nama)
						</label>
						<div className="relative rounded-md shadow-sm">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<Search className="h-5 w-5 text-gray-400" />
							</div>
							<input
								id="search-input"
								type="text"
								className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								placeholder="Cari nama siswa..."
								value={search}
								onChange={(e) =>
									updateSearch({ search: e.target.value, page: 1 })
								}
							/>
						</div>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Jenjang
						</label>
						<select
							value={level}
							onChange={(e) =>
								updateSearch({
									level: e.target.value || undefined,
									class_group_id: undefined,
									page: 1,
								})
							}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Jenjang</option>
							{levels.map((lv) => (
								<option key={lv} value={lv}>
									{lv}
								</option>
							))}
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Rombel
						</label>
						<select
							value={classGroupId}
							onChange={(e) =>
								updateSearch({
									class_group_id: e.target.value || undefined,
									page: 1,
								})
							}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Rombel</option>
							{rombelOptions.map((cg) => (
								<option key={cg.id} value={String(cg.id)}>
									{cg.name}
								</option>
							))}
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Sumber Dana
						</label>
						<select
							value={source}
							onChange={(e) =>
								updateSearch({ source: e.target.value, page: 1 })
							}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Sumber</option>
							<option value="cash">Uang Tunai (Kas)</option>
							<option value="savings">Tabungan Umum</option>
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Petugas
						</label>
						<select
							value={createdBy}
							onChange={(e) =>
								updateSearch({ created_by: e.target.value, page: 1 })
							}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Petugas</option>
							{petugasOptions.map((u) => (
								<option key={u.id} value={String(u.id)}>
									{u.name}
								</option>
							))}
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Kategori Item
						</label>
						<select
							value={category}
							onChange={(e) =>
								updateSearch({ category: e.target.value, page: 1 })
							}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Kategori</option>
							{Object.entries(CATEGORY_LABELS).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Periode Tagihan
						</label>
						<div className="flex gap-2">
							<select
								value={month}
								onChange={(e) =>
									updateSearch({ month: e.target.value, page: 1 })
								}
								className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							>
								<option value="">Bulan</option>
								{ayMonths.map((m) => (
									<option key={`${m.month}-${m.year}`} value={String(m.month)}>
										{MONTH_NAMES[m.month - 1] ?? m.month}
									</option>
								))}
							</select>
							<select
								value={year}
								onChange={(e) =>
									updateSearch({ year: e.target.value, page: 1 })
								}
								className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							>
								<option value="">Tahun</option>
								{[...new Set(ayMonths.map((m) => m.year))].map((y) => (
									<option key={y} value={String(y)}>
										{y}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Dari Tanggal
						</label>
						<input
							type="date"
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							value={start_date}
							onChange={(e) =>
								updateSearch({ start_date: e.target.value, page: 1 })
							}
						/>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Sampai Tanggal
						</label>
						<input
							type="date"
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							value={end_date}
							onChange={(e) =>
								updateSearch({ end_date: e.target.value, page: 1 })
							}
						/>
					</div>

					<div className="w-full sm:w-auto">
						<Button variant="secondary" onClick={handleReset}>
							<Filter className="w-4 h-4 mr-2" />
							Reset
						</Button>
					</div>
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
									className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
								>
									Tanggal Bayar
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									No. Ref
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Siswa
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Sumber Dana
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Rincian
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Periode Tagihan
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
								>
									Total Bayar
								</th>
								<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span className="sr-only">Aksi</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{isLoading ? (
								<tr>
									<td
										colSpan={8}
										className="px-3 py-8 text-center text-sm text-gray-500"
									>
										Memuat data pembayaran...
									</td>
								</tr>
							) : payments.length === 0 ? (
								<tr>
									<td
										colSpan={8}
										className="px-3 py-12 text-center text-sm text-gray-500"
									>
										Tidak ada transaksi pembayaran yang sesuai dengan filter.
									</td>
								</tr>
							) : (
								payments.map((payment: any) => {
									const items: any[] = payment.items ?? [];
									const isExpanded = expandedId === payment.id;
									const periodes = itemPeriodeSet(items);
									return (
										<Fragment key={payment.id}>
											<tr
												key={payment.id}
												className="hover:bg-gray-50 group cursor-pointer"
												onClick={() =>
													setExpandedId(isExpanded ? null : payment.id)
												}
											>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
													<div className="font-medium text-gray-900">
														{formatDate(payment.payment_date)}
													</div>
													<div className="text-xs text-gray-500 mt-1">
														dicatat {formatDateTime(payment.created_at)}
													</div>
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm">
													<Link
														to="/keuangan/pembayaran/$id"
														params={{ id: payment.id.toString() }}
														onClick={(e) => e.stopPropagation()}
														className="font-mono text-indigo-600 hover:text-indigo-900"
													>
														#{payment.id}
													</Link>
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
													<span className="font-semibold">
														{payment.student?.full_name}
													</span>
													<div className="text-xs text-gray-500 mt-1">
														{payment.student?.active_enrollment?.class_group
															?.name || "Tanpa Rombel"}
														{payment.student?.active_enrollment?.class_group
															?.level
															? ` (${payment.student.active_enrollment.class_group.level})`
															: ""}
													</div>
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{getSourceBadge(payment.source)}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
													<div className="flex items-center gap-1.5">
														<span className="font-medium">{items.length}</span>
														<span className="text-xs text-gray-500">item</span>
														{items.length > 0 && (
															<ChevronDown
																className={`w-4 h-4 text-gray-400 transition-transform ${
																	isExpanded ? "rotate-180" : ""
																}`}
															/>
														)}
													</div>
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{periodes.length > 0 ? periodes.join(", ") : "-"}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-gray-900 text-right">
													{formatCurrency(
														Number(payment.total_amount) +
															Number(payment.savings_deposit || 0),
													)}
												</td>
												<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
													<Link
														to="/keuangan/pembayaran/$id"
														params={{ id: payment.id.toString() }}
														onClick={(e) => e.stopPropagation()}
														className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
													>
														Detail Struk{" "}
														<ChevronRight className="w-4 h-4 ml-1" />
													</Link>
												</td>
											</tr>
											{isExpanded && (
												<tr
													key={`${payment.id}-detail`}
													className="bg-gray-50/70"
												>
													<td colSpan={8} className="px-6 py-4">
														{items.length === 0 ? (
															<p className="text-sm text-gray-500">
																Tidak ada rincian item.
															</p>
														) : (
															<table className="min-w-full">
																<thead>
																	<tr className="text-xs text-gray-500 uppercase tracking-wide">
																		<th className="text-left py-1 pr-3 font-medium">
																			Item
																		</th>
																		<th className="text-left py-1 pr-3 font-medium">
																			Kategori
																		</th>
																		<th className="text-left py-1 pr-3 font-medium">
																			Periode
																		</th>
																		<th className="text-right py-1 font-medium">
																			Jumlah
																		</th>
																	</tr>
																</thead>
																<tbody className="divide-y divide-gray-200">
																	{items.map((it: any, idx: number) => (
																		<tr
																			key={it.invoice_item_id ?? it.id ?? idx}
																		>
																			<td className="py-1.5 pr-3 text-sm text-gray-900">
																				{it.invoice_item_name ||
																					"Pembayaran Tagihan"}
																			</td>
																			<td className="py-1.5 pr-3 text-sm text-gray-500">
																				{categoryLabel(it.category)}
																			</td>
																			<td className="py-1.5 pr-3 text-sm text-gray-500">
																				{periodeLabel(
																					it.invoice_month,
																					it.invoice_year,
																				) || "-"}
																			</td>
																			<td className="py-1.5 text-sm text-gray-900 text-right tabular-nums">
																				{formatCurrency(Number(it.amount))}
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														)}
													</td>
												</tr>
											)}
										</Fragment>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{meta && (
					<Pagination
						page={page}
						limit={20}
						total={meta.total}
						onPageChange={(newPage) => updateSearch({ page: newPage })}
					/>
				)}
			</div>
		</div>
	);
}
