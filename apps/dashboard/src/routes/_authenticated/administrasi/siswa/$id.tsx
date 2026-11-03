import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import {
	AlertTriangle,
	Bus,
	ChevronRight,
	GraduationCap,
	Percent,
	Trash2,
	Trophy,
	User,
	UserCircle,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { useGetV1StudentsId } from "#/api/endpoints/students/students";
import { Badge, Button, ConfirmDialog, useToast } from "#/components/ui";
import {
	useDeleteStudentCascade,
	useStudentDeletePreview,
} from "#/features/administrasi/student-delete";
import { useAccess } from "#/features/auth/access";
import { formatCurrency } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/administrasi/siswa/$id")({
	component: StudentLayout,
	// Filter daftar dibawa agar breadcrumb/tab tidak mereset pencarian.
	validateSearch: (
		params: Record<string, unknown>,
	): {
		page?: number;
		search?: string;
		status?: string;
		class_group_id?: string | number;
	} => {
		const parseClassGroupId = (v: unknown) => {
			if (typeof v === "number") return v;
			if (typeof v === "string" && v === "__none__") return "__none__";
			if (typeof v === "string" && v !== "") return Number(v);
			return undefined;
		};
		return {
			page: (typeof params.page === "number"
				? params.page
				: typeof params.page === "string"
					? Number.parseInt(params.page, 10) || 1
					: undefined) as number | undefined,
			search: typeof params.search === "string" ? params.search : undefined,
			status: typeof params.status === "string" ? params.status : undefined,
			class_group_id: parseClassGroupId(params.class_group_id),
		};
	},
});

function StudentLayout() {
	const { id } = Route.useParams();
	const search = Route.useSearch();
	const studentId = Number(id);
	// Active path to determine which tab is active (useRouterState is reactive, unlike useRouter)
	const currentPath = useRouterState({ select: (s) => s.location.pathname });
	const navigate = useNavigate();
	const { addToast } = useToast();
	const { hasModule } = useAccess();
	const canDelete = hasModule("administrasi");

	const { data: response, isLoading, isError } = useGetV1StudentsId(studentId);
	const student = (response?.data as any)?.data;

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteConfirmName, setDeleteConfirmName] = useState("");
	const [deleteForce, setDeleteForce] = useState(false);
	const deletePreview = useStudentDeletePreview(studentId, deleteOpen);
	const deleteStudent = useDeleteStudentCascade();

	if (isLoading) {
		return (
			<div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64 max-w-5xl mx-auto mt-6"></div>
		);
	}

	if (isError || !student) {
		return (
			<div className="p-8 bg-red-50 text-red-800 rounded-xl max-w-5xl mx-auto mt-6">
				Data siswa tidak ditemukan.
			</div>
		);
	}

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

	const handleDelete = () => {
		const preview = deletePreview.data;
		if (!preview) return;

		if (
			deleteConfirmName.trim().toLowerCase() !==
			student.full_name.trim().toLowerCase()
		) {
			addToast({
				variant: "warning",
				title: "Konfirmasi belum cocok",
				message: `Ketik "${student.full_name}" untuk melanjutkan.`,
			});
			return;
		}
		if (preview.requires_force && !deleteForce) {
			addToast({
				variant: "warning",
				title: "Konfirmasi data finansial",
				message: "Centang pernyataan bahwa data keuangan ikut terhapus.",
			});
			return;
		}

		deleteStudent.mutate(
			{ id: studentId, confirmName: deleteConfirmName, force: deleteForce },
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `Siswa ${student.full_name} beserta data terhubung dihapus.`,
					});
					setDeleteOpen(false);
					navigate({ to: "/administrasi/siswa", search });
				},
				onError: (err: Error) =>
					addToast({
						variant: "error",
						title: "Gagal menghapus",
						message: err.message,
					}),
			},
		);
	};

	const tabs = [
		{
			name: "Profil",
			href: `/administrasi/siswa/${id}/profil`,
			icon: User,
			show: true,
		},
		{
			name: "Akademik",
			href: `/administrasi/siswa/${id}/akademik`,
			icon: GraduationCap,
			show: !student.is_daycare_only,
		},
		{
			name: "Ekskul",
			href: `/administrasi/siswa/${id}/ekskul`,
			icon: Trophy,
			show: true,
		},
		{
			name: "Fasilitas",
			href: `/administrasi/siswa/${id}/fasilitas`,
			icon: Bus,
			show: true,
		},
		{
			name: "Dispensasi",
			href: `/administrasi/siswa/${id}/dispensasi`,
			icon: Percent,
			show: true,
		},
		{
			name: "Keuangan",
			href: `/administrasi/siswa/${id}/keuangan`,
			icon: Wallet,
			show: true,
		},
	];

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/siswa"
							search={search}
							className="text-gray-400 hover:text-gray-500"
						>
							Administrasi
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<Link
								to="/administrasi/siswa"
								search={search}
								className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
							>
								Siswa
							</Link>
						</div>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<span
								className="ml-2 text-sm font-medium text-gray-900"
								aria-current="page"
							>
								{student.full_name}
							</span>
						</div>
					</li>
				</ol>
			</nav>

			{/* Header Profile */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="px-4 py-5 sm:px-6 sm:py-8 flex flex-col sm:flex-row items-center gap-6 border-b border-gray-200">
					{student.photo_url ? (
						<img
							className="h-24 w-24 rounded-full object-cover shadow-sm ring-4 ring-white"
							src={student.photo_url}
							alt=""
						/>
					) : (
						<UserCircle className="h-24 w-24 text-gray-300" />
					)}

					<div className="text-center sm:text-left flex-1">
						<h1 className="text-2xl font-bold text-gray-900 sm:text-3xl sm:tracking-tight mb-2">
							{student.full_name}
						</h1>
						<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
							<span className="flex items-center gap-2 justify-center sm:justify-start">
								{getStatusBadge(student.status)}
							</span>
							<span className="hidden sm:block">&bull;</span>
							<span>{student.gender === "L" ? "Laki-laki" : "Perempuan"}</span>
							{student.active_enrollment && (
								<>
									<span className="hidden sm:block">&bull;</span>
									<span>
										Rombel:{" "}
										<strong>
											{student.active_enrollment.class_group.name}
										</strong>
									</span>
								</>
							)}
							{student.is_daycare_only && (
								<>
									<span className="hidden sm:block">&bull;</span>
									<span className="text-indigo-600 font-medium">
										Siswa Daycare Saja
									</span>
								</>
							)}
						</div>
					</div>

					{canDelete && (
						<Button
							variant="danger"
							size="sm"
							onClick={() => {
								setDeleteConfirmName("");
								setDeleteForce(false);
								setDeleteOpen(true);
							}}
							className="sm:ml-auto"
						>
							<Trash2 className="h-4 w-4 mr-1" /> Hapus Siswa
						</Button>
					)}
				</div>

				{/* Tabs */}
				<div>
					<div className="sm:hidden">
						<label htmlFor="tabs" className="sr-only">
							Select a tab
						</label>
						<select
							id="tabs"
							name="tabs"
							className="block w-full rounded-md border-none focus:ring-0 focus:ring-indigo-500 py-3 pl-3 pr-10 text-base sm:text-sm"
							value={currentPath}
							onChange={(e) => navigate({ to: e.target.value, search })}
						>
							{tabs
								.filter((t) => t.show)
								.map((tab) => (
									<option key={tab.name} value={tab.href}>
										{tab.name}
									</option>
								))}
						</select>
					</div>
					<div className="hidden sm:block">
						<nav className="flex divide-x divide-gray-200" aria-label="Tabs">
							{tabs
								.filter((t) => t.show)
								.map((tab) => {
									const normalizedPath = currentPath.replace(/\/+$/, "");
									const normalizedHref = tab.href.replace(/\/+$/, "");
									const isActive =
										normalizedPath === normalizedHref ||
										(normalizedPath === `/administrasi/siswa/${id}` &&
											tab.name === "Profil");
									return (
										<Link
											key={tab.name}
											to={tab.href}
											search={search}
											className={`
                      group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10
                      ${isActive ? "text-indigo-700 bg-indigo-50" : "text-gray-500 hover:text-gray-700 bg-white"}
                    `}
											aria-current={isActive ? "page" : undefined}
										>
											<div className="flex items-center justify-center gap-2">
												<tab.icon
													className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"}`}
												/>
												<span>{tab.name}</span>
											</div>
											<span
												aria-hidden="true"
												className={`absolute inset-x-0 bottom-0 h-0.5 ${isActive ? "bg-indigo-500" : "bg-transparent"}`}
											/>
										</Link>
									);
								})}
						</nav>
					</div>
				</div>
			</div>

			<ConfirmDialog
				open={deleteOpen}
				title={`Hapus siswa ${student.full_name}?`}
				description="Seluruh data terhubung akan ikut dihapus (soft-delete). Transaksi kas/berangkas dihapus permanen."
				confirmLabel={deleteStudent.isPending ? "Menghapus..." : "Hapus Siswa"}
				variant="danger"
				onConfirm={handleDelete}
				onCancel={() => {
					if (deleteStudent.isPending) return;
					setDeleteOpen(false);
					setDeleteConfirmName("");
					setDeleteForce(false);
				}}
			>
				{deletePreview.isLoading ? (
					<p>Memuat data terhubung...</p>
				) : deletePreview.isError || !deletePreview.data ? (
					<p className="text-red-600">
						Gagal memuat pratinjau. Tutup lalu coba lagi.
					</p>
				) : (
					<div className="space-y-3 text-left">
						<div className="max-h-52 overflow-auto rounded-md border border-gray-200">
							<table className="min-w-full text-xs">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-2 py-1.5 text-left font-semibold text-gray-600">
											Data
										</th>
										<th className="px-2 py-1.5 text-right font-semibold text-gray-600">
											Jumlah
										</th>
										<th className="px-2 py-1.5 text-right font-semibold text-gray-600">
											Nominal
										</th>
									</tr>
								</thead>
								<tbody>
									{deletePreview.data.items.map((item) => (
										<tr key={item.key} className="border-t border-gray-100">
											<td className="px-2 py-1.5">
												<div className="font-medium text-gray-800">
													{item.label}
												</div>
												{item.note && (
													<div className="text-[11px] text-gray-500">
														{item.note}
													</div>
												)}
											</td>
											<td className="px-2 py-1.5 text-right tabular-nums text-gray-700">
												{item.count}
											</td>
											<td className="px-2 py-1.5 text-right tabular-nums text-gray-700">
												{item.amount ? formatCurrency(item.amount) : "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
							{deletePreview.data.items.length === 0 && (
								<p className="px-2 py-3 text-xs text-gray-500">
									Tidak ada data terhubung.
								</p>
							)}
						</div>

						{deletePreview.data.requires_force && (
							<div className="rounded-md bg-red-50 p-3 text-red-800">
								<div className="flex gap-2">
									<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
									<div>
										<p className="font-medium">Data finansial ikut terhapus</p>
										<p className="mt-1 text-xs">
											Pembayaran{" "}
											{formatCurrency(
												deletePreview.data.financial.total_payments,
											)}{" "}
											· Tagihan{" "}
											{formatCurrency(
												deletePreview.data.financial.total_invoices,
											)}{" "}
											(sisa{" "}
											{formatCurrency(deletePreview.data.financial.outstanding)}
											) · Tabungan{" "}
											{formatCurrency(
												deletePreview.data.financial.savings_balance,
											)}{" "}
											· Koperasi{" "}
											{formatCurrency(
												deletePreview.data.financial.koperasi_sales,
											)}
										</p>
									</div>
								</div>
								<label className="mt-2 flex items-center gap-2 text-xs font-medium">
									<input
										type="checkbox"
										checked={deleteForce}
										onChange={(e) => setDeleteForce(e.target.checked)}
									/>
									Saya mengerti data keuangan ikut terhapus
								</label>
							</div>
						)}

						<div>
							<label
								htmlFor="delete-student-confirm"
								className="block text-sm font-medium text-gray-700"
							>
								Ketik <strong>{student.full_name}</strong> untuk konfirmasi
							</label>
							<input
								id="delete-student-confirm"
								type="text"
								value={deleteConfirmName}
								onChange={(e) => setDeleteConfirmName(e.target.value)}
								autoComplete="off"
								className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							/>
						</div>
					</div>
				)}
			</ConfirmDialog>

			{/* Tab Content */}
			<div className="mt-6">
				<Outlet />
			</div>
		</div>
	);
}
