import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	CalendarCheck,
	ClipboardList,
	Cog,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	ShieldCheck,
	ShieldX,
	Trash2,
	UserCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	getGetV1DaycareEnrollmentsQueryKey,
	useGetV1DaycareEnrollments,
	useGetV1DaycareEnrollmentsMonthlyAttendance,
	usePatchV1DaycareEnrollmentsIdStatus,
	usePostV1DaycareEnrollmentsGenerateMonthlyBulk,
	usePostV1DaycareEnrollmentsSyncInvoices,
	usePutV1DaycareEnrollmentsMonthlyAttendance,
} from "#/api/endpoints/daycare-enrollments/daycare-enrollments";
import { getGetV1InvoicesQueryKey } from "#/api/endpoints/invoices/invoices";
import { postV1DaycareEnrollmentsPreviewSyncInvoices } from "#/api/endpoints/sync-invoices/sync-invoices";
import { customInstance } from "#/api/mutator/custom-instance";
import {
	SyncPreviewDialog,
	type SyncPreviewRow,
	type SyncPreviewSummaryItem,
} from "#/components/molecules/SyncPreviewDialog";
import {
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";

const CATEGORY_LABELS: Record<string, string> = {
	premium: "Premium",
	regular: "Regular",
};
const SLOT_LABELS: Record<string, string> = {
	"07-15": "07-15",
	"10-15": "10-15",
	"10-13": "10-13",
};
const AGE_LABELS: Record<string, string> = { kbtk: "KB-TK", under3: "< 3 th" };

export const Route = createFileRoute("/_authenticated/administrasi/daycare/")({
	component: DaycareIndexPage,
	validateSearch: (params: Record<string, unknown>) => ({
		page: (typeof params.page === "number"
			? params.page
			: typeof params.page === "string"
				? Number.parseInt(params.page, 10) || 1
				: undefined) as number | undefined,
		search: typeof params.search === "string" ? params.search : undefined,
		status: typeof params.status === "string" ? params.status : undefined,
	}),
});

function DaycareIndexPage() {
	const [tab, setTab] = useState<"enrollment" | "attendance">("enrollment");
	return (
		<div className="space-y-6">
			<div className="flex border-b border-gray-200 gap-0">
				<button
					onClick={() => setTab("enrollment")}
					className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "enrollment" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
				>
					<ClipboardList className="h-4 w-4 inline mr-1.5" />
					Pendaftaran
				</button>
				<button
					onClick={() => setTab("attendance")}
					className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "attendance" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
				>
					<CalendarCheck className="h-4 w-4 inline mr-1.5" />
					Kehadiran Bulanan
				</button>
			</div>
			{tab === "enrollment" ? <EnrollmentTab /> : <AttendanceTab />}
		</div>
	);
}

// ═══ Tab 1: Pendaftaran ═══
function EnrollmentTab() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const navigate = useNavigate();
	const searchParams = Route.useSearch();

	const page = searchParams.page ?? 1;
	const limit = 10;
	const searchInput = searchParams.search ?? "";
	const statusFilter = searchParams.status ?? "active"; // default: aktif

	const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

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

	const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
	const [enrollmentToDeactivate, setEnrollmentToDeactivate] =
		useState<any>(null);
	const [isActivateOpen, setIsActivateOpen] = useState(false);
	const [enrollmentToActivate, setEnrollmentToActivate] = useState<any>(null);
	const [generatingBulkSpd, setGeneratingBulkSpd] = useState(false);
	const [syncOpen, setSyncOpen] = useState(false);

	// Delete state
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [enrollmentToDelete, setEnrollmentToDelete] = useState<any>(null);
	const [deleteWarning, setDeleteWarning] = useState<any>(null); // unpaid invoices warning
	const [isDeleting, setIsDeleting] = useState(false);
	const [isCheckingDelete, setIsCheckingDelete] = useState(false);

	const bulkSpdMutation = usePostV1DaycareEnrollmentsGenerateMonthlyBulk();

	const syncMutation = usePostV1DaycareEnrollmentsSyncInvoices({
		mutation: {
			onSuccess: (res: any) => {
				const d = res?.data?.data;
				addToast({
					variant: "success",
					title: "Berhasil",
					message: d
						? `Sinkron selesai — ${d.total_synced} dari ${d.total_enrollments} enrollment diproses, ${d.total_skipped} dilewati.`
						: "Sinkronisasi tagihan daycare selesai.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1DaycareEnrollmentsQueryKey(),
				});
				queryClient.invalidateQueries({ queryKey: getGetV1InvoicesQueryKey() });
				setSyncOpen(false);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err?.message }),
		},
	});

	const loadSyncPreview = async () => {
		const res = await postV1DaycareEnrollmentsPreviewSyncInvoices();
		const d = res.data.data;

		const rows: SyncPreviewRow[] = d.items.map((it) => ({
			key: `${it.student_id}-${it.category}`,
			student_name: it.student_name,
			action: `${CATEGORY_LABELS[it.category] ?? it.category} — ${it.reason}`,
			status: it.will_sync ? "change" : "skip",
		}));
		const totalWillSync = d.items.filter((it) => it.will_sync).length;
		const summary: SyncPreviewSummaryItem[] = [
			{ label: "Enrollment", value: d.total_enrollments },
			{ label: "Akan disinkronkan", value: totalWillSync },
			{ label: "Dilewati", value: d.total_enrollments - totalWillSync },
		];
		return { summary, rows };
	};

	const {
		data: response,
		isLoading,
		isError,
	} = useGetV1DaycareEnrollments(
		{
			academic_year_id: activeAy?.id as any,
			page,
			limit,
			search: debouncedSearch,
			status: statusFilter !== "all" ? statusFilter : undefined,
		},
		{ query: { enabled: !!activeAy?.id, keepPreviousData: true } as any },
	);
	const enrollments = (response?.data as any)?.data || [];
	const meta = (response?.data as any)?.meta;
	const totalPages = meta?.total ? Math.ceil(meta.total / limit) : 0;

	const updateStatusMutation = usePatchV1DaycareEnrollmentsIdStatus({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Status diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1DaycareEnrollmentsQueryKey(),
				});
				setIsDeactivateOpen(false);
			},
			onError: (e: any) =>
				addToast({ variant: "error", title: "Gagal", message: e?.message }),
		},
	});

	const formatDate = (d: string) =>
		new Date(d).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});

	const handleGenerateBulkSPD = async () => {
		if (!activeAy) return;
		const now = new Date();
		setGeneratingBulkSpd(true);
		try {
			const result = await bulkSpdMutation.mutateAsync({
				data: {
					academic_year_id: activeAy.id,
					month: now.getMonth() + 1,
					year: now.getFullYear(),
				},
			});
			addToast({
				variant: "success",
				title: "Berhasil",
				message: (result as any)?.message || "SPD berhasil digenerate.",
			});
			queryClient.invalidateQueries({
				queryKey: getGetV1DaycareEnrollmentsQueryKey(),
			});
		} catch (e: any) {
			addToast({ variant: "error", title: "Gagal", message: e.message });
		} finally {
			setGeneratingBulkSpd(false);
		}
	};

	const handleDeleteCheck = async (enrollment: any) => {
		setEnrollmentToDelete(enrollment);
		setDeleteWarning(null);
		setIsCheckingDelete(true);
		try {
			const res = await customInstance<any>(
				`/v1/daycare-enrollments/${enrollment.id}`,
				{ method: "DELETE" },
			);
			// customInstance wraps: { data: jsonBody, status, headers }
			// jsonBody = { message: "...", data: { warning, message, unpaid_invoices } }
			const jsonBody = res?.data;
			const innerData = jsonBody?.data;
			if (innerData?.warning) {
				setDeleteWarning(innerData);
				setIsDeleteOpen(true);
			} else {
				addToast({
					variant: "success",
					title: "Berhasil",
					message:
						innerData?.message || jsonBody?.message || "Enrollment dihapus.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1DaycareEnrollmentsQueryKey(),
				});
				setEnrollmentToDelete(null);
			}
		} catch (e: any) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: e?.message || "Gagal menghapus.",
			});
			setEnrollmentToDelete(null);
		} finally {
			setIsCheckingDelete(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!enrollmentToDelete) return;
		setIsDeleting(true);
		try {
			const res = await customInstance<any>(
				`/v1/daycare-enrollments/${enrollmentToDelete.id}?delete_invoices=true`,
				{ method: "DELETE" },
			);
			const jsonBody = res?.data;
			const innerData = jsonBody?.data;
			addToast({
				variant: "success",
				title: "Berhasil",
				message:
					innerData?.message ||
					jsonBody?.message ||
					"Enrollment dan invoice dihapus.",
			});
			queryClient.invalidateQueries({
				queryKey: getGetV1DaycareEnrollmentsQueryKey(),
			});
			setIsDeleteOpen(false);
			setEnrollmentToDelete(null);
			setDeleteWarning(null);
		} catch (e: any) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: e?.message || "Gagal menghapus.",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Data Siswa Daycare
					</h1>
					<p className="text-sm text-gray-500">Kelola pendaftaran daycare.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="secondary"
						onClick={() => setSyncOpen(true)}
						className="flex items-center gap-2"
						title="Sinkronkan item invoice daycare untuk semua enrollment aktif"
					>
						<RefreshCw className="h-4 w-4" />
						Sync Invoice
					</Button>
					<Button
						variant="secondary"
						onClick={handleGenerateBulkSPD}
						disabled={generatingBulkSpd}
						className="flex items-center gap-2"
					>
						<Cog
							className={`h-4 w-4 ${generatingBulkSpd ? "animate-spin" : ""}`}
						/>
						{generatingBulkSpd ? "Generate..." : "Generate SPD Bulanan"}
					</Button>
					<Link to="/administrasi/daycare/baru" search={{} as any}>
						<Button className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Pendaftaran Baru
						</Button>
					</Link>
				</div>
			</div>

			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 flex gap-4 items-center">
				<div className="relative w-full sm:max-w-xs">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<Search className="h-4 w-4 text-gray-400" />
					</div>
					<input
						type="text"
						className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-gray-300 text-sm"
						placeholder="Cari nama..."
						value={searchInput}
						onChange={(e) => updateSearch({ search: e.target.value, page: 1 })}
					/>
				</div>
				<select
					value={statusFilter}
					onChange={(e) => updateSearch({ status: e.target.value, page: 1 })}
					className="rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-gray-300 text-sm"
				>
					<option value="all">Semua Status</option>
					<option value="active">Aktif</option>
					<option value="inactive">Nonaktif</option>
				</select>
			</div>

			{isLoading ? (
				<div className="h-64 animate-pulse bg-white rounded-xl" />
			) : isError ? (
				<div className="bg-red-50 p-4 text-red-800">Gagal memuat.</div>
			) : enrollments.length === 0 ? (
				<EmptyState
					title="Tidak ada data"
					description="Belum ada pendaftaran daycare."
				/>
			) : (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="py-3 px-4 text-left text-xs font-semibold text-gray-900">
									Siswa
								</th>
								<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">
									Kategori
								</th>
								<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">
									Slot
								</th>
								<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">
									Umur
								</th>
								<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">
									Mulai
								</th>
								<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">
									Status
								</th>
								<th className="py-3 pr-4"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{enrollments.map((e: any) => (
								<tr key={e.id} className="hover:bg-gray-50">
									<td className="py-3 px-4">
										<div className="flex items-center gap-3">
											<UserCircle className="h-8 w-8 text-gray-300" />
											<span className="font-medium text-gray-900 text-sm">
												{e.student.full_name}
											</span>
										</div>
									</td>
									<td className="py-3 px-3">
										<Badge
											className={
												e.category === "premium"
													? "bg-purple-100 text-purple-700"
													: "bg-amber-100 text-amber-700"
											}
										>
											{CATEGORY_LABELS[e.category] || e.category}
										</Badge>
									</td>
									<td className="py-3 px-3 text-sm text-gray-600">
										{SLOT_LABELS[e.time_slot] || e.time_slot}
									</td>
									<td className="py-3 px-3 text-sm text-gray-600">
										{AGE_LABELS[e.age_group] || e.age_group}
									</td>
									<td className="py-3 px-3 text-sm text-gray-500">
										{formatDate(e.start_date)}
									</td>
									<td className="py-3 px-3">
										{e.status === "active" ? (
											<Badge variant="success">Aktif</Badge>
										) : (
											<Badge variant="secondary">Nonaktif</Badge>
										)}
									</td>
									<td className="py-3 pr-4 text-right">
										<div className="flex items-center justify-end gap-2">
											<button
												onClick={() =>
													navigate({
														to: "/administrasi/daycare/baru",
														search: { edit_id: e.id } as any,
													})
												}
												className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold flex items-center gap-1"
											>
												<Pencil className="h-3 w-3" />
												Edit
											</button>
											<button
												onClick={() => handleDeleteCheck(e)}
												disabled={isCheckingDelete}
												className="text-red-600 hover:text-red-900 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
											>
												<Trash2 className="h-3 w-3" />
												{isCheckingDelete && enrollmentToDelete?.id === e.id
													? "..."
													: "Hapus"}
											</button>
											{e.status === "active" && (
												<button
													onClick={() => {
														setEnrollmentToDeactivate(e);
														setIsDeactivateOpen(true);
													}}
													className="text-red-600 hover:text-red-900 text-xs font-semibold flex items-center gap-1"
												>
													<ShieldX className="h-3 w-3" />
													Stop
												</button>
											)}
											{e.status !== "active" && (
												<button
													onClick={() => {
														setEnrollmentToActivate(e);
														setIsActivateOpen(true);
													}}
													className="text-green-600 hover:text-green-900 text-xs font-semibold flex items-center gap-1"
												>
													<ShieldCheck className="h-3 w-3" />
													Aktifkan
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{totalPages > 1 && (
						<div className="flex justify-between px-4 py-3 border-t">
							<button
								disabled={page === 1}
								onClick={() => updateSearch({ page: page - 1 })}
								className="text-sm text-indigo-600 disabled:text-gray-300"
							>
								&laquo; Prev
							</button>
							<span className="text-sm text-gray-500">
								Halaman {page} dari {totalPages}
							</span>
							<button
								disabled={page === totalPages}
								onClick={() => updateSearch({ page: page + 1 })}
								className="text-sm text-indigo-600 disabled:text-gray-300"
							>
								Next &raquo;
							</button>
						</div>
					)}
				</div>
			)}

			<ConfirmDialog
				open={isDeactivateOpen}
				onCancel={() => setIsDeactivateOpen(false)}
				onConfirm={() =>
					enrollmentToDeactivate &&
					updateStatusMutation.mutate({
						id: enrollmentToDeactivate.id,
						data: { status: "inactive", end_date: new Date().toISOString() },
					})
				}
				title="Nonaktifkan Daycare"
				variant="danger"
			>
				<p>
					Nonaktifkan daycare untuk{" "}
					<strong>{enrollmentToDeactivate?.student?.full_name}</strong>?
				</p>
			</ConfirmDialog>

			<ConfirmDialog
				open={isActivateOpen}
				onCancel={() => setIsActivateOpen(false)}
				onConfirm={() =>
					enrollmentToActivate &&
					updateStatusMutation.mutate({
						id: enrollmentToActivate.id,
						data: { status: "active" },
					})
				}
				title="Aktifkan Daycare"
				variant="primary"
			>
				<p>
					Aktifkan kembali daycare untuk{" "}
					<strong>{enrollmentToActivate?.student?.full_name}</strong>?
				</p>
			</ConfirmDialog>

			{/* Delete confirmation dialog */}
			<ConfirmDialog
				open={isDeleteOpen && !!deleteWarning}
				onCancel={() => {
					setIsDeleteOpen(false);
					setEnrollmentToDelete(null);
					setDeleteWarning(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Hapus Pendaftaran Daycare"
				variant="danger"
				confirmLabel={isDeleting ? "Menghapus..." : "Hapus Beserta Invoice"}
			>
				<div className="space-y-3">
					<p>
						Hapus pendaftaran daycare untuk{" "}
						<strong>{enrollmentToDelete?.student?.full_name}</strong>?
					</p>
					{deleteWarning?.unpaid_invoices?.length > 0 && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-3">
							<p className="text-sm font-medium text-red-800 mb-2">
								⚠️ Terdapat {deleteWarning.unpaid_invoices.length} invoice belum
								lunas:
							</p>
							<ul className="text-xs text-red-700 space-y-1">
								{deleteWarning.unpaid_invoices.map((inv: any) => (
									<li key={inv.id}>
										{inv.type}{" "}
										{inv.month && inv.year
											? `${String(inv.month).padStart(2, "0")}/${inv.year}`
											: ""}{" "}
										— Rp {Number(inv.total_amount).toLocaleString("id-ID")}{" "}
										(Lunas: Rp {Number(inv.paid_amount).toLocaleString("id-ID")}
										)
									</li>
								))}
							</ul>
							<p className="text-xs text-red-600 mt-2">
								Jika dilanjutkan, invoice di atas juga akan dihapus.
							</p>
						</div>
					)}
				</div>
			</ConfirmDialog>

			{/* Dialog Preview Sinkronisasi Invoice Daycare */}
			<SyncPreviewDialog
				open={syncOpen}
				onClose={() => setSyncOpen(false)}
				title="Sync Invoice Daycare"
				description="Sinkronkan item invoice bulanan untuk semua enrollment daycare aktif. Enrollment premium akan diproses, regular dilewati."
				loadPreview={loadSyncPreview}
				runSync={async () => {
					await syncMutation.mutateAsync();
				}}
			/>
		</div>
	);
}

// ═══ Tab 2: Absensi Hari Ini ═══
function AttendanceTab() {
	const [activeAy] = useAtom(academicYearAtom);
	const { addToast } = useToast();
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [monthlyAtt, setMonthlyAtt] = useState<
		Record<
			number,
			{ spdDays: number; mealDays: number; overtimeMinutes: number }
		>
	>({});
	// Track original saved values to detect changes
	const [originalAtt, setOriginalAtt] = useState<
		Record<
			number,
			{ spdDays: number; mealDays: number; overtimeMinutes: number }
		>
	>({});
	const [saving, setSaving] = useState(false);
	// Track whether we've already loaded data for the current month/year
	const lastSynced = useRef<{ month: number; year: number } | null>(null);

	const { data: resp, isLoading } = useGetV1DaycareEnrollments(
		{ academic_year_id: activeAy?.id as any, status: "active", limit: 100 },
		{ query: { enabled: !!activeAy?.id } as any },
	);
	const enrollments = (resp?.data as any)?.data || [];

	// Load monthly attendance for all students using Orval hook
	const { data: monthlyData } = useGetV1DaycareEnrollmentsMonthlyAttendance(
		{
			month,
			year,
			academic_year_id: activeAy?.id,
		} as any,
		{ query: { enabled: !!activeAy?.id } } as any,
	);

	// Sync monthly attendance data into local state on initial load or month/year change
	useEffect(() => {
		// Skip if enrollments haven't loaded yet
		if (enrollments.length === 0) return;
		if (!monthlyData) return;
		// Skip if already synced for this month/year (prevents overwriting user input)
		if (
			lastSynced.current?.month === month &&
			lastSynced.current?.year === year
		)
			return;

		const responseData = (monthlyData as any)?.data;
		const items = responseData?.data || [];
		const itemsList = Array.isArray(items) ? items : [];
		const newAtt: Record<
			number,
			{ spdDays: number; mealDays: number; overtimeMinutes: number }
		> = {};
		for (const enr of enrollments) {
			newAtt[enr.student.id] = { spdDays: 0, mealDays: 0, overtimeMinutes: 0 };
		}
		for (const item of itemsList) {
			if (item.student_id) {
				newAtt[item.student_id] = {
					spdDays: item.spd_days || 0,
					mealDays: item.meal_days || 0,
					overtimeMinutes: item.overtime_minutes || 0,
				};
			}
		}
		setMonthlyAtt(newAtt);
		setOriginalAtt({ ...newAtt });
		lastSynced.current = { month, year };
	}, [monthlyData, enrollments, month, year]);

	const upsertMutation = usePutV1DaycareEnrollmentsMonthlyAttendance({
		mutation: {
			onSuccess: () => {
				// handled per-batch in handleSave
			},
			onError: (error: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: error?.message || "Gagal menyimpan kehadiran bulanan.",
				});
			},
		},
	});

	const handleSave = async () => {
		setSaving(true);
		// Hanya kirim siswa yang datanya berubah dari original
		const changed = enrollments.filter((enr: any) => {
			const curr = monthlyAtt[enr.student.id];
			const orig = originalAtt[enr.student.id];
			if (!curr) return false;
			if (!orig)
				return (
					curr.spdDays > 0 || curr.mealDays > 0 || curr.overtimeMinutes > 0
				);
			return (
				curr.spdDays !== orig.spdDays ||
				curr.mealDays !== orig.mealDays ||
				curr.overtimeMinutes !== orig.overtimeMinutes
			);
		});

		if (changed.length === 0) {
			addToast({
				variant: "info" as any,
				title: "Info",
				message: "Tidak ada perubahan data.",
			});
			setSaving(false);
			return;
		}

		try {
			const errors: string[] = [];
			for (const enr of changed) {
				const a = monthlyAtt[enr.student.id];
				if (!a) continue;
				try {
					await upsertMutation.mutateAsync({
						data: {
							student_id: enr.student.id,
							academic_year_id: activeAy!.id,
							month,
							year,
							spd_days: a.spdDays,
							meal_days: a.mealDays,
							overtime_minutes: a.overtimeMinutes,
						},
					});
				} catch (e: any) {
					errors.push(`${enr.student.full_name}: ${e?.message || "gagal"}`);
				}
			}
			// Update baseline after successful save
			setOriginalAtt((prev) => {
				const updated = { ...prev };
				for (const enr of changed) {
					updated[enr.student.id] = { ...monthlyAtt[enr.student.id] };
				}
				return updated;
			});
			const successCount = changed.length - errors.length;
			if (errors.length > 0) {
				addToast({
					variant: "error",
					title: "Sebagian gagal",
					message: `${successCount} berhasil, ${errors.length} gagal: ${errors.slice(0, 3).join("; ")}`,
				});
			} else {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `${successCount} siswa disimpan & SPD berhasil digenerate.`,
				});
			}
		} finally {
			setSaving(false);
		}
	};

	const handleMonthChange = (direction: number) => {
		let newMonth = month + direction;
		let newYear = year;
		if (newMonth > 12) {
			newMonth = 1;
			newYear++;
		} else if (newMonth < 1) {
			newMonth = 12;
			newYear--;
		}
		setMonth(newMonth);
		setYear(newYear);
	};

	const monthNames = [
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

	if (isLoading)
		return <div className="h-64 animate-pulse bg-white rounded-xl" />;

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">
					Kehadiran Bulanan Daycare
				</h1>
				<p className="text-sm text-gray-500">
					Input jumlah hari SPD, konsumsi, dan menit overtime per bulan. Data
					ini digunakan untuk generate tagihan.
				</p>
			</div>

			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
				{/* Month/Year selector */}
				<div className="flex items-center gap-3 mb-4">
					<label className="text-sm font-medium text-gray-700">Bulan:</label>
					<button
						type="button"
						onClick={() => handleMonthChange(-1)}
						className="px-2 py-1 text-gray-500 hover:text-gray-700 border rounded"
					>
						◀
					</button>
					<span className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
						{monthNames[month - 1]} {year}
					</span>
					<button
						type="button"
						onClick={() => handleMonthChange(1)}
						className="px-2 py-1 text-gray-500 hover:text-gray-700 border rounded"
					>
						▶
					</button>
				</div>

				{enrollments.length === 0 ? (
					<p className="text-sm text-gray-500">
						Tidak ada siswa daycare aktif.
					</p>
				) : (
					<>
						{/* Header */}
						<div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 border-b pb-2 mb-2">
							<div className="col-span-3">Nama Siswa</div>
							<div className="col-span-2">Kategori</div>
							<div className="col-span-2">Hari SPD</div>
							<div className="col-span-2">Hari Konsumsi</div>
							<div className="col-span-3">Overtime (menit)</div>
						</div>

						<div className="space-y-2 max-h-96 overflow-y-auto">
							{enrollments.map((enr: any) => {
								const a = monthlyAtt[enr.student.id];
								const isPremium = enr.category === "premium";
								return (
									<div
										key={enr.student.id}
										className="grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-100"
									>
										<div className="col-span-3">
											<span className="text-sm font-medium text-gray-900">
												{enr.student.full_name}
											</span>
										</div>
										<div className="col-span-2">
											<span className="text-xs text-gray-500">
												{CATEGORY_LABELS[enr.category]}
											</span>
										</div>
										<div className="col-span-2">
											{isPremium ? (
												<span className="text-xs text-gray-400">Flat</span>
											) : (
												<input
													type="number"
													min={0}
													max={30}
													value={a?.spdDays ?? 0}
													onChange={(e) => {
														const val = Math.min(
															30,
															Math.max(0, Number.parseInt(e.target.value) || 0),
														);
														setMonthlyAtt((prev) => ({
															...prev,
															[enr.student.id]: {
																...(prev[enr.student.id] || {
																	spdDays: 0,
																	mealDays: 0,
																	overtimeMinutes: 0,
																}),
																spdDays: val,
															},
														}));
													}}
													className="w-16 rounded-md border-gray-300 text-sm text-center"
												/>
											)}
										</div>
										<div className="col-span-2">
											<input
												type="number"
												min={0}
												max={30}
												value={a?.mealDays ?? 0}
												onChange={(e) => {
													const val = Math.min(
														30,
														Math.max(0, Number.parseInt(e.target.value) || 0),
													);
													setMonthlyAtt((prev) => ({
														...prev,
														[enr.student.id]: {
															...(prev[enr.student.id] || {
																spdDays: 0,
																mealDays: 0,
																overtimeMinutes: 0,
															}),
															mealDays: val,
														},
													}));
												}}
												className="w-16 rounded-md border-gray-300 text-sm text-center"
											/>
										</div>
										<div className="col-span-3 flex items-center gap-1">
											<input
												type="number"
												min={0}
												max={6000}
												step={30}
												value={a?.overtimeMinutes ?? 0}
												onChange={(e) => {
													const val = Math.min(
														6000,
														Math.max(0, Number.parseInt(e.target.value) || 0),
													);
													setMonthlyAtt((prev) => ({
														...prev,
														[enr.student.id]: {
															...(prev[enr.student.id] || {
																spdDays: 0,
																mealDays: 0,
																overtimeMinutes: 0,
															}),
															overtimeMinutes: val,
														},
													}));
												}}
												className="w-20 rounded-md border-gray-300 text-sm text-center"
											/>
											<span className="text-xs text-gray-400">
												= {Math.floor((a?.overtimeMinutes ?? 0) / 30)} unit
											</span>
										</div>
									</div>
								);
							})}
						</div>
						<div className="mt-4">
							<Button onClick={handleSave} disabled={saving} className="w-full">
								{saving ? "Menyimpan..." : "Simpan Kehadiran Bulanan"}
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
