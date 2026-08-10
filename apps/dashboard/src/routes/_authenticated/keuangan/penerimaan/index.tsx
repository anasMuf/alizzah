import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGetV1IncomeCategories } from "#/api/endpoints/income-categories/income-categories";
import {
	getGetV1IncomeTransactionsQueryKey,
	getV1IncomeTransactions,
	useDeleteV1IncomeTransactionsId,
} from "#/api/endpoints/income-transactions/income-transactions";
import type {
	DtoIncomeCategoryResponse,
	GetV1IncomeTransactionsParams,
} from "#/api/model";
import {
	Alert,
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency, formatDate } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/penerimaan/")({
	component: PenerimaanListPage,
	validateSearch: (search: Record<string, unknown>) => ({
		income_category_id:
			typeof search.income_category_id === "number"
				? search.income_category_id
				: typeof search.income_category_id === "string"
					? Number.parseInt(search.income_category_id, 10) || undefined
					: undefined,
		date_from:
			typeof search.date_from === "string" ? search.date_from : undefined,
		date_to: typeof search.date_to === "string" ? search.date_to : undefined,
	}),
});

function PenerimaanListPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const navigate = useNavigate();

	const { data: catResp } = useGetV1IncomeCategories();
	const categories: DtoIncomeCategoryResponse[] =
		((catResp as any)?.data as any)?.data || [];

	const searchParams = Route.useSearch();
	const income_category_id = searchParams.income_category_id;
	const date_from = searchParams.date_from ?? "";
	const date_to = searchParams.date_to ?? "";

	const [deletingItem, setDeletingItem] = useState<any>(null);

	// Sentinel ref for Intersection Observer
	const sentinelRef = useRef<HTMLDivElement>(null);

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

	// Build query params (without page — handled by pageParam)
	const queryParams: GetV1IncomeTransactionsParams = useMemo(
		() => ({
			limit: 20,
			academic_year_id: activeAy?.id,
			...(income_category_id ? { income_category_id } : {}),
			...(date_from ? { start_date: date_from } : {}),
			...(date_to ? { end_date: date_to } : {}),
		}),
		[activeAy?.id, income_category_id, date_from, date_to],
	);

	const {
		data: infiniteData,
		isLoading,
		isError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: getGetV1IncomeTransactionsQueryKey(queryParams),
		queryFn: ({ pageParam, signal }) =>
			getV1IncomeTransactions({ ...queryParams, page: pageParam }, { signal }),
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			const meta = (lastPage.data as any)?.meta;
			if (!meta) return undefined;
			const totalPages = Math.ceil((meta.total ?? 0) / (meta.limit ?? 20));
			const nextPage = (meta.page ?? 1) + 1;
			return nextPage <= totalPages ? nextPage : undefined;
		},
		enabled: !!activeAy?.id,
	});

	// Flatten all pages into a single array
	const items: any[] = useMemo(() => {
		if (!infiniteData?.pages) return [];
		return infiniteData.pages.flatMap(
			(page) => ((page.data as any)?.data as any[]) || [],
		);
	}, [infiniteData]);

	// Intersection Observer: trigger fetchNextPage when sentinel is visible.
	// Values captured in a ref to avoid recreating the observer on every render
	// (e.g. when isFetchingNextPage toggles).
	const scrollState = useRef({
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});
	scrollState.current = { hasNextPage, isFetchingNextPage, fetchNextPage };

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const {
					hasNextPage: has,
					isFetchingNextPage: fetching,
					fetchNextPage: fetchFn,
				} = scrollState.current;
				if (entries[0]?.isIntersecting && has && !fetching) {
					fetchFn();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, []);

	const deleteMutation = useDeleteV1IncomeTransactionsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penerimaan berhasil dihapus.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1IncomeTransactionsQueryKey(),
				});
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/transactions"] });
				setDeletingItem(null);
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menghapus.",
				});
			},
		},
	});

	// Summary across all loaded pages
	const totalAmount = useMemo(() => {
		return items.reduce(
			(sum: number, t: any) => sum + Number(t.amount || 0),
			0,
		);
	}, [items]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Penerimaan Dana Bantuan
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Catat penerimaan dari BOS, donasi, hibah, dan sumber lainnya.
					</p>
				</div>
				<Link to="/keuangan/penerimaan/baru">
					<Button variant="primary">
						<Plus className="w-4 h-4 mr-2" /> Catat Penerimaan
					</Button>
				</Link>
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex flex-wrap gap-4 items-end">
					<div>
						<label className="block text-sm font-medium text-gray-900 mb-1">
							Kategori
						</label>
						<select
							value={income_category_id ?? ""}
							onChange={(e) => {
								const val = e.target.value;
								updateSearch({
									income_category_id: val ? Number(val) : undefined,
								});
							}}
							className="block w-full sm:w-44 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Semua Kategori</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-900 mb-1">
							Dari Tanggal
						</label>
						<input
							type="date"
							value={date_from}
							onChange={(e) => {
								updateSearch({ date_from: e.target.value });
							}}
							className="block w-full sm:w-40 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-900 mb-1">
							Sampai Tanggal
						</label>
						<input
							type="date"
							value={date_to}
							onChange={(e) => {
								updateSearch({ date_to: e.target.value });
							}}
							className="block w-full sm:w-40 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
					{(income_category_id || date_from || date_to) && (
						<button
							type="button"
							onClick={() => {
								navigate({
									from: Route.fullPath,
									search: {} as typeof searchParams,
									replace: true,
								});
							}}
							className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
						>
							Reset Filter
						</button>
					)}
				</div>
			</div>

			{/* Loading / Error */}
			{isLoading && (
				<div className="animate-pulse space-y-3">
					{[1, 2, 3].map((n) => (
						<div key={n} className="h-16 bg-gray-200 rounded-lg" />
					))}
				</div>
			)}
			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat data penerimaan.
				</Alert>
			)}

			{/* Table */}
			{!isLoading &&
				!isError &&
				(items.length === 0 ? (
					<EmptyState
						title="Belum ada data penerimaan"
						description="Mulai catat penerimaan dana bantuan seperti BOS, donasi, atau hibah."
					/>
				) : (
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
											Tanggal
										</th>
										<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
											Kategori
										</th>
										<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
											Sumber / Pengirim
										</th>
										<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
											Ref
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
											Nominal
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
											Aksi
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 bg-white">
									{items.map((item: any) => (
										<tr key={item.id} className="hover:bg-gray-50">
											<td className="py-3 pl-6 pr-3 text-sm text-gray-900 tabular-nums whitespace-nowrap">
												{formatDate(item.transaction_date)}
											</td>
											<td className="px-3 py-3 text-sm">
												<Badge variant="info">
													{item.income_category?.name || "-"}
												</Badge>
											</td>
											<td className="px-3 py-3 text-sm text-gray-900">
												<div>{item.source_name}</div>
												{item.notes && (
													<div className="text-xs text-gray-500 mt-0.5">
														{item.notes}
													</div>
												)}
											</td>
											<td className="px-3 py-3 text-sm text-gray-500">
												{item.reference_number || "-"}
											</td>
											<td className="px-3 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">
												{formatCurrency(Number(item.amount))}
											</td>
											<td className="px-3 py-3 text-right pr-6">
												<div className="flex gap-2 justify-end">
													<Link
														to="/keuangan/penerimaan/$id"
														params={{ id: item.id.toString() }}
														className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
													>
														<Edit className="w-3 h-3 mr-0.5" /> Edit
													</Link>
													<button
														type="button"
														onClick={() => setDeletingItem(item)}
														className="text-xs font-medium text-rose-600 hover:text-rose-800 flex items-center"
													>
														<Trash2 className="w-3 h-3 mr-0.5" /> Hapus
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className="bg-gray-50 border-t-2 border-gray-300">
										<td
											colSpan={4}
											className="py-3 pl-6 text-sm font-bold text-gray-900 text-right"
										>
											Total ({items.length} transaksi)
										</td>
										<td className="py-3 px-3 text-sm text-right font-bold text-gray-900 tabular-nums">
											{formatCurrency(totalAmount)}
										</td>
										<td />
									</tr>
								</tfoot>
							</table>
						</div>

						{/* Infinite scroll sentinel + loading indicator */}
						<div ref={sentinelRef} className="flex justify-center py-4">
							{isFetchingNextPage && (
								<div className="flex items-center gap-2 text-sm text-gray-500">
									<Loader2 className="w-4 h-4 animate-spin" />
									Memuat data...
								</div>
							)}
							{!hasNextPage && items.length > 0 && !isLoading && (
								<p className="text-sm text-gray-400">
									Semua data telah dimuat.
								</p>
							)}
						</div>
					</div>
				))}

			{/* Delete Confirm */}
			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() => {
					if (deletingItem) deleteMutation.mutate({ id: deletingItem.id });
				}}
				title="Hapus Penerimaan"
				variant="danger"
				confirmLabel="Hapus"
			>
				<p>
					Apakah Anda yakin ingin menghapus penerimaan{" "}
					<strong>{deletingItem?.source_name}</strong> senilai{" "}
					<strong>{formatCurrency(Number(deletingItem?.amount))}</strong>?
				</p>
				<p className="mt-2 text-sm text-gray-500">
					Tindakan ini tidak dapat dibatalkan.
				</p>
			</ConfirmDialog>
		</div>
	);
}
