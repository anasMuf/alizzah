import { createFileRoute, redirect } from "@tanstack/react-router";
import { Clock, Eye, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
	type AuditLogEntry,
	type AuditLogQueryParams,
	useAuditLogDetail,
	useAuditLogs,
} from "#/api/endpoints/audit-logs/audit-logs";
import {
	Badge,
	Button,
	EmptyState,
	Pagination,
	SlideOver,
} from "#/components/ui";

export const Route = createFileRoute("/_authenticated/pengaturan/log")({
	beforeLoad: () => {
		const role = localStorage.getItem("alizzah_role");
		if (role !== "superadmin") {
			throw redirect({ to: "/" });
		}
	},
	component: LogAktivitasComponent,
});

// ── Constants ──────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
	{ value: "", label: "Semua Modul" },
	{ value: "administrasi", label: "Administrasi" },
	{ value: "keuangan", label: "Keuangan" },
	{ value: "koperasi", label: "Koperasi" },
	{ value: "laporan", label: "Laporan" },
	{ value: "pengaturan", label: "Pengaturan" },
	{ value: "auth", label: "Auth" },
];

const METHOD_OPTIONS = [
	{ value: "", label: "Semua Method" },
	{ value: "POST", label: "POST" },
	{ value: "PUT", label: "PUT" },
	{ value: "PATCH", label: "PATCH" },
	{ value: "DELETE", label: "DELETE" },
];

const STATUS_OPTIONS = [
	{ value: "", label: "Semua Status" },
	{ value: "error", label: "Error (4xx/5xx)" },
	{ value: "success", label: "Success (2xx)" },
];

const MODULE_LABELS: Record<string, string> = {
	administrasi: "Administrasi",
	keuangan: "Keuangan",
	koperasi: "Koperasi",
	laporan: "Laporan",
	pengaturan: "Pengaturan",
	auth: "Auth",
};

const METHOD_LABELS: Record<string, string> = {
	POST: "POST",
	PUT: "PUT",
	PATCH: "PATCH",
	DELETE: "DELETE",
};

const MODULE_BADGE: Record<
	string,
	"primary" | "success" | "warning" | "info" | "danger" | "secondary"
> = {
	administrasi: "info",
	keuangan: "success",
	koperasi: "warning",
	laporan: "primary",
	pengaturan: "secondary",
	auth: "danger",
};

// ── Helpers ─────────────────────────────────────────────────────────────

function statusBadge(code: number): {
	variant: "success" | "danger" | "warning";
	label: string;
} {
	if (code >= 500) return { variant: "danger", label: String(code) };
	if (code >= 400) return { variant: "warning", label: String(code) };
	return { variant: "success", label: String(code) };
}

function formatTime(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleString("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function truncatePath(path: string, max = 40): string {
	return path.length > max ? "..." + path.slice(-max) : path;
}

// ── Component ───────────────────────────────────────────────────────────

function LogAktivitasComponent() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [filterModule, setFilterModule] = useState("");
	const [filterMethod, setFilterMethod] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const params: AuditLogQueryParams = useMemo(() => {
		const p: AuditLogQueryParams = { page, limit: 20 };
		if (search) p.search = search;
		if (filterModule) p.module = filterModule;
		if (filterMethod) p.method = filterMethod;
		if (dateFrom) p.date_from = dateFrom;
		if (dateTo) p.date_to = dateTo;
		if (filterStatus === "error") {
			p.status_min = 400;
			p.status_max = 599;
		} else if (filterStatus === "success") {
			p.status_min = 200;
			p.status_max = 299;
		}
		return p;
	}, [
		page,
		search,
		filterModule,
		filterMethod,
		filterStatus,
		dateFrom,
		dateTo,
	]);

	const { data: response, isLoading, isError } = useAuditLogs(params);
	const { data: detailResponse, isLoading: detailLoading } = useAuditLogDetail(
		isDetailOpen ? selectedId : null,
	);

	const entries: AuditLogEntry[] = (response as any)?.data ?? [];
	const meta = (response as any)?.meta ?? { page: 1, limit: 20, total: 0 };
	const detail = (detailResponse as any)?.data as AuditLogEntry | undefined;

	const hasFilters =
		search ||
		filterModule ||
		filterMethod ||
		filterStatus ||
		dateFrom ||
		dateTo;

	function clearFilters() {
		setSearch("");
		setFilterModule("");
		setFilterMethod("");
		setFilterStatus("");
		setDateFrom("");
		setDateTo("");
		setPage(1);
	}

	function openDetail(id: number) {
		setSelectedId(id);
		setIsDetailOpen(true);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Log Aktivitas
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Pantau semua aksi create, update, dan delete oleh pengguna. Data
						tersimpan 7 hari.
					</p>
				</div>
				{hasFilters && (
					<div className="mt-4 sm:ml-4 sm:mt-0">
						<Button
							variant="secondary"
							onClick={clearFilters}
							className="flex items-center gap-2"
						>
							<X className="h-4 w-4" />
							Reset Filter
						</Button>
					</div>
				)}
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex flex-col sm:flex-row gap-3 flex-wrap">
					{/* Search */}
					<div className="relative flex-1 min-w-[200px] max-w-sm">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search className="h-4 w-4 text-gray-400" />
						</div>
						<input
							type="text"
							className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Cari path, error, atau user..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
						/>
					</div>

					{/* Module */}
					<select
						value={filterModule}
						onChange={(e) => {
							setFilterModule(e.target.value);
							setPage(1);
						}}
						className="block rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						{MODULE_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>

					{/* Method */}
					<select
						value={filterMethod}
						onChange={(e) => {
							setFilterMethod(e.target.value);
							setPage(1);
						}}
						className="block rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						{METHOD_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>

					{/* Status */}
					<select
						value={filterStatus}
						onChange={(e) => {
							setFilterStatus(e.target.value);
							setPage(1);
						}}
						className="block rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						{STATUS_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>

					{/* Date From */}
					<input
						type="date"
						value={dateFrom}
						onChange={(e) => {
							setDateFrom(e.target.value);
							setPage(1);
						}}
						className="block rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>

					{/* Date To */}
					<input
						type="date"
						value={dateTo}
						onChange={(e) => {
							setDateTo(e.target.value);
							setPage(1);
						}}
						className="block rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</div>

			{/* Content */}
			{isLoading ? (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse" />
			) : isError ? (
				<div className="bg-red-50 p-4 rounded-md text-red-800">
					Gagal memuat data log aktivitas.
				</div>
			) : entries.length === 0 ? (
				<EmptyState
					title={
						hasFilters ? "Tidak ada log ditemukan" : "Belum ada log aktivitas"
					}
					description={
						hasFilters
							? "Coba ubah atau reset filter untuk melihat hasil lain."
							: "Log akan muncul setelah ada aktivitas create, update, atau delete."
					}
				/>
			) : (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
										<Clock className="inline h-3 w-3 mr-1" />
										Waktu
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
										User
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
										Method
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Path
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
										Modul
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
										Status
									</th>
									<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
										Latency
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
										Detail
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{entries.map((entry) => {
									const st = statusBadge(entry.status_code);
									return (
										<tr
											key={entry.id}
											className="hover:bg-gray-50 cursor-pointer"
											onClick={() => openDetail(entry.id)}
										>
											<td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
												{formatTime(entry.created_at)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{entry.user_name || `User #${entry.user_id}`}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												<Badge variant="secondary">
													{METHOD_LABELS[entry.method] || entry.method}
												</Badge>
											</td>
											<td className="px-4 py-3 text-sm text-gray-700 font-mono text-xs">
												{truncatePath(entry.path)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{entry.module ? (
													<Badge
														variant={MODULE_BADGE[entry.module] || "secondary"}
													>
														{MODULE_LABELS[entry.module] || entry.module}
													</Badge>
												) : (
													<span className="text-xs text-gray-400">—</span>
												)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-center">
												<Badge variant={st.variant}>{st.label}</Badge>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-right text-xs text-gray-500">
												{entry.latency_ms}ms
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-center">
												<button
													className="p-1 text-gray-400 hover:text-indigo-600 rounded"
													onClick={(e) => {
														e.stopPropagation();
														openDetail(entry.id);
													}}
												>
													<Eye className="h-4 w-4" />
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<Pagination
						page={meta.page}
						limit={meta.limit}
						total={meta.total}
						onPageChange={setPage}
					/>
				</div>
			)}

			{/* Detail SlideOver */}
			<SlideOver
				isOpen={isDetailOpen}
				onClose={() => setIsDetailOpen(false)}
				title="Detail Log"
			>
				{detailLoading ? (
					<div className="animate-pulse space-y-4">
						<div className="h-4 bg-gray-200 rounded w-3/4" />
						<div className="h-4 bg-gray-200 rounded w-1/2" />
						<div className="h-32 bg-gray-200 rounded" />
					</div>
				) : detail ? (
					<div className="space-y-5">
						{/* Meta */}
						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<span className="text-gray-500">Waktu</span>
								<p className="font-medium">{formatTime(detail.created_at)}</p>
							</div>
							<div>
								<span className="text-gray-500">User</span>
								<p className="font-medium">
									{detail.user_name || `User #${detail.user_id}`}
								</p>
							</div>
							<div>
								<span className="text-gray-500">Method</span>
								<p>
									<Badge variant="secondary">{detail.method}</Badge>
								</p>
							</div>
							<div>
								<span className="text-gray-500">Aksi</span>
								<p>
									<Badge variant="primary">{detail.action}</Badge>
								</p>
							</div>
							<div>
								<span className="text-gray-500">Modul</span>
								<p>
									{detail.module ? (
										<Badge variant={MODULE_BADGE[detail.module] || "secondary"}>
											{MODULE_LABELS[detail.module] || detail.module}
										</Badge>
									) : (
										"—"
									)}
								</p>
							</div>
							<div>
								<span className="text-gray-500">Status</span>
								<p>
									<Badge variant={statusBadge(detail.status_code).variant}>
										{detail.status_code}
									</Badge>
								</p>
							</div>
							<div>
								<span className="text-gray-500">Latency</span>
								<p className="font-medium">{detail.latency_ms} ms</p>
							</div>
							<div>
								<span className="text-gray-500">IP Address</span>
								<p className="font-mono text-xs">{detail.ip_address}</p>
							</div>
						</div>

						{/* Path */}
						<div>
							<span className="text-sm text-gray-500">Path</span>
							<p className="font-mono text-xs text-gray-800 break-all bg-gray-50 p-2 rounded mt-1">
								{detail.path}
							</p>
						</div>

						{/* Request Body */}
						{detail.request_body && (
							<div>
								<span className="text-sm text-gray-500">Request Body</span>
								<pre className="mt-1 text-xs text-gray-800 bg-gray-50 p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap break-all">
									{formatJson(detail.request_body)}
								</pre>
							</div>
						)}

						{/* Error Message */}
						{detail.error_message && (
							<div>
								<span className="text-sm text-gray-500">Error</span>
								<div className="mt-1 text-sm text-red-700 bg-red-50 p-3 rounded whitespace-pre-wrap break-all">
									{detail.error_message}
								</div>
							</div>
						)}
					</div>
				) : null}
			</SlideOver>
		</div>
	);
}

function formatJson(raw: string): string {
	try {
		return JSON.stringify(JSON.parse(raw), null, 2);
	} catch {
		return raw;
	}
}
