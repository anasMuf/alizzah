import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Filter,
	Loader2,
	Plus,
	RotateCcw,
	Search,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
import {
	getGetV1ExpensesQueryKey,
	getV1Expenses,
	useDeleteV1ExpensesId,
} from "#/api/endpoints/expenses/expenses";
import type { GetV1ExpensesParams } from "#/api/model";
import {
	Alert,
	Button,
	ConfirmDialog,
	EmptyState,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import {
	formatCurrency,
	formatDate,
	formatDateTime,
} from "../../../../utils/format";

const EXPENSE_SORT_STORAGE_KEY = "alizzah_expense_sort";

export const Route = createFileRoute("/_authenticated/keuangan/pengeluaran/")({
	component: PengeluaranListPage,
	validateSearch: (search: Record<string, unknown>) => ({
		search: typeof search.search === "string" ? search.search : undefined,
		category_id:
			typeof search.category_id === "string" ? search.category_id : undefined,
		date_from:
			typeof search.date_from === "string" ? search.date_from : undefined,
		date_to: typeof search.date_to === "string" ? search.date_to : undefined,
		sort_by: typeof search.sort_by === "string" ? search.sort_by : undefined,
		sort_dir: typeof search.sort_dir === "string" ? search.sort_dir : undefined,
	}),
});

interface SortRule {
	field: string;
	dir: "asc" | "desc";
}

function SortHeaderCell({
	field,
	label,
	sortRules,
	onSort,
	align = "left",
	className = "",
}: {
	field: string;
	label: string;
	sortRules: SortRule[];
	onSort: (field: string) => void;
	align?: "left" | "right";
	className?: string;
}) {
	const index = sortRules.findIndex((s) => s.field === field);
	const activeRule = index !== -1 ? sortRules[index] : undefined;
	const isMulti = sortRules.length > 1;

	return (
		<th
			scope="col"
			onClick={() => onSort(field)}
			className={`py-2.5 px-2 text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors select-none group/col ${
				align === "right" ? "text-right" : "text-left"
			} ${className}`}
		>
			<div
				className={`flex items-center gap-1.5 ${
					align === "right" ? "justify-end" : "justify-start"
				}`}
			>
				<span>{label}</span>
				<div className="flex items-center gap-0.5">
					{activeRule ? (
						<>
							{activeRule.dir === "asc" ? (
								<ArrowUp className="w-3.5 h-3.5 text-indigo-600 font-bold" />
							) : (
								<ArrowDown className="w-3.5 h-3.5 text-indigo-600 font-bold" />
							)}
							{isMulti && (
								<span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
									{index + 1}
								</span>
							)}
						</>
					) : (
						<ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-40 group-hover/col:opacity-100 transition-opacity" />
					)}
				</div>
			</div>
		</th>
	);
}

function PengeluaranListPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [deletingItem, setDeletingItem] = useState<any>(null);

	const searchParams = Route.useSearch();
	const search = searchParams.search ?? "";
	const category_id = searchParams.category_id ?? "";
	const date_from = searchParams.date_from ?? "";
	const date_to = searchParams.date_to ?? "";
	const sort_by = searchParams.sort_by;
	const sort_dir = searchParams.sort_dir;

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

	// Parse multi-sort rules from query params
	const sortRules: SortRule[] = useMemo(() => {
		if (!sort_by) return [];
		const fields = sort_by.split(",");
		const dirs = (sort_dir || "").split(",");
		return fields
			.map((field, idx) => ({
				field: field.trim(),
				dir: (dirs[idx]?.trim() === "asc" ? "asc" : "desc") as "asc" | "desc",
			}))
			.filter((s) => s.field.length > 0);
	}, [sort_by, sort_dir]);

	// Initialize sort from localStorage if not present in URL
	useEffect(() => {
		if (!searchParams.sort_by && !searchParams.sort_dir) {
			try {
				const saved = localStorage.getItem(EXPENSE_SORT_STORAGE_KEY);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0) {
						const nextSortBy = parsed.map((s: any) => s.field).join(",");
						const nextSortDir = parsed
							.map((s: any) => s.dir || "desc")
							.join(",");
						updateSearch({
							sort_by: nextSortBy,
							sort_dir: nextSortDir,
						});
					} else if (parsed.sort_by) {
						updateSearch({
							sort_by: parsed.sort_by,
							sort_dir: parsed.sort_dir || "desc",
						});
					}
				}
			} catch (e) {
				console.error("Failed to read sort preference from localStorage", e);
			}
		}
	}, [searchParams.sort_by, searchParams.sort_dir, updateSearch]);

	const handleSort = (field: string) => {
		const existingIndex = sortRules.findIndex((s) => s.field === field);
		let nextRules: SortRule[];

		if (existingIndex === -1) {
			// Append new sort rule
			nextRules = [...sortRules, { field, dir: "desc" }];
		} else if (sortRules[existingIndex].dir === "desc") {
			// Switch to asc
			nextRules = sortRules.map((s, idx) =>
				idx === existingIndex ? { ...s, dir: "asc" as const } : s,
			);
		} else {
			// Remove from sort list
			nextRules = sortRules.filter((_, idx) => idx !== existingIndex);
		}

		const nextSortBy =
			nextRules.length > 0
				? nextRules.map((s) => s.field).join(",")
				: undefined;
		const nextSortDir =
			nextRules.length > 0 ? nextRules.map((s) => s.dir).join(",") : undefined;

		if (nextRules.length > 0) {
			try {
				localStorage.setItem(
					EXPENSE_SORT_STORAGE_KEY,
					JSON.stringify(nextRules),
				);
			} catch (e) {
				console.error("Failed to save sort preference to localStorage", e);
			}
		} else {
			try {
				localStorage.removeItem(EXPENSE_SORT_STORAGE_KEY);
			} catch (e) {
				console.error("Failed to remove sort preference from localStorage", e);
			}
		}

		updateSearch({
			sort_by: nextSortBy,
			sort_dir: nextSortDir,
		});
	};

	const handleResetSort = () => {
		try {
			localStorage.removeItem(EXPENSE_SORT_STORAGE_KEY);
		} catch (e) {
			console.error("Failed to remove sort preference from localStorage", e);
		}
		updateSearch({
			sort_by: undefined,
			sort_dir: undefined,
		});
	};

	// Build query params (without page — handled by pageParam)
	const queryParams: GetV1ExpensesParams & {
		sort_by?: string;
		sort_dir?: string;
	} = useMemo(
		() => ({
			limit: 20,
			academic_year_id: activeAy?.id,
			...(category_id ? { expense_category_id: Number(category_id) } : {}),
			...(date_from ? { start_date: date_from } : {}),
			...(date_to ? { end_date: date_to } : {}),
			...(sort_by ? { sort_by, sort_dir: sort_dir || "desc" } : {}),
		}),
		[activeAy?.id, category_id, date_from, date_to, sort_by, sort_dir],
	);

	const {
		data: infiniteData,
		isLoading,
		isError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: getGetV1ExpensesQueryKey(queryParams as any),
		queryFn: ({ pageParam, signal }) =>
			getV1Expenses({ ...queryParams, page: pageParam } as any, { signal }),
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

	const { data: categoriesData } = useGetV1ExpenseCategories();
	const categories: any[] = (categoriesData?.data as any)?.data || [];

	// Flatten all pages into a single array
	const expenses: any[] = useMemo(() => {
		if (!infiniteData?.pages) return [];
		return infiniteData.pages.flatMap(
			(page) => ((page.data as any)?.data as any[]) || [],
		);
	}, [infiniteData]);

	const meta = (infiniteData?.pages?.[0]?.data as any)?.meta;

	const filteredExpenses = useMemo(() => {
		if (!search) return expenses;
		const q = search.toLowerCase();
		return expenses.filter((e: any) =>
			e.description?.toLowerCase().includes(q),
		);
	}, [expenses, search]);

	const totalAmount = useMemo(() => {
		return filteredExpenses.reduce(
			(sum: number, e: any) => sum + Number(e.amount || 0),
			0,
		);
	}, [filteredExpenses]);

	// Intersection Observer: trigger fetchNextPage when sentinel is visible.
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

	const handleReset = () => {
		try {
			localStorage.removeItem(EXPENSE_SORT_STORAGE_KEY);
		} catch (e) {
			console.error("Failed to remove sort preference from localStorage", e);
		}
		navigate({
			from: Route.fullPath,
			search: {} as typeof searchParams,
			replace: true,
		});
	};

	const deleteMutation = useDeleteV1ExpensesId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pengeluaran berhasil dihapus.",
				});
				queryClient.invalidateQueries({ queryKey: ["/v1/expenses"] });
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

	const getCategoryLabel = (expense: any) => {
		const cat = expense.category;
		if (!cat) return "-";
		if (cat.parent_name) {
			return `${cat.parent_name} > ${cat.name}`;
		}
		return cat.name;
	};

	const getSortLabel = (field?: string) => {
		switch (field) {
			case "expense_date":
				return "Tanggal Transaksi";
			case "created_at":
				return "Tanggal Input";
			case "category":
				return "Kategori";
			case "amount":
				return "Nominal";
			default:
				return field || "";
		}
	};

	return (
		<>
			<div className="space-y-6">
				<div className="sm:flex sm:items-center sm:justify-between">
					<div>
						<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
							Pengeluaran
						</h2>
						<p className="mt-1 text-sm text-gray-500">
							Daftar semua pengeluaran operasional sekolah.
						</p>
					</div>
					<div className="mt-4 sm:mt-0">
						<Link to="/keuangan/pengeluaran/baru">
							<Button variant="primary">
								<Plus className="w-4 h-4 mr-2" />
								Catat Pengeluaran
							</Button>
						</Link>
					</div>
				</div>

				<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
					<div className="flex flex-wrap gap-4 items-end">
						<div className="w-full sm:w-auto flex-1 min-w-[200px]">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
								Pencarian (Keterangan)
							</label>
							<div className="relative rounded-md shadow-sm">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<Search className="h-5 w-5 text-gray-400" />
								</div>
								<input
									type="text"
									className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
									placeholder="Cari keterangan..."
									value={search}
									onChange={(e) => updateSearch({ search: e.target.value })}
								/>
							</div>
						</div>

						<div className="w-full sm:w-auto">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
								Kategori
							</label>
							<select
								value={category_id}
								onChange={(e) => {
									updateSearch({ category_id: e.target.value });
								}}
								className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							>
								<option value="">Semua Kategori</option>
								{categories.map((parent: any) => (
									<optgroup key={parent.id} label={parent.name}>
										{parent.children?.map((child: any) => (
											<option key={child.id} value={child.id}>
												{parent.name} &gt; {child.name}
											</option>
										))}
									</optgroup>
								))}
							</select>
						</div>

						<div className="w-full sm:w-auto">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
								Dari Tanggal
							</label>
							<input
								type="date"
								value={date_from}
								onChange={(e) => {
									updateSearch({ date_from: e.target.value });
								}}
								className="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							/>
						</div>

						<div className="w-full sm:w-auto">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
								Sampai Tanggal
							</label>
							<input
								type="date"
								value={date_to}
								onChange={(e) => {
									updateSearch({ date_to: e.target.value });
								}}
								className="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							/>
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

				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<p className="text-sm text-gray-500">
								Total Pengeluaran Periode Ini
							</p>
							<p className="text-2xl font-bold text-gray-900">
								{formatCurrency(totalAmount)}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							{sortRules.length > 0 && (
								<div className="flex flex-wrap items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm">
									<span className="font-medium text-gray-600">Urutan:</span>
									{sortRules.map((rule, idx) => (
										<span
											key={rule.field}
											className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded text-xs font-medium"
										>
											{sortRules.length > 1 && (
												<span className="text-[10px] text-indigo-600 font-bold font-mono">
													#{idx + 1}
												</span>
											)}
											{getSortLabel(rule.field)}
											{rule.dir === "asc" ? "🔼" : "🔽"}
										</span>
									))}
									<button
										type="button"
										onClick={handleResetSort}
										className="text-indigo-600 hover:text-indigo-900 font-medium inline-flex items-center gap-1 ml-1 hover:underline"
										title="Reset semua urutan"
									>
										<RotateCcw className="w-3 h-3" />
										Reset
									</button>
								</div>
							)}
							<div className="text-sm text-gray-500">
								{meta
									? `${meta.total ?? expenses.length} transaksi`
									: `${filteredExpenses.length} transaksi`}
							</div>
						</div>
					</div>
				</div>

				{isError ? (
					<Alert variant="error" title="Gagal Memuat Data">
						Terjadi kesalahan saat memuat data pengeluaran. Silakan coba lagi.
					</Alert>
				) : (
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th
											scope="col"
											className="py-2.5 pl-4 pr-2 text-left text-xs font-semibold text-gray-900 sm:pl-6 w-10"
										>
											#
										</th>
										<SortHeaderCell
											field="expense_date"
											label="Tanggal Transaksi"
											sortRules={sortRules}
											onSort={handleSort}
										/>
										<SortHeaderCell
											field="created_at"
											label="Tanggal Input"
											sortRules={sortRules}
											onSort={handleSort}
										/>
										<SortHeaderCell
											field="category"
											label="Kategori"
											sortRules={sortRules}
											onSort={handleSort}
										/>
										<SortHeaderCell
											field="amount"
											label="Nominal"
											sortRules={sortRules}
											onSort={handleSort}
											align="right"
										/>
										<th
											scope="col"
											className="relative py-2.5 pl-2 pr-4 sm:pr-6"
										>
											<span className="sr-only">Aksi</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{isLoading ? (
										Array.from({ length: 5 }).map((_, i) => (
											<tr key={i}>
												<td className="py-2 pl-4 pr-2 sm:pl-6">
													<div className="h-3.5 w-5 bg-gray-200 rounded animate-pulse" />
												</td>
												<td className="px-2 py-2">
													<div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse" />
												</td>
												<td className="px-2 py-2">
													<div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse" />
												</td>
												<td className="px-2 py-2">
													<div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
												</td>
												<td className="px-2 py-2 text-right">
													<div className="h-3.5 w-20 bg-gray-200 rounded animate-pulse ml-auto" />
												</td>
												<td className="py-2 pl-2 pr-4 sm:pr-6">
													<div className="h-3.5 w-10 bg-gray-200 rounded animate-pulse ml-auto" />
												</td>
											</tr>
										))
									) : filteredExpenses.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-3 py-12">
												{hasNextPage && expenses.length === 0 ? (
													<EmptyState
														title="Belum Ada Data"
														description="Data belum selesai dimuat. Gulir ke bawah atau tunggu sebentar."
													/>
												) : hasNextPage && expenses.length > 0 ? (
													<div className="text-center">
														<p className="text-sm text-gray-500">
															Tidak ada hasil di {expenses.length} data yang
															sudah dimuat.
														</p>
														<p className="text-xs text-gray-400 mt-1">
															Gulir ke bawah untuk memuat lebih banyak data,
															atau persempit filter.
														</p>
													</div>
												) : (
													<EmptyState
														title="Belum Ada Pengeluaran"
														description="Belum ada data pengeluaran yang sesuai dengan filter."
														action={
															<Link to="/keuangan/pengeluaran/baru">
																<Button variant="primary" size="sm">
																	<Plus className="w-4 h-4 mr-1" />
																	Catat Pengeluaran Baru
																</Button>
															</Link>
														}
													/>
												)}
											</td>
										</tr>
									) : (
										filteredExpenses.map((expense: any, index: number) => (
											<tr key={expense.id} className="hover:bg-gray-50 group">
												<td className="whitespace-nowrap py-2 pl-4 pr-2 text-sm font-medium text-gray-900 sm:pl-6">
													{index + 1}
												</td>
												<td className="whitespace-nowrap px-2 py-2 text-sm text-gray-700">
													{formatDate(expense.expense_date)}
												</td>
												<td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">
													{formatDateTime(expense.created_at)}
												</td>
												<td className="px-2 py-2 text-sm text-gray-900">
													{getCategoryLabel(expense)}
													{expense.description && (
														<div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
															{expense.description}
														</div>
													)}
												</td>
												<td className="whitespace-nowrap px-2 py-2 text-sm font-semibold text-gray-900 text-right">
													{formatCurrency(Number(expense.amount))}
												</td>
												<td className="relative whitespace-nowrap py-2 pl-2 pr-4 text-right text-sm font-medium sm:pr-6">
													<div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
														<Link
															to="/keuangan/pengeluaran/$id"
															params={{ id: String(expense.id) }}
															className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
														>
															Detail
														</Link>
														<button
															type="button"
															onClick={() => setDeletingItem(expense)}
															className="text-xs font-medium text-rose-600 hover:text-rose-800 flex items-center"
														>
															<Trash2 className="w-3 h-3 mr-0.5" /> Hapus
														</button>
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
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
							{!hasNextPage && expenses.length > 0 && !isLoading && (
								<p className="text-sm text-gray-400">
									Semua data telah dimuat.
								</p>
							)}
						</div>
					</div>
				)}
			</div>

			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() => {
					if (deletingItem) deleteMutation.mutate({ id: deletingItem.id });
				}}
				title="Hapus Pengeluaran"
				variant="danger"
				confirmLabel="Hapus"
			>
				<p>
					Apakah Anda yakin ingin menghapus pengeluaran{" "}
					<strong>{deletingItem?.description}</strong> sebesar{" "}
					<strong>{formatCurrency(Number(deletingItem?.amount))}</strong>?
				</p>
			</ConfirmDialog>
		</>
	);
}
