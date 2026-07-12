import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { CalendarCheck, ClipboardList, Cog, Plus, Search, ShieldX, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getGetV1DaycareEnrollmentsQueryKey,
	useGetV1DaycareEnrollments,
	usePatchV1DaycareEnrollmentsIdStatus,
} from "#/api/endpoints/daycare-enrollments/daycare-enrollments";
import {
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";

const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "alizzah_token";

const CATEGORY_LABELS: Record<string, string> = { premium: "Premium", regular: "Regular" };
const SLOT_LABELS: Record<string, string> = { "07-15": "07-15", "10-15": "10-15", "10-13": "10-13" };
const AGE_LABELS: Record<string, string> = { kbtk: "KB-TK", under3: "< 3 th" };

export const Route = createFileRoute("/_authenticated/administrasi/daycare/")({
	component: DaycareIndexPage,
});

function DaycareIndexPage() {
	const [tab, setTab] = useState<"enrollment" | "attendance">("enrollment");
	return (
		<div className="space-y-6">
			<div className="flex border-b border-gray-200 gap-0">
				<button onClick={() => setTab("enrollment")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "enrollment" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
					<ClipboardList className="h-4 w-4 inline mr-1.5" />Pendaftaran
				</button>
				<button onClick={() => setTab("attendance")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "attendance" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
					<CalendarCheck className="h-4 w-4 inline mr-1.5" />Absensi Hari Ini
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
	const [page, setPage] = useState(1); const limit = 10;
	const [search, setSearch] = useState(""); const [searchInput, setSearchInput] = useState("");
	const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
	const [enrollmentToDeactivate, setEnrollmentToDeactivate] = useState<any>(null);
	const [generatingBulkSpd, setGeneratingBulkSpd] = useState(false);

	const { data: response, isLoading, isError } = useGetV1DaycareEnrollments(
		{ academic_year_id: activeAy?.id as any, page, limit, search },
		{ query: { enabled: !!activeAy?.id, keepPreviousData: true } as any },
	);
	const enrollments = (response?.data as any)?.data || [];
	const meta = (response?.data as any)?.meta;

	const updateStatusMutation = usePatchV1DaycareEnrollmentsIdStatus({
		mutation: {
			onSuccess: () => {
				addToast({ variant: "success", title: "Berhasil", message: "Status diperbarui." });
				queryClient.invalidateQueries({ queryKey: getGetV1DaycareEnrollmentsQueryKey() });
				setIsDeactivateOpen(false);
			},
			onError: (e: any) => addToast({ variant: "error", title: "Gagal", message: e?.message }),
		},
	});

	const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

	const handleGenerateBulkSPD = async () => {
			if (!activeAy) return;
			const now = new Date();
			setGeneratingBulkSpd(true);
			try {
				const token = localStorage.getItem(TOKEN_KEY);
				const res = await fetch(`${API_URL}/v1/daycare-enrollments/generate-monthly-bulk`, {
					method: "POST",
					headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
					body: JSON.stringify({
						academic_year_id: activeAy.id,
						month: now.getMonth() + 1,
						year: now.getFullYear(),
					}),
				});
				const json = await res.json();
				if (!res.ok) throw new Error(json.message || "Gagal generate SPD");
				addToast({ variant: "success", title: "Berhasil", message: json.message || "SPD berhasil digenerate." });
				queryClient.invalidateQueries({ queryKey: getGetV1DaycareEnrollmentsQueryKey() });
			} catch (e: any) {
				addToast({ variant: "error", title: "Gagal", message: e.message });
			} finally {
				setGeneratingBulkSpd(false);
			}
		};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Data Siswa Daycare</h1>
					<p className="text-sm text-gray-500">Kelola pendaftaran daycare.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="secondary" onClick={handleGenerateBulkSPD} disabled={generatingBulkSpd} className="flex items-center gap-2">
						<Cog className={`h-4 w-4 ${generatingBulkSpd ? "animate-spin" : ""}`} />
						{generatingBulkSpd ? "Generate..." : "Generate SPD Bulanan"}
					</Button>
					<Link to="/administrasi/daycare/baru"><Button className="flex items-center gap-2"><Plus className="h-4 w-4" />Pendaftaran Baru</Button></Link>
				</div>
			</div>

			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 flex gap-4">
				<form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} className="relative w-full sm:max-w-xs">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-4 w-4 text-gray-400" /></div>
					<input type="text" className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-gray-300 text-sm" placeholder="Cari nama..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
				</form>
			</div>

			{isLoading ? <div className="h-64 animate-pulse bg-white rounded-xl" /> :
			isError ? <div className="bg-red-50 p-4 text-red-800">Gagal memuat.</div> :
			enrollments.length === 0 ? <EmptyState title="Tidak ada data" description="Belum ada pendaftaran daycare." /> :
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50"><tr>
						<th className="py-3 px-4 text-left text-xs font-semibold text-gray-900">Siswa</th>
						<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">Kategori</th>
						<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">Slot</th>
						<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">Umur</th>
						<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">Mulai</th>
						<th className="py-3 px-3 text-left text-xs font-semibold text-gray-900">Status</th>
						<th className="py-3 pr-4"></th>
					</tr></thead>
					<tbody className="divide-y divide-gray-100">
						{enrollments.map((e: any) => (
							<tr key={e.id} className="hover:bg-gray-50">
								<td className="py-3 px-4"><div className="flex items-center gap-3"><UserCircle className="h-8 w-8 text-gray-300" /><span className="font-medium text-gray-900 text-sm">{e.student.full_name}</span></div></td>
								<td className="py-3 px-3"><Badge className={e.category === "premium" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}>{CATEGORY_LABELS[e.category] || e.category}</Badge></td>
								<td className="py-3 px-3 text-sm text-gray-600">{SLOT_LABELS[e.time_slot] || e.time_slot}</td>
								<td className="py-3 px-3 text-sm text-gray-600">{AGE_LABELS[e.age_group] || e.age_group}</td>
								<td className="py-3 px-3 text-sm text-gray-500">{formatDate(e.start_date)}</td>
								<td className="py-3 px-3">{e.status === "active" ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</td>
								<td className="py-3 pr-4 text-right">
										{e.status === "active" && (
											<button onClick={() => { setEnrollmentToDeactivate(e); setIsDeactivateOpen(true); }} className="text-red-600 hover:text-red-900 text-xs font-semibold flex items-center gap-1"><ShieldX className="h-3 w-3" />Stop</button>
										)}
									</td>
							</tr>
						))}
					</tbody>
				</table>
				{meta?.total_pages > 1 && (
					<div className="flex justify-between px-4 py-3 border-t">
						<button disabled={page === 1} onClick={() => setPage(page - 1)} className="text-sm text-indigo-600 disabled:text-gray-300">&laquo; Prev</button>
						<span className="text-sm text-gray-500">Halaman {page} dari {meta.total_pages}</span>
						<button disabled={page === meta.total_pages} onClick={() => setPage(page + 1)} className="text-sm text-indigo-600 disabled:text-gray-300">Next &raquo;</button>
					</div>
				)}
			</div>}

			<ConfirmDialog open={isDeactivateOpen} onCancel={() => setIsDeactivateOpen(false)} onConfirm={() => enrollmentToDeactivate && updateStatusMutation.mutate({ id: enrollmentToDeactivate.id, data: { status: "inactive", end_date: new Date().toISOString() } })} title="Nonaktifkan Daycare" variant="danger">
				<p>Nonaktifkan daycare untuk <strong>{enrollmentToDeactivate?.student?.full_name}</strong>?</p>
			</ConfirmDialog>
		</div>
	);
}

// ═══ Tab 2: Absensi Hari Ini ═══
function AttendanceTab() {
	const [activeAy] = useAtom(academicYearAtom);
	const { addToast } = useToast();
	const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
	const [attendance, setAttendance] = useState<Record<number, { timeSlot: string; withMeal: boolean; withTpq: boolean }>>({});
	const [saving, setSaving] = useState(false);

	const { data: resp, isLoading } = useGetV1DaycareEnrollments(
		{ academic_year_id: activeAy?.id as any, status: "active", limit: 100 },
		{ query: { enabled: !!activeAy?.id } as any },
	);
	const enrollments = (resp?.data as any)?.data || [];

	// Load existing attendance for this date
	useEffect(() => {
		const loadAttendance = async () => {
			const token = localStorage.getItem(TOKEN_KEY);
			const newAtt: Record<number, { timeSlot: string; withMeal: boolean; withTpq: boolean }> = {};
			for (const enr of enrollments) {
				newAtt[enr.student.id] = { timeSlot: "", withMeal: false, withTpq: false };
			}
			try {
				const [year, month] = date.split("-");
				for (const enr of enrollments) {
					const res = await fetch(`${API_URL}/v1/daycare-enrollments/attendance?student_id=${enr.student.id}&month=${parseInt(month)}&year=${parseInt(year)}`, { headers: { Authorization: `Bearer ${token}` } });
					if (res.ok) {
						const json = await res.json();
						const items = json.data || [];
						const today = items.find((a: any) => a.date === date);
						if (today) newAtt[enr.student.id] = { timeSlot: today.time_slot || "", withMeal: today.with_meal || false, withTpq: today.with_tpq || false };
					}
				}
			} catch {}
			setAttendance(newAtt);
		};
		if (enrollments.length > 0) loadAttendance();
	}, [enrollments, date]);

	const handleSave = async () => {
		setSaving(true);
		const token = localStorage.getItem(TOKEN_KEY);
		try {
			for (const enr of enrollments) {
				const a = attendance[enr.student.id];
				if (!a) continue;
				await fetch(`${API_URL}/v1/daycare-enrollments/attendance`, {
					method: "PUT",
					headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
					body: JSON.stringify({ student_id: enr.student.id, academic_year_id: activeAy?.id, date, time_slot: a.timeSlot, with_meal: a.withMeal, with_tpq: a.withTpq }),
				});
			}
			addToast({ variant: "success", title: "Berhasil", message: "Absensi disimpan." });
		} catch {
			addToast({ variant: "error", title: "Gagal", message: "Gagal menyimpan absensi." });
		} finally { setSaving(false); }
	};

	if (isLoading) return <div className="h-64 animate-pulse bg-white rounded-xl" />;

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Absensi Daycare</h1>
				<p className="text-sm text-gray-500">Catat kehadiran harian siswa daycare.</p>
			</div>

			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
				<div className="flex items-center gap-4 mb-4">
					<label className="text-sm font-medium text-gray-700">Tanggal:</label>
					<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border-gray-300 text-sm" />
				</div>

				{enrollments.length === 0 ? (
					<p className="text-sm text-gray-500">Tidak ada siswa daycare aktif.</p>
				) : (
					<>
						<div className="space-y-2 max-h-96 overflow-y-auto">
							{enrollments.map((enr: any) => {
								const a = attendance[enr.student.id];
								const isPresent = a && a.timeSlot !== "";
								return (
								<div key={enr.student.id} className="flex items-center gap-2 py-2 border-b border-gray-100 flex-wrap">
									<input type="checkbox" checked={isPresent} onChange={(e) => {
										setAttendance((prev) => ({ ...prev, [enr.student.id]: { timeSlot: e.target.checked ? (enr.time_slot || "07-15") : "", withMeal: false, withTpq: false } }));
									}} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
									<span className="flex-1 text-sm font-medium text-gray-900 min-w-[120px]">{enr.student.full_name}</span>
									<span className="text-xs text-gray-400">{CATEGORY_LABELS[enr.category]}</span>
									{isPresent && (
										<>
											<select value={a.timeSlot} onChange={(e) => setAttendance((prev) => ({ ...prev, [enr.student.id]: { ...prev[enr.student.id], timeSlot: e.target.value } }))} className="rounded-md border-gray-300 text-xs py-0.5">
												<option value="07-15">07-15</option>
												<option value="10-15">10-15</option>
												<option value="10-13">10-13</option>
											</select>
											<label className="flex items-center gap-1 text-xs cursor-pointer">
												<input type="checkbox" checked={a.withMeal} onChange={(e) => setAttendance((prev) => ({ ...prev, [enr.student.id]: { ...prev[enr.student.id], withMeal: e.target.checked } }))} className="h-3 w-3 rounded border-gray-300 text-indigo-600" />
												Konsumsi
											</label>
											<label className="flex items-center gap-1 text-xs cursor-pointer">
												<input type="checkbox" checked={a.withTpq} onChange={(e) => setAttendance((prev) => ({ ...prev, [enr.student.id]: { ...prev[enr.student.id], withTpq: e.target.checked } }))} className="h-3 w-3 rounded border-gray-300 text-indigo-600" />
												TPQ
											</label>
										</>
									)}
								</div>
							);
						})}
						</div>
						<div className="mt-4">
							<Button onClick={handleSave} disabled={saving} className="w-full">
								{saving ? "Menyimpan..." : "Simpan Absensi"}
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
