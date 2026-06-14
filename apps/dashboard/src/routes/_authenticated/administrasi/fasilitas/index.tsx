import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bus, Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	type CreateFacilityRequest,
	facilityKeys,
	useCreateFacility,
	useDeleteFacility,
	useGetFacilities,
	useUpdateFacility,
} from "#/api/endpoints/facilities/facilities";
import {
	Button,
	ConfirmDialog,
	EmptyState,
	FormField,
	SlideOver,
	useToast,
} from "#/components/ui";

export const Route = createFileRoute("/_authenticated/administrasi/fasilitas/")(
	{
		component: FasilitasPage,
	},
);

function FasilitasPage() {
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const { data: resp, isLoading } = useGetFacilities();
	const facilities: any[] = ((resp as any)?.data as any)?.data || [];

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<any>(null);
	const [deletingItem, setDeletingItem] = useState<any>(null);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: facilityKeys.all });

	const createMutation = useCreateFacility({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Fasilitas berhasil ditambahkan.",
				});
				invalidate();
				closeForm();
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const updateMutation = useUpdateFacility({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Fasilitas berhasil diperbarui.",
				});
				invalidate();
				closeForm();
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const deleteMutation = useDeleteFacility({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Fasilitas berhasil dihapus.",
				});
				invalidate();
				setDeletingItem(null);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const openCreate = () => {
		setName("");
		setDescription("");
		setEditingItem(null);
		setIsFormOpen(true);
	};
	const openEdit = (f: any) => {
		setName(f.name);
		setDescription(f.description || "");
		setEditingItem(f);
		setIsFormOpen(true);
	};
	const closeForm = () => {
		setIsFormOpen(false);
		setEditingItem(null);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const data: CreateFacilityRequest = {
			name,
			description: description || undefined,
		};
		if (editingItem) {
			updateMutation.mutate({ id: editingItem.id, data });
		} else {
			createMutation.mutate(data as any);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900">
						Fasilitas
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Kelola fasilitas opsional seperti antar jemput.
					</p>
				</div>
				<Button variant="primary" onClick={openCreate}>
					<Plus className="w-4 h-4 mr-2" /> Tambah Fasilitas
				</Button>
			</div>

			{isLoading ? (
				<div className="animate-pulse space-y-3">
					{[1, 2].map((n) => (
						<div key={n} className="h-16 bg-gray-200 rounded-lg" />
					))}
				</div>
			) : facilities.length === 0 ? (
				<EmptyState
					title="Belum ada fasilitas"
					description="Tambahkan fasilitas seperti Antar Jemput, Makan Siang, dll."
				/>
			) : (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-300">
						<thead className="bg-gray-50">
							<tr>
								<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
									Nama
								</th>
								<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
									Deskripsi
								</th>
								<th className="px-3 py-3 text-center text-sm font-semibold text-gray-900">
									Status
								</th>
								<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{facilities.map((f: any) => (
								<tr key={f.id} className="hover:bg-gray-50">
									<td className="py-3 pl-6 pr-3 text-sm font-medium text-gray-900 flex items-center gap-2">
										<Bus className="w-4 h-4 text-indigo-500" />
										{f.name}
									</td>
									<td className="px-3 py-3 text-sm text-gray-500">
										{f.description || "-"}
									</td>
									<td className="px-3 py-3 text-sm text-center">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${f.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
										>
											{f.is_active ? "Aktif" : "Nonaktif"}
										</span>
									</td>
									<td className="px-3 py-3 text-right pr-6">
										<div className="flex gap-2 justify-end">
											<button
												type="button"
												onClick={() => openEdit(f)}
												className="text-indigo-600 hover:text-indigo-800"
											>
												<Edit2 className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => setDeletingItem(f)}
												className="text-rose-600 hover:text-rose-800"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<SlideOver
				isOpen={isFormOpen}
				onClose={closeForm}
				title={editingItem ? "Edit Fasilitas" : "Tambah Fasilitas"}
			>
				<form onSubmit={handleSubmit} className="flex h-full flex-col bg-white">
					<div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
						<FormField
							id="name"
							label="Nama Fasilitas"
							value={name}
							onChange={(e: any) => setName(e.target.value)}
							required
							placeholder="Contoh: Antar Jemput"
						/>
						<div>
							<label
								htmlFor="desc"
								className="block text-sm font-medium leading-6 text-gray-900 mb-2"
							>
								Deskripsi
							</label>
							<textarea
								id="desc"
								rows={3}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								placeholder="Opsional"
							/>
						</div>
					</div>
					<div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
						<Button type="button" variant="secondary" onClick={closeForm}>
							Batal
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={
								!name.trim() ||
								createMutation.isPending ||
								updateMutation.isPending
							}
						>
							{editingItem ? "Simpan" : "Tambah"}
						</Button>
					</div>
				</form>
			</SlideOver>

			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
				title="Hapus Fasilitas"
				variant="danger"
				confirmLabel="Hapus"
			>
				Apakah Anda yakin ingin menghapus fasilitas{" "}
				<strong>{deletingItem?.name}</strong>?
			</ConfirmDialog>
		</div>
	);
}
