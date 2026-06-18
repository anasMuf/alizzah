import { createFileRoute, Link } from "@tanstack/react-router";
import { Edit, FileDown, Plus, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	useToast,
} from "#/components/ui";
import { AnggotaForm } from "../../../../features/koperasi/anggota/AnggotaForm";
import {
	type Member,
	useDeleteMember,
	useMembers,
} from "../../../../features/koperasi/anggota/api";
import { BulkRegisterDialog } from "../../../../features/koperasi/anggota/BulkRegisterDialog";

export const Route = createFileRoute("/_authenticated/koperasi/anggota/")({
	component: AnggotaPage,
});

const TYPE_LABEL: Record<string, string> = {
	pegawai: "Pegawai",
	pengurus_yayasan: "Pengurus Yayasan",
	pihak_luar: "Pihak Luar",
};

function AnggotaPage() {
	const { addToast } = useToast();
	const [search, setSearch] = useState("");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isBulkOpen, setIsBulkOpen] = useState(false);
	const [selected, setSelected] = useState<Member | null>(null);
	const [toDelete, setToDelete] = useState<Member | null>(null);

	const { data: members = [], isLoading, isError } = useMembers();
	const deleteM = useDeleteMember();

	const filtered = useMemo(
		() =>
			members.filter((m) =>
				m.full_name.toLowerCase().includes(search.toLowerCase()),
			),
		[members, search],
	);

	const openCreate = () => {
		setSelected(null);
		setIsFormOpen(true);
	};
	const openEdit = (m: Member) => {
		setSelected(m);
		setIsFormOpen(true);
	};

	const handleDelete = () => {
		if (!toDelete) return;
		deleteM.mutate(toDelete.id, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Anggota dihapus.",
				});
				setToDelete(null);
			},
			onError: (e: Error) => {
				addToast({ variant: "error", title: "Gagal", message: e.message });
				setToDelete(null);
			},
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Anggota Koperasi</h1>
					<p className="text-sm text-gray-500">
						Staf sekolah, pengurus yayasan, & pihak lain peserta simpan-pinjam.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="secondary" onClick={() => setIsBulkOpen(true)}>
						<FileDown className="h-4 w-4 mr-1.5" /> Bulk Register
					</Button>
					<Button variant="primary" onClick={openCreate}>
						<Plus className="h-4 w-4 mr-1.5" /> Tambah Anggota
					</Button>
				</div>
			</div>

			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input
					type="text"
					placeholder="Cari nama anggota..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
				/>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat data anggota...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat data anggota.</p>
			) : filtered.length === 0 ? (
				<EmptyState
					icon={<Users className="h-10 w-10 text-gray-400" />}
					title="Belum ada anggota"
					description="Tambahkan anggota koperasi untuk mulai mencatat simpan-pinjam."
				/>
			) : (
				<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Nama
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Tipe
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Telepon
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Status
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filtered.map((m) => (
								<tr key={m.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm font-medium text-gray-900">
										<Link
											to="/koperasi/anggota/$id"
											params={{ id: m.id.toString() }}
											className="text-indigo-600 hover:text-indigo-900 hover:underline"
										>
											{m.full_name}
										</Link>
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">
										{TYPE_LABEL[m.member_type] ?? m.member_type}
										{m.employee_name && (
											<span className="block text-xs text-gray-400 mt-0.5">
												Pegawai: {m.employee_name}
											</span>
										)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">
										{m.phone || "-"}
									</td>
									<td className="px-4 py-3">
										<Badge variant={m.is_active ? "success" : "secondary"}>
											{m.is_active ? "Aktif" : "Nonaktif"}
										</Badge>
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-2">
											<button
												type="button"
												onClick={() => openEdit(m)}
												className="text-gray-400 hover:text-indigo-600"
												title="Edit"
											>
												<Edit className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => setToDelete(m)}
												className="text-gray-400 hover:text-red-600"
												title="Hapus"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<AnggotaForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				initialData={selected}
			/>

			<BulkRegisterDialog
				isOpen={isBulkOpen}
				onClose={() => setIsBulkOpen(false)}
			/>

			<ConfirmDialog
				open={!!toDelete}
				onCancel={() => setToDelete(null)}
				onConfirm={handleDelete}
				title="Hapus Anggota"
				confirmLabel="Hapus"
				variant="danger"
			>
				<p>
					Yakin menghapus anggota <strong>{toDelete?.full_name}</strong>?
				</p>
			</ConfirmDialog>
		</div>
	);
}
