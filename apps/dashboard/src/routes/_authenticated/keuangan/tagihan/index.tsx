import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Filter, RefreshCw, Search } from "lucide-react";
import { useCallback } from "react";
import { useDebounce } from "use-debounce";
import { useGetV1ClassGroups } from "#/api/endpoints/class-groups/class-groups";
import { useSyncSavingsMandatory } from "#/api/endpoints/invoices/invoice-sync-savings";
import { useGetV1Invoices } from "#/api/endpoints/invoices/invoices";
import { Badge, Button, Pagination, useToast } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/tagihan/")({
	component: TagihanListPage,
	validateSearch: (search: Record<string, unknown>) => {
		const asNum = (v: unknown) =>
			typeof v === "number"
				? v
				: typeof v === "string" && v !== ""
					? Number(v)
					: undefined;
		return {
			search: typeof search.search === "string" ? search.search : undefined,
			type: typeof search.type === "string" ? search.type : undefined,
			status: typeof search.status === "string" ? search.status : undefined,
			class_group_id: asNum(search.class_group_id),
			month: asNum(search.month),
			page: (typeof search.page === "number"
				? search.page
				: typeof search.page === "string"
					? Number.parseInt(search.page, 10) || 1
					: undefined) as number | undefined,
		};
	},
});

function TagihanListPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const { addToast } = useToast();
	const syncMutation = useSyncSavingsMandatory();
	const navigate = useNavigate();

	// Filters from URL search params (survive refresh & navigation)
	const searchParams = Route.useSearch();
	const search = searchParams.search ?? "";
	const type = searchParams.type ?? "";
	const status = searchParams.status ?? "";
	const class_group_id = searchParams.class_group_id;
	const month = searchParams.month;
	const page = searchParams.page ?? 1;

	const [debouncedSearch] = useDebounce(search, 500);

	// Helper to update search params in the URL
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

	// Fetch data
	const { data: invoicesData, isLoading } = useGetV1Invoices(
		{
			page,
			limit: 20,
			academic_year_id: activeAy?.id,
			...(debouncedSearch ? { search: debouncedSearch } : {}),
			...(type ? { type } : {}),
			...(status ? { status } : {}),
			...(class_group_id ? { class_group_id } : {}),
			...(month ? { month } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const { data: classGroupsData } = useGetV1ClassGroups({
		academic_year_id: activeAy?.id,
	});
	const classGroups = (classGroupsData?.data as any)?.data || [];

	const invoices = (invoicesData?.data as any)?.data || [];
	const meta = (invoicesData?.data as any)?.meta;

	const handleReset = () => {
		navigate({
			from: Route.fullPath,
			search: {} as typeof searchParams,
			replace: true,
		});
	};

	const getStatusBadge = (status: string, sisa: number) => {
		if (status === "paid") return <Badge variant="success">● Lunas</Badge>;
		if (status === "unpaid") return <Badge variant="danger">Belum Lunas</Badge>;
		if (status === "partial")
			return (
				<Badge variant="warning">
					⚠ Sebagian (Sisa {formatCurrency(sisa)})
				</Badge>
			);
		return <Badge variant="danger">✗ Belum</Badge>;
	};

	const translateType = (type: string) => {
		const map: Record<string, string> = {
			monthly: "Bulanan",
			registration: "Registrasi Tahunan",
			initial: "Biaya Awal",
			incidental: "Insidental",
		};
		return map[type] || type;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Tagihan Siswa
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Daftar semua tagihan siswa beserta status pembayarannya.
					</p>
				</div>
				<Button
					variant="secondary"
					size="sm"
					disabled={syncMutation.isPending}
					onClick={() => {
						syncMutation.mutate(undefined, {
							onSuccess: (result) => {
								addToast({
									variant: "success",
									title: "Sinkronisasi Tabungan Wajib",
									message: `${result.total_synced} invoice ditambahkan, ${result.total_skipped} dilewati.`,
								});
							},
							onError: (err) => {
								addToast({
									variant: "error",
									title: "Gagal",
									message:
										err instanceof Error ? err.message : "Gagal sinkronisasi.",
								});
							},
						});
					}}
				>
					<RefreshCw
						className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`}
					/>
					{syncMutation.isPending ? "Menyinkronkan..." : "Sync Tabungan Wajib"}
				</Button>
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="w-full sm:w-auto flex-1 min-w-[200px]">
						<label
							htmlFor="search-input"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Pencarian (Nama/NIS)
						</label>
						<div className="relative rounded-md shadow-sm">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<Search className="h-5 w-5 text-gray-400" />
							</div>
							<input
								id="search-input"
								type="text"
								className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								placeholder="Cari siswa..."
								value={search}
								onChange={(e) =>
									updateSearch({ search: e.target.value, page: 1 })
								}
							/>
						</div>
					</div>

					<div className="w-full sm:w-auto">
						<label
							htmlFor="classgroup-select"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Rombel
						</label>
						<select
							id="classgroup-select"
							value={class_group_id ?? ""}
							onChange={(e) =>
								updateSearch({
									class_group_id: e.target.value
										? Number(e.target.value)
										: undefined,
									page: 1,
								})
							}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Rombel</option>
							{classGroups.map((cg: any) => (
								<option key={cg.id} value={cg.id}>
									{cg.name}
								</option>
							))}
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label
							htmlFor="type-select"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Jenis Tagihan
						</label>
						<select
							id="type-select"
							value={type}
							onChange={(e) => updateSearch({ type: e.target.value, page: 1 })}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Jenis</option>
							<option value="monthly">Bulanan</option>
							<option value="registration">Registrasi Tahunan</option>
							<option value="initial">Biaya Awal</option>
							<option value="daycare_initial">Biaya Awal Daycare</option>
							<option value="incidental">Insidental</option>
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label
							htmlFor="status-select"
							className="block text-sm font-medium leading-6 text-gray-900 mb-1"
						>
							Status
						</label>
						<select
							id="status-select"
							value={status}
							onChange={(e) =>
								updateSearch({ status: e.target.value, page: 1 })
							}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Status</option>
							<option value="unpaid">Belum Lunas (Penuh & Sebagian)</option>
							<option value="paid">Lunas</option>
						</select>
					</div>

					<div className="w-full sm:w-auto">
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Bulan
						</label>
						<select
							value={month ?? ""}
							onChange={(e) =>
								updateSearch({
									month: e.target.value ? Number(e.target.value) : undefined,
									page: 1,
								})
							}
							className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Bulan</option>
							{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
								<option key={m} value={m}>
									Bulan {m}
								</option>
							))}
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

			{/* Table */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-300">
						<thead className="bg-gray-50">
							<tr>
								<th
									scope="col"
									className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-16"
								>
									#
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Nama Siswa
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Jenis
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Periode
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Status & Sisa
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
										colSpan={6}
										className="px-3 py-8 text-center text-sm text-gray-500"
									>
										Memuat data tagihan...
									</td>
								</tr>
							) : invoices.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="px-3 py-12 text-center text-sm text-gray-500"
									>
										Belum ada tagihan yang sesuai dengan filter.
									</td>
								</tr>
							) : (
								invoices.map((invoice: any, index: number) => {
									const sisa =
										Number(invoice.total_amount) - Number(invoice.paid_amount);
									const periodeStr =
										invoice.month && invoice.year
											? `Bulan ${invoice.month} / ${invoice.year}`
											: invoice.academic_year?.name || "-";

									return (
										<tr key={invoice.id} className="hover:bg-gray-50 group">
											<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
												{(page - 1) * 20 + index + 1}
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
												<Link
													to="/keuangan/tagihan/siswa/$id"
													params={{ id: invoice.student?.id.toString() }}
													className="font-semibold text-indigo-600 hover:text-indigo-900"
												>
													{invoice.student?.full_name}
												</Link>
												<div className="text-xs text-gray-500 mt-1">
													{invoice.student?.active_enrollment?.class_group
														?.name || "Tanpa Rombel"}
												</div>
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
												{translateType(invoice.type)}
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
												{periodeStr}
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
												<div className="flex flex-col gap-1 items-start">
													{getStatusBadge(invoice.status, sisa)}
													<span className="text-xs text-gray-500">
														Total:{" "}
														{formatCurrency(Number(invoice.total_amount))}
													</span>
												</div>
											</td>
											<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
												<Link
													to="/keuangan/tagihan/$id"
													params={{ id: invoice.id.toString() }}
													className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
												>
													Detail <ChevronRight className="w-4 h-4 ml-1" />
												</Link>
											</td>
										</tr>
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
